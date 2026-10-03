import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  menuDraftSchema,
  productResultSchema,
  type MenuDraft,
  type MenuPatch,
  type ProductResult,
} from "@vegan-tools/domain";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseCredentialsFromEnvironment } from "./environment.js";
import { getSupabaseClient } from "./supabase.js";

export interface Repository {
  getProduct(gtin: string): Promise<ProductResult | undefined>;
  saveProduct(product: ProductResult): Promise<void>;
  createMenu(): Promise<MenuDraft>;
  getMenu(id: string, token: string): Promise<MenuDraft | undefined>;
  updateMenu(id: string, token: string, patch: MenuPatch): Promise<MenuDraft | undefined>;
  setMenu(menu: MenuDraft): Promise<void>;
  publishMenu(id: string, token: string): Promise<MenuDraft | undefined>;
  getPublicMenu(slug: string): Promise<MenuDraft | undefined>;
}

export class MemoryRepository implements Repository {
  private products = new Map<string, ProductResult>();
  private menus = new Map<string, MenuDraft>();

  async getProduct(gtin: string) {
    return this.products.get(gtin);
  }

  async saveProduct(product: ProductResult) {
    this.products.set(product.gtin, product);
  }

  async createMenu() {
    const now = new Date();
    const menu: MenuDraft = {
      id: randomUUID(),
      editToken: randomBytes(24).toString("base64url"),
      status: "processing",
      restaurantName: "",
      sourceLabel: "Uploaded menu",
      sourceFiles: [],
      sourceCapturedAt: now.toISOString(),
      originalLanguage: "unknown",
      sections: [],
      createdAt: now.toISOString(),
      originalDeleteAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    this.menus.set(menu.id, menu);
    return menu;
  }

  async getMenu(id: string, token: string) {
    const menu = this.menus.get(id);
    return menu?.editToken === token ? menu : undefined;
  }

  async updateMenu(id: string, token: string, patch: MenuPatch) {
    const current = this.menus.get(id);
    if (!current || current.editToken !== token || current.status === "published") return undefined;
    const next = { ...current, ...patch };
    this.menus.set(id, next);
    return next;
  }

  async setMenu(menu: MenuDraft) {
    this.menus.set(menu.id, menu);
  }

  async publishMenu(id: string, token: string) {
    const current = this.menus.get(id);
    if (!current || current.editToken !== token || current.status !== "ready") return undefined;
    const published: MenuDraft = {
      ...current,
      status: "published",
      publicSlug: `${slugify(current.restaurantName || "menu")}-${randomBytes(4).toString("hex")}`,
    };
    this.menus.set(id, published);
    return published;
  }

  async getPublicMenu(slug: string) {
    return [...this.menus.values()].find(
      (menu) => menu.status === "published" && menu.publicSlug === slug,
    );
  }
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

type SupabaseMenuRow = {
  id: string;
  edit_token_hash: string;
  status: MenuDraft["status"];
  public_slug: string | null;
  payload: unknown;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function withoutEditToken(menu: MenuDraft) {
  const { editToken: _private, ...payload } = menu;
  return payload;
}

function menuFromRow(row: SupabaseMenuRow, editToken = "") {
  return menuDraftSchema.parse({
    ...(row.payload as object),
    id: row.id,
    editToken,
    status: row.status,
    publicSlug: row.public_slug ?? undefined,
  });
}

export class SupabaseRepository implements Repository {
  private readonly client: SupabaseClient;

  constructor(clientOrUrl: SupabaseClient | string, secretKey?: string) {
    if (typeof clientOrUrl === "string") {
      this.client = createClient(clientOrUrl, secretKey || "", {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } else {
      this.client = clientOrUrl;
    }
  }

  private async menuRow(
    id: string,
    token: string,
  ): Promise<SupabaseMenuRow | undefined> {
    if (!token) return undefined;
    const { data, error } = await this.client
      .from("menus")
      .select("id,edit_token_hash,status,public_slug,payload")
      .eq("id", id)
      .eq("edit_token_hash", tokenHash(token))
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase menu read failed: ${error.message}`);
    }
    return (data as SupabaseMenuRow) || undefined;
  }

  private async writeMenu(menu: MenuDraft) {
    const { error } = await this.client
      .from("menus")
      .upsert({
        id: menu.id,
        edit_token_hash: tokenHash(menu.editToken),
        status: menu.status,
        public_slug: menu.publicSlug ?? null,
        restaurant_name: menu.restaurantName,
        source_label: menu.sourceLabel,
        source_captured_at: menu.sourceCapturedAt,
        original_language: menu.originalLanguage,
        service: menu.service ?? null,
        valid_on: menu.validOn ?? null,
        payload: withoutEditToken(menu),
        original_delete_at: menu.originalDeleteAt,
        created_at: menu.createdAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) {
      throw new Error(`Supabase menu write failed: ${error.message}`);
    }
  }

  async getProduct(gtin: string) {
    const { data, error } = await this.client
      .from("products")
      .select("payload")
      .eq("gtin", gtin)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase product read failed: ${error.message}`);
    }
    return data?.payload ? productResultSchema.parse(data.payload) : undefined;
  }

  async saveProduct(product: ProductResult) {
    const { error } = await this.client
      .from("products")
      .upsert({
        gtin: product.gtin,
        product_name: product.productName ?? null,
        brand: product.brand ?? null,
        current_revision: product.revision,
        payload: product,
        updated_at: new Date().toISOString(),
      }, { onConflict: "gtin" });

    if (error) {
      throw new Error(`Supabase product write failed: ${error.message}`);
    }
  }

  async createMenu() {
    const now = new Date();
    const menu: MenuDraft = {
      id: randomUUID(),
      editToken: randomBytes(24).toString("base64url"),
      status: "processing",
      restaurantName: "",
      sourceLabel: "Uploaded menu",
      sourceFiles: [],
      sourceCapturedAt: now.toISOString(),
      originalLanguage: "unknown",
      sections: [],
      createdAt: now.toISOString(),
      originalDeleteAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await this.writeMenu(menu);
    return menu;
  }

  async getMenu(id: string, token: string) {
    const row = await this.menuRow(id, token);
    return row ? menuFromRow(row, token) : undefined;
  }

  async updateMenu(id: string, token: string, patch: MenuPatch) {
    const current = await this.getMenu(id, token);
    if (!current || current.status === "published") return undefined;
    const next = { ...current, ...patch };
    await this.writeMenu(next);
    return next;
  }

  async setMenu(menu: MenuDraft) {
    await this.writeMenu(menu);
  }

  async publishMenu(id: string, token: string) {
    const current = await this.getMenu(id, token);
    if (!current || current.status !== "ready") return undefined;
    const published: MenuDraft = {
      ...current,
      status: "published",
      publicSlug: `${slugify(current.restaurantName || "menu")}-${randomBytes(4).toString("hex")}`,
    };
    await this.writeMenu(published);
    return published;
  }

  async getPublicMenu(slug: string) {
    const { data, error } = await this.client
      .from("menus")
      .select("id,edit_token_hash,status,public_slug,payload")
      .eq("public_slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase public menu read failed: ${error.message}`);
    }
    return data ? menuFromRow(data as SupabaseMenuRow) : undefined;
  }
}

export function createRepositoryFromEnvironment(): Repository {
  const client = getSupabaseClient();
  return client ? new SupabaseRepository(client) : new MemoryRepository();
}

export const repository: Repository = new MemoryRepository();

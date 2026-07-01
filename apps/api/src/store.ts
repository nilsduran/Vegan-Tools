import { randomBytes, randomUUID } from "node:crypto";
import type { MenuDraft, MenuPatch, ProductResult } from "@vegan-tools/domain";

export interface Repository {
  getProduct(gtin: string): Promise<ProductResult | undefined>;
  saveProduct(product: ProductResult): Promise<void>;
  createMenu(): Promise<MenuDraft>;
  getMenu(id: string): Promise<MenuDraft | undefined>;
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
      sourceCapturedAt: now.toISOString(),
      originalLanguage: "unknown",
      sections: [],
      createdAt: now.toISOString(),
      originalDeleteAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    this.menus.set(menu.id, menu);
    return menu;
  }

  async getMenu(id: string) {
    return this.menus.get(id);
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

// SupabaseRepository will implement the same boundary. Keeping OFF-derived rows
// separate from first-party evidence is a deliberate ODbL compliance constraint.
export const repository: Repository = new MemoryRepository();

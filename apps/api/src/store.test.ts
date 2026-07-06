import type { MenuDraft, ProductResult } from "@vegan-tools/domain";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SupabaseRepository } from "./store.js";

function fakeSupabase() {
  const menus = new Map<string, Record<string, unknown>>();
  const products = new Map<string, Record<string, unknown>>();
  const fetchMock = vi.fn(async (
    input: string | URL | Request,
    init: RequestInit = {},
  ) => {
    const url = input instanceof URL
      ? input
      : new URL(typeof input === "string" ? input : input.url);
    const table = url.pathname.split("/").at(-1);
    const method = init.method ?? "GET";

    if (method === "POST") {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      if (table === "menus") menus.set(String(body.id), body);
      if (table === "products") products.set(String(body.gtin), body);
      return new Response(null, { status: 204 });
    }

    if (table === "products") {
      const gtin = url.searchParams.get("gtin")?.replace(/^eq\./, "");
      const row = gtin ? products.get(gtin) : undefined;
      return Response.json(row ? [{ payload: row.payload }] : []);
    }

    const id = url.searchParams.get("id")?.replace(/^eq\./, "");
    const tokenHash = url.searchParams.get("edit_token_hash")?.replace(/^eq\./, "");
    const slug = url.searchParams.get("public_slug")?.replace(/^eq\./, "");
    const row = id
      ? menus.get(id)
      : [...menus.values()].find((candidate) =>
          candidate.public_slug === slug && candidate.status === "published"
        );
    const permitted = row &&
      (!tokenHash || row.edit_token_hash === tokenHash) &&
      (!slug || row.public_slug === slug);
    return Response.json(permitted ? [row] : []);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, menus, products };
}

describe("SupabaseRepository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists a complete menu lifecycle without storing the edit token", async () => {
    const database = fakeSupabase();
    const firstProcess = new SupabaseRepository(
      "https://project.supabase.co",
      "sb_secret_test",
    );
    const draft = await firstProcess.createMenu();
    const ready: MenuDraft = {
      ...draft,
      status: "ready",
      restaurantName: "Persistent Kitchen",
      sections: [],
    };
    await firstProcess.setMenu(ready);

    const stored = database.menus.get(draft.id);
    expect(stored?.payload).not.toHaveProperty("editToken");
    expect(stored?.edit_token_hash).not.toBe(draft.editToken);

    const secondProcess = new SupabaseRepository(
      "https://project.supabase.co",
      "sb_secret_test",
    );
    expect(await secondProcess.getMenu(draft.id, "wrong-token")).toBeUndefined();
    expect((await secondProcess.getMenu(draft.id, draft.editToken))?.restaurantName)
      .toBe("Persistent Kitchen");

    const published = await secondProcess.publishMenu(draft.id, draft.editToken);
    expect(published?.publicSlug).toMatch(/^persistent-kitchen-/);

    const thirdProcess = new SupabaseRepository(
      "https://project.supabase.co",
      "sb_secret_test",
    );
    const publicMenu = await thirdProcess.getPublicMenu(published!.publicSlug!);
    expect(publicMenu?.status).toBe("published");
    expect(publicMenu?.restaurantName).toBe("Persistent Kitchen");
    expect(publicMenu?.editToken).toBe("");

    const headers = database.fetchMock.mock.calls[0]?.[1]?.headers as
      | Record<string, string>
      | undefined;
    expect(headers?.apikey).toBe("sb_secret_test");
  });

  it("persists and restores the complete product result", async () => {
    fakeSupabase();
    const product: ProductResult = {
      gtin: "3017620422003",
      productName: "Test spread",
      brand: "Example",
      verdict: "vegan",
      assurance: "external",
      definitive: false,
      reason: "No conflicting ingredient found.",
      matchedIngredients: [],
      findings: [],
      classifierVersion: "test",
      traces: [],
      revision: 1,
      evidence: [],
    };
    const firstProcess = new SupabaseRepository(
      "https://project.supabase.co",
      "sb_secret_test",
    );
    await firstProcess.saveProduct(product);

    const secondProcess = new SupabaseRepository(
      "https://project.supabase.co",
      "sb_secret_test",
    );
    await expect(secondProcess.getProduct(product.gtin)).resolves.toEqual(product);
  });
});

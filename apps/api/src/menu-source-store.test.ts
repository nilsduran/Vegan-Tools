import { afterEach, describe, expect, it, vi } from "vitest";
import { SupabaseMenuSourceStore } from "./menu-source-store.js";

describe("SupabaseMenuSourceStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores originals privately and reads them through the API store", async () => {
    const objects = new Map<string, { body: Uint8Array; type: string }>();
    const fetchMock = vi.fn(async (
      input: string | URL | Request,
      init: RequestInit = {},
    ) => {
      const url = input instanceof URL
        ? input
        : new URL(typeof input === "string" ? input : input.url);
      if (init.method === "POST") {
        const body = init.body as Uint8Array;
        const headers = init.headers as Record<string, string>;
        objects.set(url.pathname, {
          body: new Uint8Array(body),
          type: headers["Content-Type"] ?? "application/octet-stream",
        });
        return Response.json({ Key: url.pathname });
      }
      const object = objects.get(url.pathname);
      return object
        ? new Response(object.body, {
            headers: { "Content-Type": object.type },
          })
        : new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const store = new SupabaseMenuSourceStore(
      "https://project.supabase.co",
      "sb_secret_test",
    );
    const [saved] = await store.save("menu-id", [{
      filename: "menu.pdf",
      mimetype: "application/pdf",
      buffer: Buffer.from("%PDF-test"),
    }]);

    expect(saved?.url).toMatch(/^\/v1\/menu-sources\/menu-id\/.+\.pdf$/);
    const storedName = saved!.url.split("/").at(-1)!;
    const restored = await store.read("menu-id", storedName);
    expect(restored?.buffer.toString()).toBe("%PDF-test");
    expect(restored?.mimeType).toBe("application/pdf");

    const uploadHeaders = fetchMock.mock.calls[0]?.[1]?.headers as
      | Record<string, string>
      | undefined;
    expect(uploadHeaders?.Authorization).toBe("Bearer sb_secret_test");
  });

  it("rejects unsafe object paths before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const store = new SupabaseMenuSourceStore(
      "https://project.supabase.co",
      "sb_secret_test",
    );

    await expect(store.read("../menu", "source.pdf")).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

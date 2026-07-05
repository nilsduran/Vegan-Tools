import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
  lookup: async () => [{ address: "93.184.216.34", family: 4 }],
}));

import { WebsiteMenuDiscoverer } from "./menu-discovery.js";

describe("website menu discovery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows a menu page and extracts its embedded PDF", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === "/") {
        return new Response(
          '<a href="/carta/">Carta</a>',
          { headers: { "Content-Type": "text/html" } },
        );
      }
      if (url.pathname === "/carta/") {
        return new Response(
          '<iframe src="/cartas/CartaGastronomiaELTRAPIO.pdf"></iframe>',
          { headers: { "Content-Type": "text/html" } },
        );
      }
      if (url.pathname === "/cartas/CartaGastronomiaELTRAPIO.pdf") {
        return new Response(
          new Uint8Array([37, 80, 68, 70]),
          { headers: { "Content-Type": "application/pdf" } },
        );
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new WebsiteMenuDiscoverer().discover(
      "https://restauranteeltrapio.com/",
    );

    expect(result.sourceUrl).toBe(
      "https://restauranteeltrapio.com/cartas/CartaGastronomiaELTRAPIO.pdf",
    );
    expect(result.upload.mimetype).toBe("application/pdf");
  });
});

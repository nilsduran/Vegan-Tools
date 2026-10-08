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

  it("extracts menu dishes embedded in JSON/script templates (e.g. SPAs or Handlebars)", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === "/la-carta") {
        return new Response(
          `<!doctype html><html><head>
          <script>
            window.handlebarOptions = {
              content: "<p><b>Primeros</b></p><p>Mejillones al vapor</p><p>Crema de calabaza</p><p>Esp\\u00e1rragos con romescu</p><p><b>Arroces</b></p><p>Paella de verduras 14\\u20ac</p><p>Paella de ceps 16\\u20ac</p><p>Arroz socorrat 15\\u20ac</p>"
            };
          </script>
          </head><body><div id="init-handlebars"></div></body></html>`,
          { headers: { "Content-Type": "text/html" } },
        );
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new WebsiteMenuDiscoverer().discover("https://elnoidalcoi.com/la-carta");
    const extractedText = result.upload.buffer.toString("utf8");

    expect(extractedText).toContain("Mejillones al vapor");
    expect(extractedText).toContain("Espárragos con romescu");
    expect(extractedText).toContain("Paella de verduras");
    expect(result.sourceUrl).toBe("https://elnoidalcoi.com/la-carta");
  });

  it("discovers links embedded in script tags from the homepage to menu pages", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === "/") {
        return new Response(
          `<!doctype html><html><head>
          <script>
            window.sw2 = {
              menu: [{ "title": "La Carta", "href": "\\/la-carta" }]
            };
          </script>
          </head><body><div id="root">Home</div></body></html>`,
          { headers: { "Content-Type": "text/html" } },
        );
      }
      if (url.pathname === "/la-carta") {
        return new Response(
          `<!doctype html><html><head>
          <script>
            window.handlebarOptions = {
              dishes: "<p><b>Platos</b></p><p>Paella de verduras 14€</p><p>Crema de verduras 8€</p><p>Tarta tatin 6€</p>"
            };
          </script>
          </head><body></body></html>`,
          { headers: { "Content-Type": "text/html" } },
        );
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new WebsiteMenuDiscoverer().discover("https://elnoidalcoi.com/");
    const extractedText = result.upload.buffer.toString("utf8");

    expect(extractedText).toContain("Paella de verduras");
    expect(result.sourceUrl).toBe("https://elnoidalcoi.com/la-carta");
  });
});

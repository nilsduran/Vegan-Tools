/**
 * @file scan.ts
 * @description Universal scanner routes: what a photo shows, what an unknown scanned link
 * is, and whether a cosmetics brand tests on animals. See universal-analyzer.ts.
 */

import type { FastifyInstance } from "fastify";
import { classifyScannedCode, type UniversalScanResult } from "@vegan-tools/domain";
import { downloadPublicUrl, extractVisibleText } from "../menu-discovery.js";
import type { ScanLanguage, UniversalAnalyzer } from "../universal-analyzer.js";

export interface ScanRoutesOptions {
  analyzer: UniversalAnalyzer;
  /** Downloads a public page (SSRF-protected). Overridable in tests. */
  download?: typeof downloadPublicUrl;
}

function languageOf(value: unknown): ScanLanguage {
  return value === "ca" ? "ca" : "en";
}

function unavailable(error: unknown, fallback: string, options: { showMessage?: boolean } = {}) {
  const message = error instanceof Error ? error.message : "";
  // A provider error (raw JSON, overload, quota) means nothing to a person.
  if (/^\s*[{[]|429|503|high demand|resource_exhausted|unavailable|overload/i.test(message)) {
    return { code: "SCAN_UNAVAILABLE", message: "Automatic recognition is busy right now. Try again in a minute." };
  }
  return { code: "SCAN_UNAVAILABLE", message: (options.showMessage !== false && message) || fallback };
}

export function pageTitle(html: string): string {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim().slice(0, 160) ?? "";
}

/** Title, description and visible text of an HTML page, for the model. */
export function pageSummary(html: string): string {
  const title = pageTitle(html);
  const description =
    html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "";
  return [title && `Title: ${title}`, description && `Description: ${description}`, extractVisibleText(html)]
    .filter(Boolean)
    .join("\n")
    .slice(0, 8_000);
}

/** The words of a product address ("/p/merino-wool-jumper/R-123" → "merino wool jumper"). */
export function addressWords(url: string): string {
  const { hostname, pathname } = new URL(url);
  const words = decodeURIComponent(pathname)
    .split(/[/\-_.+]+/)
    .filter((word) => /^\p{L}{2,}$/u.test(word) && !/^(?:es|en|ca|fr|de|it|p|dp|gp|product|products|producto|supermercado|shop|tienda|html?|www)$/i.test(word));
  return words.length >= 2 ? `${hostname.replace(/^www\./, "")}: ${words.join(" ")}` : "";
}

/**
 * A name can show animal use ("merino wool", "milk chocolate") but never prove
 * its absence: from the address alone, a positive answer becomes "unknown".
 */
export function judgedFromAddressOnly(result: UniversalScanResult, language: "ca" | "en"): UniversalScanResult {
  if (result.verdict !== "vegan" && result.verdict !== "probably_vegan") return result;
  return {
    ...result,
    verdict: "unknown",
    reason: language === "ca"
      ? "La pàgina no s'ha pogut obrir i el nom sol no basta per saber si és vegà. Comprova'n els ingredients o materials."
      : "The page could not be opened and the name alone is not enough to know whether it is vegan. Check its ingredients or materials.",
    alternatives: [],
  };
}

export async function scanRoutes(app: FastifyInstance, options: ScanRoutesOptions) {
  const { analyzer } = options;
  const download = options.download ?? downloadPublicUrl;

  app.post<{ Querystring: { language?: string } }>(
    "/v1/scan/photo",
    { config: { rateLimit: { max: 15, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const upload = await request.file();
      if (!upload || !upload.mimetype.startsWith("image/")) {
        return reply.code(400).send({ code: "IMAGE_REQUIRED", message: "Take or choose a photo." });
      }
      try {
        return await analyzer.analyzeImage(
          { mimetype: upload.mimetype, buffer: await upload.toBuffer() },
          languageOf(request.query.language),
        );
      } catch (error) {
        request.log.warn({ err: error }, "Photo scan failed");
        return reply.code(503).send(unavailable(error, "The photo could not be recognised."));
      }
    },
  );

  app.post<{ Body: { url?: string; language?: string } }>(
    "/v1/scan/url",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const scanned = classifyScannedCode(request.body?.url ?? "");
      if (scanned.kind !== "url" && scanned.kind !== "menu_url") {
        return reply.code(400).send({ code: "URL_REQUIRED", message: "A public web address is required." });
      }
      const language = languageOf(request.body?.language);
      let page: Awaited<ReturnType<typeof download>>;
      try {
        page = await download(new URL(scanned.url));
      } catch (error) {
        // Shops often refuse automated downloads (403, bot walls, timeouts).
        // The address usually names the product, so a web search can still
        // identify it, citing the pages it used.
        request.log.info({ err: error }, "Link could not be downloaded; searching the web instead");
        // Both at once, so a busy provider does not add their waits up: the
        // cited search wins; the address words are the fallback.
        const words = addressWords(scanned.url);
        const fromAddress = words
          ? analyzer
              .analyzeText({ text: words, url: scanned.url, hint: "Only the web address is known: the page could not be opened." }, language)
              .then((result) => judgedFromAddressOnly(result, language))
          : undefined;
        fromAddress?.catch(() => {});
        try {
          return await analyzer.researchLink(scanned.url, language);
        } catch (searchError) {
          request.log.warn({ err: searchError }, "Link research failed; judging the address words");
          if (!fromAddress) return reply.code(503).send(unavailable(searchError, "This link could not be checked.", { showMessage: false }));
          try {
            return await fromAddress;
          } catch (textError) {
            return reply.code(503).send(unavailable(textError, "This link could not be checked.", { showMessage: false }));
          }
        }
      }
      try {
        if (page.mimetype === "application/pdf") {
          // A PDF behind a QR code on a table is, in practice, a menu.
          const menu: UniversalScanResult = {
            subject: "menu",
            title: new URL(scanned.url).hostname,
            verdict: "unknown",
            reason: "",
            concerns: [],
            alternatives: [],
            findings: [],
            traces: [],
            assurance: "unverified",
            menuUrl: scanned.url,
            sources: [],
          };
          return menu;
        }
        if (!page.mimetype.includes("html")) {
          return reply.code(422).send({ code: "UNSUPPORTED_PAGE", message: "This link does not open a web page." });
        }
        const html = page.buffer.toString("utf8");
        return await analyzer.analyzeText(
          { text: pageSummary(html), url: page.url.toString(), title: pageTitle(html) },
          language,
        );
      } catch (error) {
        request.log.warn({ err: error }, "Link scan failed");
        return reply.code(503).send(unavailable(error, "This link could not be checked."));
      }
    },
  );

  app.get<{ Querystring: { name?: string; language?: string } }>(
    "/v1/brands/cruelty-free",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const name = request.query.name?.split(",")[0]?.trim().slice(0, 80);
      if (!name) return reply.code(400).send({ code: "BRAND_REQUIRED", message: "A brand name is required." });
      try {
        return await analyzer.findBrandEthics(name, languageOf(request.query.language));
      } catch (error) {
        request.log.warn({ err: error }, "Brand lookup failed");
        return reply.code(503).send(unavailable(error, "The brand could not be checked."));
      }
    },
  );
}

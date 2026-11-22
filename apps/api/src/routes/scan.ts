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

function unavailable(error: unknown, fallback: string) {
  return {
    code: "SCAN_UNAVAILABLE",
    message: error instanceof Error ? error.message : fallback,
  };
}

/** Title, description and visible text of an HTML page, for the model. */
export function pageSummary(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const description =
    html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "";
  return [title && `Title: ${title}`, description && `Description: ${description}`, extractVisibleText(html)]
    .filter(Boolean)
    .join("\n")
    .slice(0, 8_000);
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
        request.log.warn({ error }, "Photo scan failed");
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
      try {
        const page = await download(new URL(scanned.url));
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
        return await analyzer.analyzeText(
          { text: pageSummary(page.buffer.toString("utf8")), url: page.url.toString() },
          languageOf(request.body?.language),
        );
      } catch (error) {
        request.log.warn({ error }, "Link scan failed");
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
        request.log.warn({ error }, "Brand lookup failed");
        return reply.code(503).send(unavailable(error, "The brand could not be checked."));
      }
    },
  );
}

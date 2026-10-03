/**
 * @file menu-discovery.ts
 * @description Automated menu crawler and asset fetcher for restaurant websites.
 * Crawls homepage links for PDF/HTML menus with built-in SSRF protection (DNS resolution validation,
 * private IP filtering) and size limits.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent } from "undici";

export const safeMenuAgent = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      const cb = (typeof options === "function" ? options : callback) as (
        err: NodeJS.ErrnoException | Error | null,
        address?: unknown,
        family?: number,
      ) => void;
      const opts = (typeof options === "object" && options !== null ? options : {}) as {
        all?: boolean;
      };
      lookup(hostname, { all: true })
        .then((addresses) => {
          const valid = addresses.filter((entry) => !isPrivateAddress(entry.address));
          if (valid.length === 0) {
            cb(new Error("The restaurant website does not resolve to a public address."), "", 4);
          } else if (opts.all) {
            cb(null, valid, 4);
          } else {
            const first = valid[0]!;
            cb(null, first.address, first.family);
          }
        })
        .catch((err) => {
          cb(err as Error, "", 4);
        });
    },
  },
});

export interface DiscoveredMenu {
  upload: {
    filename: string;
    mimetype: string;
    buffer: Buffer;
  };
  sourceUrl: string;
  openingHours?: string;
}

export interface MenuDiscoverer {
  discover(websiteUrl: string): Promise<DiscoveredMenu>;
}

export class WebsiteMenuDiscoverer implements MenuDiscoverer {
  async discover(websiteUrl: string): Promise<DiscoveredMenu> {
    const homepage = await downloadPublicUrl(new URL(websiteUrl));
    if (homepage.mimetype === "application/pdf") {
      return pdfUpload(homepage.url, homepage.buffer);
    }
    if (!homepage.mimetype.includes("html")) {
      throw new Error("The restaurant website did not return an HTML page or PDF menu.");
    }

    const html = homepage.buffer.toString("utf8");
    const pages: DownloadedPage[] = [];
    const discoveredLinks = extractMenuLinks(html, homepage.url);
    const prospectivePaths = [
      "/menu",
      "/carta",
      "/la-carta",
      "/menus",
      "/la-carte",
      "/plats",
      "/platos",
      "/food",
      "/food-menu",
      "/our-menu",
      "/menjar",
    ];
    for (const path of prospectivePaths) {
      try {
        const prospectiveUrl = new URL(path, homepage.url);
        if (!discoveredLinks.some((l) => l.pathname.toLowerCase() === prospectiveUrl.pathname.toLowerCase())) {
          discoveredLinks.push(prospectiveUrl);
        }
      } catch {}
    }

    const queue = discoveredLinks
      .slice(0, 12)
      .map((url) => ({ url, depth: 1 }));
    const visited = new Set([homepage.url.toString()]);
    while (queue.length > 0 && visited.size <= 16) {
      const candidate = queue.shift();
      if (!candidate || visited.has(candidate.url.toString())) continue;
      visited.add(candidate.url.toString());
      try {
        const page = await downloadPublicUrl(candidate.url);
        if (page.mimetype === "application/pdf") return pdfUpload(page.url, page.buffer);
        if (page.mimetype.includes("html")) {
          pages.push(page);
          if (candidate.depth < 2) {
            const nestedLinks = extractMenuLinks(
              page.buffer.toString("utf8"),
              page.url,
            ).slice(0, 8);
            queue.push(...nestedLinks.map((url) => ({
              url,
              depth: candidate.depth + 1,
            })));
          }
        }
      } catch {
        // One broken menu link should not stop the other candidates.
      }
    }

    const htmlPages = [homepage, ...pages];

    let discoveredHours: string | undefined;
    for (const p of htmlPages) {
      const hours = extractOpeningHoursFromHtml(p.buffer.toString("utf8"));
      if (hours) {
        discoveredHours = hours;
        break;
      }
    }

    const best = htmlPages
      .map((page) => ({
        page,
        text: extractVisibleText(page.buffer.toString("utf8")),
      }))
      .sort((left, right) => scoreMenuText(right.text) - scoreMenuText(left.text))[0];
    if (!best || best.text.length < 80 || scoreMenuText(best.text) < 1) {
      throw new Error(
        "No readable menu page or PDF was found on the restaurant website. Upload the menu instead.",
      );
    }
    return {
      upload: {
        filename: "restaurant-menu.txt",
        mimetype: "text/plain",
        buffer: Buffer.from(`Source: ${best.page.url.toString()}\n\n${best.text}`, "utf8"),
      },
      sourceUrl: best.page.url.toString(),
      openingHours: discoveredHours,
    };
  }
}

interface DownloadedPage {
  url: URL;
  mimetype: string;
  buffer: Buffer;
}

async function downloadPublicUrl(initialUrl: URL): Promise<DownloadedPage> {
  let url = initialUrl;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await assertPublicUrl(url);
    const response = await fetch(url, {
      dispatcher: safeMenuAgent,
      redirect: "manual",
      headers: {
        "User-Agent":
          process.env.MENU_CRAWLER_USER_AGENT ??
          "VeganTools/0.1 (https://nilsduran.github.io)",
        Accept: "text/html,application/pdf;q=0.9",
      },
      signal: AbortSignal.timeout(8_000),
    } as RequestInit & { dispatcher?: unknown });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The restaurant website returned an invalid redirect.");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error(`The restaurant website returned ${response.status}.`);
    const mimetype = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    const maximum = mimetype === "application/pdf" ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
    const declaredSize = Number(response.headers.get("content-length") ?? "0");
    if (declaredSize > maximum) throw new Error("The discovered menu is too large.");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maximum) throw new Error("The discovered menu is too large.");
    return { url, mimetype, buffer };
  }
  throw new Error("The restaurant website redirected too many times.");
}

async function assertPublicUrl(url: URL) {
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Only public HTTP or HTTPS restaurant websites are supported.");
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new Error("Local network addresses are not allowed.");
  }
  let addresses;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new Error(
      "That website address could not be reached. Try the official website or upload menu photos.",
    );
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("The restaurant website does not resolve to a public address.");
  }
}

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    return isPrivateAddress(normalized.slice("::ffff:".length));
  }
  if (isIP(address) === 4) {
    const [a = 0, b = 0] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("2001:db8:")
  );
}

function extractMenuLinks(html: string, baseUrl: URL) {
  const links: Array<{ url: URL; score: number }> = [];
  const addLink = (rawUrl: string, label: string, baseScore = 0) => {
    try {
      const url = new URL(decodeEntities(rawUrl), baseUrl);
      if (!["http:", "https:"].includes(url.protocol)) return;
      const haystack = `${url.pathname} ${url.search} ${label}`.toLowerCase();
      const keywordMatches = haystack.match(
        /\b(menu|menus|carta|cartas|cartes|carte|speisekarte|food|eat|lunch|dinner|migdia|sopar|gastronom\w*|platos|plats|dishes|menjar|proposta|tapes|tapas|burger|burgers|pizza|pizzas|postres|desserts|drinks|bebidas|begudes|takeaway|delivery|order|pedir|demanar|comida|kitchen|cuina|cocina|brunch|breakfast|entrants|starters|mains)\b/g,
      )?.length ?? 0;
      const isPdf = url.pathname.toLowerCase().endsWith(".pdf");
      const isExternalPlatform =
        url.hostname.includes("canva.com") ||
        url.hostname.includes("drive.google.com") ||
        url.hostname.includes("linktr.ee") ||
        url.hostname.includes("qrmenu") ||
        url.hostname.includes("qr-menu") ||
        url.hostname.includes("imenupro.com") ||
        url.hostname.includes("menudigital");
      if (keywordMatches === 0 && !isPdf && !isExternalPlatform) return;
      links.push({
        url,
        score: baseScore + keywordMatches * 5 + (isPdf ? 30 : 0) + (isExternalPlatform ? 25 : 0),
      });
    } catch {
      // Ignore malformed links.
    }
  };

  const linkPattern = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    addLink(match[1] ?? "", stripTags(match[2] ?? ""), 2);
  }
  const embeddedPattern =
    /<(?:iframe|embed|object)\b[^>]*(?:src|data)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(embeddedPattern)) {
    addLink(match[1] ?? "", "embedded menu", 10);
  }
  const directPdfPattern = /(?:href|src|data)\s*=\s*["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi;
  for (const match of html.matchAll(directPdfPattern)) {
    addLink(match[1] ?? "", "pdf menu", 15);
  }
  return [...new Map(
    links
      .sort((a, b) => b.score - a.score)
      .map((entry) => [entry.url.toString(), entry]),
  ).values()].map((entry) => entry.url);
}

function extractVisibleText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/li|\/div|\/h[1-6]|\/tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, 120_000);
}

function scoreMenuText(text: string) {
  const lower = text.toLowerCase();
  const currency = lower.match(/(?:€|\beur\b|\$\s?\d|\d+[,.]\d{2})/g)?.length ?? 0;
  const menuWords = lower.match(
    /\b(?:menu|carta|starters?|mains?|desserts?|entrants?|postres?|plats?|tapas?|tapes?|platos?|burgers?|pizzas?|drinks?|bebidas?|salads?|combos?|aperitius?|segons?|primers?|pasta|arròs|arroz|sopes?|bowls?|postres|begudes?|cafès?|vins?|cerveza|cervesa|sandwich|tofu|seitan|hummus|heura|tempeh|curry|tacos?|noodles?|ramen|sushi|rolls?|falafel|wrap|smoothies?|cocktails?|breakfast|brunch|lunch|dinner)\b/g,
  )?.length ?? 0;
  return Math.min(currency, 20) + Math.min(menuWords, 15) * 2;
}

export function extractOpeningHoursFromHtml(html: string): string | undefined {
  // 1. JSON-LD structured data (schema.org/Restaurant)
  const jsonLdMatches = html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]?.trim() || "");
      const items = Array.isArray(data) ? data : data?.["@graph"] ? data["@graph"] : [data];
      for (const item of items) {
        if (item?.openingHours) {
          if (Array.isArray(item.openingHours)) return item.openingHours.join("; ");
          if (typeof item.openingHours === "string") return item.openingHours;
        }
        if (item?.openingHoursSpecification) {
          const specs = Array.isArray(item.openingHoursSpecification)
            ? item.openingHoursSpecification
            : [item.openingHoursSpecification];
          const parts: string[] = [];
          for (const s of specs) {
            const days = Array.isArray(s.dayOfWeek)
              ? s.dayOfWeek.map((d: string) => String(d).replace(/https?:\/\/schema\.org\//, "").slice(0, 2)).join(",")
              : typeof s.dayOfWeek === "string"
                ? s.dayOfWeek.replace(/https?:\/\/schema\.org\//, "").slice(0, 2)
                : "";
            if (days && s.opens && s.closes) {
              parts.push(`${days} ${s.opens}-${s.closes}`);
            }
          }
          if (parts.length > 0) return parts.join("; ");
        }
      }
    } catch {}
  }

  // 2. Microdata itemprop="openingHours"
  const itempropMatch =
    html.match(/itemprop\s*=\s*["']openingHours["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
    html.match(/itemprop\s*=\s*["']openingHours["'][^>]*>([^<]+)</i);
  if (itempropMatch?.[1]) {
    return itempropMatch[1].trim();
  }

  // 3. Common schedule block pattern
  const textPattern =
    /(?:horari[s]?|horario[s]?|opening hours|business hours)[:\s]+([A-Za-zÀ-ÿ0-9:,\s\-–—/|]{8,80})/i;
  const match = html.match(textPattern);
  if (match?.[1]) {
    const candidate = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (/\d{1,2}[:.]\d{2}/.test(candidate)) {
      return candidate.slice(0, 80);
    }
  }

  return undefined;
}

function pdfUpload(url: URL, buffer: Buffer): DiscoveredMenu {
  return {
    upload: {
      filename: url.pathname.split("/").pop() || "restaurant-menu.pdf",
      mimetype: "application/pdf",
      buffer,
    },
    sourceUrl: url.toString(),
  };
}

function stripTags(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

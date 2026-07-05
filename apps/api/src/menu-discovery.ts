import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface DiscoveredMenu {
  upload: {
    filename: string;
    mimetype: string;
    buffer: Buffer;
  };
  sourceUrl: string;
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
    const queue = extractMenuLinks(html, homepage.url)
      .slice(0, 8)
      .map((url) => ({ url, depth: 1 }));
    const visited = new Set([homepage.url.toString()]);
    while (queue.length > 0 && visited.size <= 14) {
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
    const best = htmlPages
      .map((page) => ({
        page,
        text: extractVisibleText(page.buffer.toString("utf8")),
      }))
      .sort((left, right) => scoreMenuText(right.text) - scoreMenuText(left.text))[0];
    if (!best || best.text.length < 180 || scoreMenuText(best.text) < 2) {
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
      redirect: "manual",
      headers: {
        "User-Agent":
          process.env.MENU_CRAWLER_USER_AGENT ??
          "VeganTools/0.1 (https://nilsduran.github.io)",
        Accept: "text/html,application/pdf;q=0.9",
      },
      signal: AbortSignal.timeout(8_000),
    });
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
        /\b(menu|menus|carta|cartas|cartes|carte|food|eat|lunch|dinner|migdia|sopar|gastronom\w*)\b/g,
      )?.length ?? 0;
      const isPdf = url.pathname.toLowerCase().endsWith(".pdf");
      if (keywordMatches === 0 && !isPdf) return;
      links.push({
        url,
        score: baseScore + keywordMatches * 5 + (isPdf ? 30 : 0),
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
    /\b(?:menu|carta|starters?|mains?|desserts?|entrants?|postres?|plats?|tapas?)\b/g,
  )?.length ?? 0;
  return Math.min(currency, 20) + Math.min(menuWords, 10) * 2;
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

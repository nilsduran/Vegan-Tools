/**
 * @file scanned-code.ts
 * @description Decides what a scanned code is, so the universal scanner can send it to
 * the right place: a product (barcode, GS1 Digital Link QR, Open Facts link), a
 * restaurant menu (QR on the table), another link, or plain text.
 *
 * Deterministic on purpose: the code itself says what it is, so no model is needed.
 */

import { isValidGtin, normalizeGtin } from "./gtin.js";

export type ScannedCode =
  | { kind: "product"; gtin: string }
  /** Looks like a barcode number but the check digit is wrong: a misread or a typo. */
  | { kind: "invalid_gtin"; digits: string }
  | { kind: "menu_url"; url: string }
  | { kind: "url"; url: string }
  | { kind: "text"; text: string };

const OPEN_FACTS_HOSTS = [
  "openfoodfacts.org",
  "openbeautyfacts.org",
  "openproductsfacts.org",
  "openpetfoodfacts.org",
];

/** Words that restaurant QR menus put in their address. */
const MENU_HINT =
  /(^|[^a-z])(menu|menus|menú|carta|cartas|carte|speisekarte|karte|menukaart|qr-?menu|qrmenu|food|eat|dishes|plats|platos)([^a-z]|$)/i;
const MENU_HOSTS = [
  "thefork.com", "eltenedor.es", "covermanager.com", "menu.app", "mymenu", "qr-menu",
  "qrmenu", "glovo", "flipdish", "sumup", "ordering.app", "menutiger", "bentobox",
];

function gtinFromPath(pathname: string, pattern: RegExp): string | undefined {
  const digits = pathname.match(pattern)?.[1];
  return digits && isValidGtin(digits) ? normalizeGtin(digits) : undefined;
}

export function classifyScannedCode(raw: string): ScannedCode {
  const value = raw.trim();
  const compact = value.replace(/[\s-]/g, "");

  if (/^\d{6,14}$/.test(compact)) {
    if ([8, 12, 13, 14].includes(compact.length) && isValidGtin(compact)) {
      return { kind: "product", gtin: compact };
    }
    return { kind: "invalid_gtin", digits: compact };
  }

  let url: URL | undefined;
  try {
    url = new URL(/^www\./i.test(value) ? `https://${value}` : value);
  } catch {
    url = undefined;
  }
  if (!url || !/^https?:$/.test(url.protocol)) return { kind: "text", text: value };

  const host = url.hostname.toLowerCase();
  // GS1 Digital Link: the QR codes replacing barcodes on packaging (".../01/<GTIN>/...").
  const digitalLinkGtin = gtinFromPath(url.pathname, /\/01\/(\d{8,14})(?:\/|$)/);
  if (digitalLinkGtin) return { kind: "product", gtin: digitalLinkGtin };

  if (OPEN_FACTS_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    const gtin = gtinFromPath(url.pathname, /\/product\/(\d{8,14})(?:\/|$)/);
    if (gtin) return { kind: "product", gtin };
  }

  const looksLikeMenu =
    MENU_HOSTS.some((fragment) => host.includes(fragment)) ||
    MENU_HINT.test(decodeURIComponent(url.pathname + url.search)) ||
    MENU_HINT.test(host.replace(/\./g, " ")) ||
    /\.pdf$/i.test(url.pathname);
  return looksLikeMenu ? { kind: "menu_url", url: url.href } : { kind: "url", url: url.href };
}

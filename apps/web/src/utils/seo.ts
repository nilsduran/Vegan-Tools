/**
 * @file seo.ts
 * @description Lightweight, dependency-free head and metadata manager for client-side SEO.
 * Dynamically updates document title, description, OpenGraph tags, Twitter Cards,
 * and canonical links based on the active page and language preference.
 */

import { useEffect } from "react";
import { useLanguage } from "../i18n";

export interface DocumentHeadOptions {
  title?: string;
  description?: string;
  image?: string;
  path?: string;
  type?: "website" | "article" | "profile";
}

const SITE_NAME = "Vegan Tools";
const BASE_URL = "https://vegantools.org";
const DEFAULT_IMAGE = `${BASE_URL}/apple-touch-icon.png`;

export function setMetaTag(attribute: "name" | "property", key: string, content?: string | null) {
  if (typeof document === "undefined") return;
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
  if (!content) {
    if (element) element.remove();
    return;
  }
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function setLinkTag(rel: string, href?: string | null) {
  if (typeof document === "undefined") return;
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!href) {
    if (element) element.remove();
    return;
  }
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

/**
 * Updates head metadata synchronously. Useful for both hook invocation and direct testing.
 */
export function updateDocumentMetadata(options: DocumentHeadOptions, language: "ca" | "en") {
  if (typeof document === "undefined") return;

  const defaultDesc =
    language === "ca"
      ? "Eines útils i basades en evidències per al dia a dia vegà: cerca de restaurants, escàner de productes i receptari."
      : "Evidence-led tools for navigating a non-vegan world: vegan restaurant discovery, product scanner, and recipes.";

  const effectiveTitle = options.title
    ? `${options.title} · ${SITE_NAME}`
    : language === "ca"
      ? `${SITE_NAME} — Eines per al dia a dia vegà`
      : `${SITE_NAME} — Useful tools for everyday vegan life`;

  const effectiveDesc = options.description || defaultDesc;
  const canonicalUrl = options.path ? `${BASE_URL}${options.path}` : BASE_URL;
  const imageUrl = options.image
    ? options.image.startsWith("http")
      ? options.image
      : `${BASE_URL}${options.image.startsWith("/") ? "" : "/"}${options.image}`
    : DEFAULT_IMAGE;

  // Title & primary description
  document.title = effectiveTitle;
  setMetaTag("name", "description", effectiveDesc);

  // Canonical link
  setLinkTag("canonical", canonicalUrl);

  // OpenGraph (Facebook / WhatsApp / LinkedIn)
  setMetaTag("property", "og:site_name", SITE_NAME);
  setMetaTag("property", "og:title", effectiveTitle);
  setMetaTag("property", "og:description", effectiveDesc);
  setMetaTag("property", "og:url", canonicalUrl);
  setMetaTag("property", "og:type", options.type || "website");
  setMetaTag("property", "og:image", imageUrl);
  setMetaTag("property", "og:locale", language === "ca" ? "ca_ES" : "en_US");

  // Twitter Cards
  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", effectiveTitle);
  setMetaTag("name", "twitter:description", effectiveDesc);
  setMetaTag("name", "twitter:image", imageUrl);
}

/**
 * React hook to synchronize document head and social cards reactively with page lifecycle.
 */
export function useDocumentHead(options: DocumentHeadOptions) {
  const language = useLanguage();

  useEffect(() => {
    updateDocumentMetadata(options, language);
  }, [options.title, options.description, options.image, options.path, options.type, language]);
}

/**
 * @file ScannedMenuPage.tsx
 * @description Menu from a QR code on a restaurant table: the scanner sends the link
 * here, and the page analyses it and shows what can be ordered.
 */

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { classifyScannedCode, NOT_A_MENU_ERROR } from "@vegan-tools/domain";
import { analyzeScanUrl, discoverMenuByUrl, waitForMenuDraft } from "../api";
import { MenuView } from "../components/MenuView";
import { UniversalResult } from "../components/UniversalResult";
import { tx, useLanguage } from "../i18n";
import { useDocumentHead } from "../utils/seo";

function scannedMenuUrl(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const scanned = classifyScannedCode(raw);
  return scanned.kind === "menu_url" || scanned.kind === "url" ? scanned.url : undefined;
}

export function ScannedMenuPage() {
  const [searchParams] = useSearchParams();
  const url = scannedMenuUrl(searchParams.get("url"));
  useDocumentHead({ title: tx("Scanned menu"), path: "/scan/menu", type: "website" });

  const menu = useQuery({
    queryKey: ["scanned-menu", url],
    queryFn: async () => waitForMenuDraft(await discoverMenuByUrl(url ?? ""), () => false),
    enabled: Boolean(url),
    staleTime: Infinity,
    retry: false,
  });

  // Not a menu after all (an article, a review, a shop page): check it as an
  // ordinary link instead, unless that check also says "menu".
  const notAMenu = menu.data?.error === NOT_A_MENU_ERROR;
  const language = useLanguage();
  const asLink = useQuery({
    queryKey: ["scanned-link", url, language],
    queryFn: () => analyzeScanUrl(url ?? "", language),
    enabled: Boolean(url) && notAMenu,
    staleTime: Infinity,
    retry: false,
  });
  const linkResult = asLink.data && !asLink.data.menuUrl ? asLink.data : undefined;
  const checkingLink = notAMenu && asLink.isPending;
  const failed = !linkResult && !checkingLink && (!url || menu.isError || (menu.data && menu.data.sections.length === 0));

  return (
    <div className="page">
      {url && (menu.isPending || checkingLink) && (
        <div className="loading"><LoaderCircle className="spin" />{tx(checkingLink ? "This is not a menu. Checking the link…" : "Reading the menu…")}</div>
      )}
      {linkResult && <UniversalResult result={linkResult} />}
      {failed && !menu.isPending && (
        <div className="scanner-external-result" role="alert">
          <strong>{tx(notAMenu ? "This link is not a restaurant menu." : "This link does not look like a menu we can read.")}</strong>
          {menu.data?.error && !notAMenu && <p className="muted">{tx(menu.data.error)}</p>}
          <div className="not-found-actions">
            {url && (
              <a className="secondary-button" href={url} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />
                <span>{tx("Open scanned link")}</span>
              </a>
            )}
            <Link className="primary-button" to="/scanner">{tx("Scan another")}</Link>
          </div>
        </div>
      )}
      {menu.data && menu.data.sections.length > 0 && <MenuView menu={menu.data} />}
    </div>
  );
}

/**
 * @file ScannedMenuPage.tsx
 * @description Menu from a QR code on a restaurant table: the scanner sends the link
 * here, and the page analyses it and shows what can be ordered.
 */

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { classifyScannedCode } from "@vegan-tools/domain";
import { discoverMenuByUrl, waitForMenuDraft } from "../api";
import { MenuView } from "../components/MenuView";
import { tx } from "../i18n";
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

  const failed = !url || menu.isError || (menu.data && menu.data.sections.length === 0);

  return (
    <div className="page">
      {url && menu.isPending && (
        <div className="loading"><LoaderCircle className="spin" />{tx("Reading the menu…")}</div>
      )}
      {failed && !menu.isPending && (
        <div className="scanner-external-result" role="alert">
          <strong>{tx("This link does not look like a menu we can read.")}</strong>
          {menu.data?.error && <p className="muted">{tx(menu.data.error)}</p>}
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

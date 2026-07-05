import { useEffect, useMemo, useRef, useState } from "react";
import type { MenuDraft } from "@vegan-tools/domain";
import { Clock3, RefreshCw } from "lucide-react";
import { MenuView } from "./MenuView";
import { resolveApiUrl, sourcePdfPageUrl } from "../api";
import { tx } from "../i18n";
import { isPresentableMenuSource } from "../menu-source";

export function MenuEditor({
  initialMenu,
  sourceFiles = [],
  cached = false,
  onRefresh,
}: {
  initialMenu: MenuDraft;
  sourceFiles?: File[];
  cached?: boolean;
  onRefresh?: () => void;
}) {
  const [sourceTarget, setSourceTarget] = useState<{
    page: number;
    requestId: number;
  }>();
  const sourcePreviewRef = useRef<HTMLElement>(null);
  const presentableLocalFiles = useMemo(
    () => sourceFiles.filter((file) => isPresentableMenuSource(file.type)),
    [sourceFiles],
  );
  const presentableStoredSources = initialMenu.sourceFiles.filter((source) =>
    isPresentableMenuSource(source.mimeType)
  );
  const sourceObjectUrls = useMemo(
    () => presentableLocalFiles.map((file) => URL.createObjectURL(file)),
    [presentableLocalFiles],
  );
  useEffect(
    () => () => sourceObjectUrls.forEach((url) => URL.revokeObjectURL(url)),
    [sourceObjectUrls],
  );
  const firstStoredSource = presentableStoredSources[0];
  const firstSourceUrl = sourceObjectUrls[0] ??
    (firstStoredSource ? resolveApiUrl(firstStoredSource.url) : undefined);
  const firstSourceType = presentableLocalFiles[0]?.type ?? firstStoredSource?.mimeType;
  const hasPresentableSource = Boolean(firstSourceUrl && firstSourceType);
  const sourcePreviewUrl = firstSourceUrl && sourceTarget
    ? sourcePdfPageUrl(firstSourceUrl, sourceTarget.page)
    : firstSourceUrl;

  return (
    <div className="review-shell">
      <div className="menu-cache-bar">
        <span>
          {cached && <><Clock3 /> {tx("Shared saved menu")}</>}
        </span>
        {onRefresh && (
          <button type="button" className="text-button" onClick={onRefresh}>
            <RefreshCw /> {tx("Update menu")}
          </button>
        )}
      </div>
      <div className={`review-layout${hasPresentableSource ? "" : " review-layout-no-source"}`}>
        {hasPresentableSource && <aside className="source-preview" ref={sourcePreviewRef}>
          <h2>{tx("Original menu")}</h2>
          {sourcePreviewUrl && firstSourceType === "application/pdf" && (
            <iframe
              key={`${sourcePreviewUrl}-${sourceTarget?.requestId ?? 0}`}
              src={sourcePreviewUrl}
              title={sourceTarget
                ? `${tx("Original menu")}, ${tx("Page").toLocaleLowerCase()} ${sourceTarget.page}`
                : `${tx("Original menu")} PDF`}
            />
          )}
          {sourceObjectUrls.length > 0 && firstSourceType !== "application/pdf" &&
            sourceObjectUrls.map((url, index) => (
              <img key={url} src={url} alt={`${tx("Original menu")} ${index + 1}`} />
            ))}
          {sourceObjectUrls.length === 0 && firstSourceType !== "application/pdf" &&
            presentableStoredSources.map((source, index) => (
              <img
                key={source.url}
                src={resolveApiUrl(source.url)}
                alt={`${tx("Original menu")} ${index + 1}`}
              />
            ))}
        </aside>}

        <div className="review-menu-preview">
          <MenuView
            menu={initialMenu}
            onSourceReference={firstSourceType === "application/pdf"
              ? (item) => {
                  if (!item.sourcePage) return;
                  setSourceTarget({
                    page: item.sourcePage,
                    requestId: Date.now(),
                  });
                  if (window.matchMedia("(max-width: 900px)").matches) {
                    sourcePreviewRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }
                }
              : undefined}
          />
        </div>
      </div>
    </div>
  );
}

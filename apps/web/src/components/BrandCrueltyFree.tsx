/**
 * @file BrandCrueltyFree.tsx
 * @description Whether a cosmetics brand tests on animals, looked up with a web search
 * on demand (it costs an AI call, so it only runs when a cosmetic is shown).
 */

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, Rabbit } from "lucide-react";
import { getBrandEthics } from "../api";
import { tx, useLanguage } from "../i18n";

const STATUS_LABELS = {
  cruelty_free: "The brand does not test on animals",
  tests_on_animals: "The brand or its parent company tests on animals",
  unknown: "No reliable information about animal testing was found",
} as const;

export function BrandCrueltyFree({ brand }: { brand: string }) {
  const language = useLanguage();
  const name = brand.split(",")[0]?.trim() ?? brand;
  const ethics = useQuery({
    queryKey: ["brand-ethics", name.toLowerCase(), language],
    queryFn: () => getBrandEthics(name, language),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });

  if (ethics.isPending) {
    return (
      <p className="brand-ethics brand-ethics--loading">
        <LoaderCircle className="spin" aria-hidden="true" />
        {tx("Checking whether the brand tests on animals…")}
      </p>
    );
  }
  if (ethics.isError) return null;

  const { status, summary, parentCompany, sources } = ethics.data;
  return (
    <div className={`brand-ethics brand-ethics--${status}`}>
      <p className="brand-ethics-title">
        <Rabbit aria-hidden="true" />
        <strong>{name}: {tx(STATUS_LABELS[status])}</strong>
      </p>
      {summary && <p>{summary}</p>}
      {parentCompany && <p className="muted">{tx("Parent company")}: {parentCompany}</p>}
      {sources.length > 0 && (
        <ul className="brand-ethics-sources">
          {sources.slice(0, 3).map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title || new URL(source.url).hostname} <ExternalLink aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="muted brand-ethics-note">{tx("Automatic web search. Check the sources before relying on it.")}</p>
    </div>
  );
}

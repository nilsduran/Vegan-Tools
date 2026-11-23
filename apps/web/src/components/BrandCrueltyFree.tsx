/**
 * @file BrandCrueltyFree.tsx
 * @description Whether a cosmetics brand tests on animals, looked up with a web search
 * on demand (it costs an AI call, so it only runs when a cosmetic is shown).
 */

import { useQuery } from "@tanstack/react-query";
import type { DietVerdict } from "@vegan-tools/domain";
import { ExternalLink, LoaderCircle, Rabbit } from "lucide-react";
import { getBrandEthics } from "../api";
import { tx, useLanguage } from "../i18n";

const STATUS_LABELS = {
  cruelty_free: "The brand does not test on animals",
  tests_on_animals: "The brand tests on animals",
  unknown: "No reliable information about animal testing was found",
} as const;

function brandName(brand: string) {
  return brand.split(",")[0]?.trim() ?? brand;
}

/** One request per brand and language, shared by the verdict and the brand card. */
function useBrandEthics(brand: string | undefined) {
  const language = useLanguage();
  const name = brand ? brandName(brand) : "";
  return useQuery({
    queryKey: ["brand-ethics", name.toLowerCase(), language],
    queryFn: () => getBrandEthics(name, language),
    enabled: Boolean(name),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}

/** Already not vegan from the ingredients: the brand cannot change that. */
const NOT_VEGAN: DietVerdict[] = ["non_vegetarian", "vegetarian", "probably_vegetarian"];

/**
 * One verdict for a cosmetic: the product's own answer combined with whether the
 * brand itself tests on animals (worldwide; the parent company does not count). While the brand is being
 * checked there is no verdict yet, so the page never shows one answer and then
 * contradicts it a few seconds later.
 */
export function useCosmeticVerdict(verdict: DietVerdict, reason: string, brand: string | undefined) {
  const ethics = useBrandEthics(brand);
  if (!brand || NOT_VEGAN.includes(verdict)) return { verdict, reason, waiting: false, testsOnAnimals: false };
  if (ethics.isLoading) return { verdict, reason, waiting: true, testsOnAnimals: false };
  if (ethics.data?.status === "tests_on_animals") {
    // A fixed sentence, not a generated one: the same case always reads the same.
    return {
      verdict: "non_vegetarian" as DietVerdict,
      reason: tx("Not cruelty-free: the brand tests on animals."),
      waiting: false,
      testsOnAnimals: true,
    };
  }
  return { verdict, reason, waiting: false, testsOnAnimals: false };
}

/** Shown where the verdict goes while the brand is being checked. */
export function BrandVerdictPending() {
  return (
    <p className="brand-ethics brand-ethics--loading" role="status">
      <LoaderCircle className="spin" aria-hidden="true" />
      {tx("Checking whether the brand tests on animals…")}
    </p>
  );
}

export function BrandCrueltyFree({ brand }: { brand: string }) {
  const name = brandName(brand);
  const ethics = useBrandEthics(brand);

  // While loading, the verdict area already says the brand is being checked.
  if (ethics.isPending || ethics.isError) return null;

  const { status, summary, sources } = ethics.data;
  return (
    <div className={`brand-ethics brand-ethics--${status}`}>
      <p className="brand-ethics-title">
        <Rabbit aria-hidden="true" />
        <strong>{name}: {tx(STATUS_LABELS[status])}</strong>
      </p>
      {summary && <p>{summary}</p>}
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

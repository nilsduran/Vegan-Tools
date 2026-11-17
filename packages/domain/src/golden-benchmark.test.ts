import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { classifyIngredients } from "./classifier.js";

interface GoldenSample {
  text: string;
  language: string;
  has_slaughter: number;
  has_secretion: number;
  has_dual_origin: number;
}

// 182 hand-written ingredient labels in six languages. This is the release gate
// for the precautionary principle: it runs the production classifier, and an
// animal product read as vegan fails the build.
const samples: GoldenSample[] = readFileSync(
  fileURLToPath(new URL("../test-fixtures/golden-ingredients.jsonl", import.meta.url)),
  "utf-8",
)
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line) as GoldenSample);

const verdictOf = (sample: GoldenSample) =>
  classifyIngredients(sample.text, { assurance: "external" }).verdict;
const readsAsVegan = (sample: GoldenSample) =>
  ["vegan", "probably_vegan"].includes(verdictOf(sample));

describe("golden ingredient benchmark", () => {
  it("never reads meat or fish as vegan", () => {
    const missed = samples.filter((sample) => sample.has_slaughter && readsAsVegan(sample));
    expect(missed.map((sample) => sample.text)).toEqual([]);
  });

  it("never reads dairy, egg or honey as vegan", () => {
    const missed = samples.filter(
      (sample) => !sample.has_slaughter && sample.has_secretion && readsAsVegan(sample),
    );
    expect(missed.map((sample) => sample.text)).toEqual([]);
  });

  it("flags at most 6 of the 90 plant-only labels", () => {
    const plantOnly = samples.filter(
      (sample) => !sample.has_slaughter && !sample.has_secretion && !sample.has_dual_origin,
    );
    expect(plantOnly).toHaveLength(90);
    expect(plantOnly.filter((sample) => !readsAsVegan(sample)).length).toBeLessThanOrEqual(6);
  });
});

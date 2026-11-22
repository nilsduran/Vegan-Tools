import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { classifyIngredients } from "./classifier.js";

const verdict = (text: string) => classifyIngredients(text, { assurance: "label_based", fromPhoto: true }).verdict;

describe("misread animal ingredients in photographed labels", () => {
  it.each([
    "Sucre, xarop de glucosa, gelatna, àcid cítric",
    "Harina de trigo, azúcar, mantequila, sal",
    "Sugar, cocoa butter, skimmed mlik powder, lactosse",
    "Farine de blé, sucre, beurrre, sel",
  ])("does not read %s as vegan", (text) => {
    expect(verdict(text)).not.toMatch(/vegan/);
  });

  it("ignores real words a letter away from an animal term", () => {
    expect(verdict("Boisson à l'avoine, frisch, roggen, verdes, hafermilch")).toBe("probably_vegan");
  });

  it("leaves typed text alone (no reading errors to guess)", () => {
    expect(classifyIngredients("Sucre, gelatna", { assurance: "label_based" }).verdict).toBe("probably_vegan");
  });

  it("does not flag the plant-only golden labels", () => {
    const samples = readFileSync(fileURLToPath(new URL("../test-fixtures/golden-ingredients.jsonl", import.meta.url)), "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { text: string; has_slaughter: number; has_secretion: number; has_dual_origin: number });
    const plant = samples.filter((sample) => !sample.has_slaughter && !sample.has_secretion && !sample.has_dual_origin);
    const flagged = plant.filter((sample) => !["vegan", "probably_vegan"].includes(verdict(sample.text)));
    expect(flagged.map((sample) => sample.text).length).toBeLessThanOrEqual(6);
    expect(plant.filter((sample) => classifyIngredients(sample.text, { assurance: "label_based", fromPhoto: true }).findings.some((finding) => finding.id.startsWith("misread:")))).toEqual([]);
  });
});

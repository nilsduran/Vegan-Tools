import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ca, caPhrases, en } from "./i18n.js";

function getSourceFiles(dir: string): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist") {
        results = results.concat(getSourceFiles(fullPath));
      }
    } else if (
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.tsx") &&
      entry.name !== "i18n.ts"
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractTxCalls(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const phrases: string[] = [];

  // Match tx("...") and tx('...') with escaped quote handling
  const doubleQuoteRegex = /\btx\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g;
  const singleQuoteRegex = /\btx\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g;

  let match: RegExpExecArray | null;
  while ((match = doubleQuoteRegex.exec(content)) !== null) {
    if (match[1]) {
      phrases.push(match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
    }
  }
  while ((match = singleQuoteRegex.exec(content)) !== null) {
    if (match[1]) {
      phrases.push(match[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\"));
    }
  }

  return phrases;
}

describe("Automated i18n Coverage & Parity Guard", () => {
  it("enforces 100% dictionary key parity between English and Catalan base dictionaries", () => {
    const enKeys = Object.keys(en);
    const caKeys = Object.keys(ca);

    // English to Catalan
    for (const key of enKeys) {
      expect(
        key in ca,
        `Key "${key}" exists in English base dictionary but is missing in Catalan base dictionary.`,
      ).toBe(true);
      const val = (ca as Record<string, string>)[key];
      expect(
        typeof val === "string" && val.trim().length > 0,
        `Key "${key}" has an empty translation in Catalan base dictionary.`,
      ).toBe(true);
    }

    // Catalan to English
    for (const key of caKeys) {
      expect(
        key in en,
        `Key "${key}" exists in Catalan base dictionary but is missing in English base dictionary.`,
      ).toBe(true);
    }
  });

  it("ensures all phrase keys in caPhrases have valid, non-empty translations", () => {
    const entries = Object.entries(caPhrases);
    expect(entries.length).toBeGreaterThan(100);

    for (const [key, value] of entries) {
      expect(
        typeof value === "string" && value.trim().length > 0,
        `Phrase key "${key}" has an empty or invalid Catalan translation in caPhrases.`,
      ).toBe(true);
    }
  });

  it("statically verifies that every tx(...) call in codebase is registered in caPhrases", () => {
    const srcDir = path.resolve(__dirname);
    const files = getSourceFiles(srcDir);
    expect(files.length).toBeGreaterThan(10);

    const missingTranslations: Array<{ file: string; phrase: string }> = [];

    for (const file of files) {
      const phrases = extractTxCalls(file);
      for (const phrase of phrases) {
        // Skip dynamically evaluated expressions or empty calls
        if (!phrase.trim()) continue;

        if (!(phrase in caPhrases)) {
          const relativeFile = path.relative(srcDir, file).replace(/\\/g, "/");
          missingTranslations.push({ file: relativeFile, phrase });
        }
      }
    }

    if (missingTranslations.length > 0) {
      const summary = missingTranslations
        .map(({ file, phrase }) => `  - [${file}]: "${phrase}"`)
        .join("\n");
      throw new Error(
        `Found ${missingTranslations.length} untranslated tx(...) calls in web codebase:\n${summary}\n\nPlease add the missing translations to caPhrases in apps/web/src/i18n.ts!`,
      );
    }

    expect(missingTranslations).toHaveLength(0);
  });
});

/**
 * @file taxonomy.ts
 * @description Tier 2 Knowledge Graph index providing deterministic, sub-millisecond lookup
 * across 24,000+ multilingual ingredient aliases from Open Food Facts & EFSA.
 */

import type { DietVerdict } from "./schemas.js";
import taxonomyData from "./data/taxonomy.json" with { type: "json" };

interface TaxonomyEntity {
  id: string;
  name: string;
  status: DietVerdict;
  category: string;
}

interface TaxonomyData {
  entities: TaxonomyEntity[];
  aliases: Record<string, number>;
}

const typedData = taxonomyData as unknown as TaxonomyData;
const entities: TaxonomyEntity[] = typedData.entities || [];
const aliases: Record<string, number> = typedData.aliases || {};

// Map en memòria per a cerca exacta O(1)
const exactIndex = new Map<string, TaxonomyEntity>();

// 1. Indexar tots els àlies multilingües
for (const [alias, idx] of Object.entries(aliases)) {
  const entity = entities[idx];
  if (entity) {
    exactIndex.set(alias.toLowerCase().trim(), entity);
  }
}

// 2. Indexar noms oficials i codis E
for (const entity of entities) {
  if (entity.name) {
    exactIndex.set(entity.name.toLowerCase().trim(), entity);
  }
  if (entity.id) {
    const rawId = entity.id.split(":").pop()?.toLowerCase().trim();
    if (rawId) {
      exactIndex.set(rawId, entity);
    }
  }
}

/**
 * Cerca un ingredient o additiu en la taxonomia Tier 2.
 * @param token Text d'un ingredient individual (ex: "gelatina de porc", "E471", "carmí")
 * @returns L'entitat de taxonomia amb el seu estatus ètic exacte, o null si no està indexat.
 */
export function lookupTaxonomy(token: string): {
  id: string;
  name: string;
  status: DietVerdict;
  category: string;
  matchedBy: "exact" | "e_number";
} | null {
  const clean = token.toLowerCase().trim();
  if (clean.length < 2) return null;

  // 1. Coincidència directa o normalitzant guions
  const directMatch = exactIndex.get(clean) || exactIndex.get(clean.replace(/[-_]/g, " ").replace(/\s+/g, " "));
  if (directMatch) {
    return {
      id: directMatch.id,
      name: directMatch.name,
      status: directMatch.status,
      category: directMatch.category,
      matchedBy: "exact",
    };
  }

  // 2. Cerca per codi E normalitzat (ex: "emulgent (E-471)" -> "e471")
  const eMatch = clean.match(/\b(e\s*[-]?\s*\d{3,4}[a-z]?)\b/i);
  if (eMatch && eMatch[1]) {
    const normalizedE = eMatch[1].replace(/[\s-]/g, "").toLowerCase();
    const eEntity = exactIndex.get(normalizedE);
    if (eEntity) {
      return {
        id: eEntity.id,
        name: eEntity.name,
        status: eEntity.status,
        category: eEntity.category,
        matchedBy: "e_number",
      };
    }
  }

  return null;
}

/**
 * Retorna el nombre total de termes i àlies indexats al Tier 2.
 */
export function getTaxonomySize(): { entities: number; aliases: number; totalKeys: number } {
  return {
    entities: entities.length,
    aliases: Object.keys(aliases).length,
    totalKeys: exactIndex.size,
  };
}

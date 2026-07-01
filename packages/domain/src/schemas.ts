import { z } from "zod";

export const dietVerdictSchema = z.preprocess(
  (value) => value === "not_vegetarian" ? "non_vegetarian" : value,
  z.enum([
    "vegan",
    "probably_vegan",
    "vegetarian",
    "probably_vegetarian",
    "non_vegetarian",
    "unknown",
  ]),
);
export type DietVerdict = z.infer<typeof dietVerdictSchema>;

export const ingredientStatusSchema = z.enum([
  "vegan",
  "vegetarian",
  "non_vegetarian",
  "ambiguous",
]);
export type IngredientStatus = z.infer<typeof ingredientStatusSchema>;

export const ingredientFindingSchema = z.object({
  id: z.string(),
  name: z.string(),
  matchedAlias: z.string(),
  status: ingredientStatusSchema,
  reason: z.string(),
  eNumber: z.string().optional(),
  substitutions: z.array(z.string()).default([]),
});
export type IngredientFinding = z.infer<typeof ingredientFindingSchema>;

export const assuranceSchema = z.enum([
  "certified",
  "manufacturer",
  "label_based",
  "external",
  "unverified",
]);
export type Assurance = z.infer<typeof assuranceSchema>;

export const evidenceSchema = z.object({
  id: z.string(),
  sourceType: z.enum([
    "certification",
    "manufacturer",
    "package_label",
    "open_food_facts",
    "automated_extraction",
  ]),
  sourceName: z.string(),
  sourceUrl: z.string().url().optional(),
  capturedAt: z.string(),
  market: z.string().default("ES"),
  license: z.string().optional(),
  reviewerId: z.string().optional(),
  ingredientsText: z.string().optional(),
  traces: z.array(z.string()).default([]),
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const productResultSchema = z.object({
  gtin: z.string(),
  productName: z.string().optional(),
  brand: z.string().optional(),
  imageUrl: z.string().url().optional(),
  ingredientsImageUrl: z.string().url().optional(),
  verdict: dietVerdictSchema,
  assurance: assuranceSchema,
  definitive: z.boolean(),
  reason: z.string(),
  matchedIngredients: z.array(z.string()).default([]),
  findings: z.array(ingredientFindingSchema).default([]),
  classifierVersion: z.string().default("legacy"),
  traces: z.array(z.string()).default([]),
  verifiedAt: z.string().optional(),
  revision: z.number().int().positive().default(1),
  evidence: z.array(evidenceSchema).default([]),
});
export type ProductResult = z.infer<typeof productResultSchema>;

export const ingredientAnalysisSchema = z.object({
  verdict: dietVerdictSchema,
  assurance: assuranceSchema,
  definitive: z.boolean(),
  reason: z.string(),
  matchedIngredients: z.array(z.string()).default([]),
  findings: z.array(ingredientFindingSchema).default([]),
  classifierVersion: z.string(),
  traces: z.array(z.string()).default([]),
});
export type IngredientAnalysis = z.infer<typeof ingredientAnalysisSchema>;

export const recipeSubstitutionSchema = z.object({
  ingredientId: z.string(),
  ingredient: z.string(),
  detectedText: z.string().optional(),
  originalAmount: z.string().optional(),
  reason: z.string(),
  guidance: z.string(),
  suggestions: z.array(z.string()).min(1),
});
export type RecipeSubstitution = z.infer<typeof recipeSubstitutionSchema>;

export const recipeAnalysisSchema = z.object({
  originalText: z.string(),
  veganizedText: z.string(),
  verdict: dietVerdictSchema,
  summary: z.string(),
  classifierVersion: z.string(),
  findings: z.array(ingredientFindingSchema),
  substitutions: z.array(recipeSubstitutionSchema),
});
export type RecipeAnalysis = z.infer<typeof recipeAnalysisSchema>;

export const menuItemSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  name: z.string(),
  description: z.string().default(""),
  price: z.string().default(""),
  verdict: dietVerdictSchema,
  reason: z.string().default(""),
  modificationNote: z.string().optional(),
  modifiableTo: z.enum(["vegan", "vegetarian"]).optional(),
});
export type MenuItem = z.infer<typeof menuItemSchema>;

export const menuSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(menuItemSchema),
});
export type MenuSection = z.infer<typeof menuSectionSchema>;

export const menuDraftSchema = z.object({
  id: z.string(),
  editToken: z.string(),
  status: z.enum(["processing", "ready", "failed", "published"]),
  restaurantName: z.string().default(""),
  sourceLabel: z.string().default("Uploaded menu"),
  sourceCapturedAt: z.string(),
  service: z.string().optional(),
  validOn: z.string().optional(),
  originalLanguage: z.string().default("unknown"),
  sections: z.array(menuSectionSchema).default([]),
  error: z.string().optional(),
  publicSlug: z.string().optional(),
  createdAt: z.string(),
  originalDeleteAt: z.string(),
});
export type MenuDraft = z.infer<typeof menuDraftSchema>;

export const menuPatchSchema = menuDraftSchema
  .pick({
    restaurantName: true,
    sourceLabel: true,
    service: true,
    validOn: true,
    originalLanguage: true,
    sections: true,
  })
  .partial();
export type MenuPatch = z.infer<typeof menuPatchSchema>;

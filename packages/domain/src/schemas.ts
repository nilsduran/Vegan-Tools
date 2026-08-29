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
  selectedSuggestion: z.string(),
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

export const menuItemModificationSchema = z.object({
  target: z.enum(["vegan", "vegetarian"]),
  note: z.string(),
  noteCa: z.string().optional(),
});
export type MenuItemModification = z.infer<typeof menuItemModificationSchema>;

export const menuItemSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  name: z.string(),
  nameCa: z.string().optional(),
  description: z.string().default(""),
  descriptionCa: z.string().optional(),
  price: z.string().default(""),
  verdict: dietVerdictSchema,
  reason: z.string().default(""),
  reasonCa: z.string().optional(),
  modificationNote: z.string().optional(),
  modificationNoteCa: z.string().optional(),
  modifiableTo: z.enum(["vegan", "vegetarian"]).optional(),
  modifications: z.array(menuItemModificationSchema).default([]),
  sourcePage: z.number().int().positive().optional(),
});
export type MenuItem = z.infer<typeof menuItemSchema>;

export const menuSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameCa: z.string().optional(),
  items: z.array(menuItemSchema),
});
export type MenuSection = z.infer<typeof menuSectionSchema>;

export const menuSourceFileSchema = z.object({
  name: z.string(),
  mimeType: z.string(),
  url: z.string(),
});
export type MenuSourceFile = z.infer<typeof menuSourceFileSchema>;

export const menuDraftSchema = z.object({
  id: z.string(),
  editToken: z.string(),
  status: z.enum(["processing", "ready", "failed", "published"]),
  restaurantName: z.string().default(""),
  sourceLabel: z.string().default("Uploaded menu"),
  sourceUrl: z.string().url().optional(),
  sourceFiles: z.array(menuSourceFileSchema).default([]),
  sourceCapturedAt: z.string(),
  service: z.string().optional(),
  validOn: z.string().optional(),
  originalLanguage: z.string().default("unknown"),
  sections: z.array(menuSectionSchema).default([]),
  communityNotes: z.string().optional(),
  communityNotesCa: z.string().optional(),
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
    sourceUrl: true,
    service: true,
    validOn: true,
    originalLanguage: true,
    sections: true,
    communityNotes: true,
    communityNotesCa: true,
  })
  .partial();
export type MenuPatch = z.infer<typeof menuPatchSchema>;

export const dishFeedbackRequestSchema = z.object({
  verdict: dietVerdictSchema,
  rawNote: z.string().default(""),
  targetModification: z.enum(["vegan", "vegetarian"]).optional(),
});
export type DishFeedbackRequest = z.infer<typeof dishFeedbackRequestSchema>;

export const restaurantNotesRequestSchema = z.object({
  rawNotes: z.string().default(""),
});
export type RestaurantNotesRequest = z.infer<typeof restaurantNotesRequestSchema>;

export const restaurantCandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  websiteUrl: z.string().url().optional(),
  mapUrl: z.string().url(),
  provider: z.enum(["openstreetmap", "geoapify", "foursquare", "curated"]).default("openstreetmap"),
  openingHours: z.string().optional(),
  cuisine: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isVegan: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isOpenNow: z.boolean().optional(),
  rating: z.number().optional(),
  placeType: z.enum(["restaurant", "city", "locality"]).default("restaurant").optional(),
});
export type RestaurantCandidate = z.infer<typeof restaurantCandidateSchema>;

export const restaurantReviewSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  userId: z.string(),
  userName: z.string(),
  userAvatarUrl: z.string().url().optional(),
  leavesScore: z.number().int().min(1).max(5),
  comment: z.string().max(500).default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RestaurantReview = z.infer<typeof restaurantReviewSchema>;

export const restaurantReviewStatsSchema = z.object({
  averageLeaves: z.number(),
  totalReviews: z.number().int().nonnegative(),
  distribution: z.object({
    1: z.number().int().nonnegative(),
    2: z.number().int().nonnegative(),
    3: z.number().int().nonnegative(),
    4: z.number().int().nonnegative(),
    5: z.number().int().nonnegative(),
  }),
});
export type RestaurantReviewStats = z.infer<typeof restaurantReviewStatsSchema>;

export const createReviewRequestSchema = z.object({
  leavesScore: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().default(""),
  userName: z.string().min(1).max(60).optional(),
});
export type CreateReviewRequest = z.infer<typeof createReviewRequestSchema>;


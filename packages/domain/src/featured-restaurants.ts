/**
 * @file featured-restaurants.ts
 * @description Bundled static datasets of 100% verified vegan restaurants across cities (Barcelona, Girona, London, Berlin, etc.).
 * Provides instant offline and low-latency access to verified vegan venues.
 */

import type { RestaurantCandidate } from "./schemas.js";
import barcelonaData from "./data/featured/barcelona.json" with { type: "json" };
import gironaData from "./data/featured/girona.json" with { type: "json" };
import vicData from "./data/featured/vic.json" with { type: "json" };
import tarragonaData from "./data/featured/tarragona.json" with { type: "json" };
import manresaData from "./data/featured/manresa.json" with { type: "json" };
import londonData from "./data/featured/london.json" with { type: "json" };
import berlinData from "./data/featured/berlin.json" with { type: "json" };
import parisData from "./data/featured/paris.json" with { type: "json" };

export const FEATURED_RESTAURANTS_BARCELONA = barcelonaData as RestaurantCandidate[];
export const FEATURED_RESTAURANTS_GIRONA = gironaData as RestaurantCandidate[];
export const FEATURED_RESTAURANTS_VIC = vicData as RestaurantCandidate[];
export const FEATURED_RESTAURANTS_TARRAGONA = tarragonaData as RestaurantCandidate[];
export const FEATURED_RESTAURANTS_MANRESA = manresaData as RestaurantCandidate[];
export const FEATURED_RESTAURANTS_LONDON = londonData as RestaurantCandidate[];
export const FEATURED_RESTAURANTS_BERLIN = berlinData as RestaurantCandidate[];
export const FEATURED_RESTAURANTS_PARIS = parisData as RestaurantCandidate[];

export const FEATURED_RESTAURANTS: RestaurantCandidate[] = [
  ...FEATURED_RESTAURANTS_BARCELONA,
  ...FEATURED_RESTAURANTS_GIRONA,
  ...FEATURED_RESTAURANTS_VIC,
  ...FEATURED_RESTAURANTS_TARRAGONA,
  ...FEATURED_RESTAURANTS_MANRESA,
  ...FEATURED_RESTAURANTS_LONDON,
  ...FEATURED_RESTAURANTS_BERLIN,
  ...FEATURED_RESTAURANTS_PARIS,
];

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

export interface FeaturedCityHub {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  restaurants: RestaurantCandidate[];
}

export const FEATURED_CITY_HUBS: FeaturedCityHub[] = [
  {
    id: "barcelona",
    name: "Barcelona",
    latitude: 41.3879,
    longitude: 2.1699,
    restaurants: FEATURED_RESTAURANTS_BARCELONA,
  },
  {
    id: "girona",
    name: "Girona",
    latitude: 41.9794,
    longitude: 2.8214,
    restaurants: FEATURED_RESTAURANTS_GIRONA,
  },
  {
    id: "vic",
    name: "Vic",
    latitude: 41.9304,
    longitude: 2.2544,
    restaurants: FEATURED_RESTAURANTS_VIC,
  },
  {
    id: "tarragona",
    name: "Tarragona",
    latitude: 41.1189,
    longitude: 1.2445,
    restaurants: FEATURED_RESTAURANTS_TARRAGONA,
  },
  {
    id: "manresa",
    name: "Manresa",
    latitude: 41.7282,
    longitude: 1.8266,
    restaurants: FEATURED_RESTAURANTS_MANRESA,
  },
  {
    id: "london",
    name: "London",
    latitude: 51.5074,
    longitude: -0.1278,
    restaurants: FEATURED_RESTAURANTS_LONDON,
  },
  {
    id: "berlin",
    name: "Berlin",
    latitude: 52.5200,
    longitude: 13.4050,
    restaurants: FEATURED_RESTAURANTS_BERLIN,
  },
  {
    id: "paris",
    name: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    restaurants: FEATURED_RESTAURANTS_PARIS,
  },
];

/**
 * Snaps any coordinate to the closest major city hub with curated vegan dining spots.
 */
export function findClosestCityHub(latitude: number, longitude: number): FeaturedCityHub {
  const fallback = FEATURED_CITY_HUBS[0]!;
  let closest: FeaturedCityHub = fallback;
  let minDistance = Infinity;

  for (const hub of FEATURED_CITY_HUBS) {
    const dLat = ((hub.latitude - latitude) * Math.PI) / 180;
    const dLng = ((hub.longitude - longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((latitude * Math.PI) / 180) *
        Math.cos((hub.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (distKm < minDistance) {
      minDistance = distKm;
      closest = hub;
    }
  }

  return closest;
}


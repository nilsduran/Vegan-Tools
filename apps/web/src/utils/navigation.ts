import type { RestaurantCandidate } from "@vegan-tools/domain";

/**
 * Returns the best navigation URL for the restaurant:
 * - On Mobile devices: uses the standard `geo:lat,lng?q=Name` protocol so the native map app opens directly.
 * - On Desktop devices: opens Google Maps directions directly in a new tab.
 */
export function getDirectionsUrl(restaurant: RestaurantCandidate): string {
  const hasCoordinates =
    typeof restaurant.latitude === "number" &&
    typeof restaurant.longitude === "number" &&
    restaurant.latitude !== 0 &&
    restaurant.longitude !== 0;

  if (!hasCoordinates) {
    return (
      restaurant.mapUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${restaurant.name} ${restaurant.address}`,
      )}`
    );
  }

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

  if (isMobile) {
    return `geo:${restaurant.latitude},${restaurant.longitude}?q=${encodeURIComponent(restaurant.name)}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`;
}

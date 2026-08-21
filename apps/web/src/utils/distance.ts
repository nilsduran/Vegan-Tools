/**
 * Calculates the Haversine distance in kilometers between two coordinates.
 */
export function calculateDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance nicely:
 * - < 1 km: '350 m'
 * - >= 1 km: '1.4 km', '25 km'
 */
export function formatDistance(
  from?: { lat: number; lng: number },
  to?: { lat?: number; lng?: number },
): string | undefined {
  if (
    !from ||
    !to ||
    typeof to.lat !== "number" ||
    typeof to.lng !== "number" ||
    to.lat === 0 ||
    to.lng === 0
  ) {
    return undefined;
  }

  const distKm = calculateDistanceKm(from, { lat: to.lat, lng: to.lng });
  if (distKm < 1) {
    const meters = Math.round(distKm * 1000);
    return `${meters} m`;
  }
  if (distKm < 10) {
    return `${distKm.toFixed(1)} km`;
  }
  return `${Math.round(distKm)} km`;
}

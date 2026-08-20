export interface TransitEstimate {
  mode: "walking" | "driving";
  durationMinutes: number;
  distanceMeters: number;
  formattedDuration: string;
  formattedDistance: string;
}

// Haversine formula to compute great-circle distance in meters between two lat/lng points
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters / 50) * 50} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return "1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remMins = Math.round(minutes % 60);
  return remMins > 0 ? `${hours} h ${remMins} min` : `${hours} h`;
}

// Fetches street-level routing from OpenStreetMap OSRM with 1 single request
export async function getTransitEstimate(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<TransitEstimate> {
  const straightDistanceM = calculateHaversineDistance(
    from.lat,
    from.lng,
    to.lat,
    to.lng,
  );

  // Decision rule: if straight distance is <= 1.1 km, use walking; otherwise use driving
  const mode = straightDistanceM <= 1100 ? "walking" : "driving";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const osrmProfile = mode === "walking" ? "foot" : "car";
    const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const durationMinutes = Math.max(1, Math.round(route.duration / 60));
        const distanceMeters = Math.round(route.distance);
        return {
          mode,
          durationMinutes,
          distanceMeters,
          formattedDuration: formatDuration(durationMinutes),
          formattedDistance: formatDistance(distanceMeters),
        };
      }
    }
  } catch {
    // Fallback if OSRM network request times out or is offline
  }

  // Fallback estimates:
  // Walking: average urban speed 4.8 km/h (80 m/min)
  // Driving: average urban speed 28 km/h (466 m/min)
  const estimatedStreetMeters = straightDistanceM * 1.25; // 1.25 urban street factor
  const durationMinutes =
    mode === "walking"
      ? Math.max(1, Math.round(estimatedStreetMeters / 80))
      : Math.max(1, Math.round(estimatedStreetMeters / 466));

  return {
    mode,
    durationMinutes,
    distanceMeters: Math.round(estimatedStreetMeters),
    formattedDuration: formatDuration(durationMinutes),
    formattedDistance: formatDistance(estimatedStreetMeters),
  };
}

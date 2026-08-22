export interface Point {
  latitude: number;
  longitude: number;
  id: string;
}

export interface SingleMarkerItem<T extends Point> {
  type: "single";
  item: T;
  latitude: number;
  longitude: number;
}

export interface ClusterMarkerItem<T extends Point> {
  type: "cluster";
  id: string;
  items: T[];
  latitude: number;
  longitude: number;
  count: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export type ClusterResult<T extends Point> = SingleMarkerItem<T> | ClusterMarkerItem<T>;

export function clusterPoints<T extends Point>(
  items: T[],
  project: (lat: number, lng: number) => { x: number; y: number },
  radiusPixels = 55
): ClusterResult<T>[] {
  const validItems = items.filter(
    (item) =>
      typeof item.latitude === "number" &&
      typeof item.longitude === "number" &&
      Number.isFinite(item.latitude) &&
      Number.isFinite(item.longitude) &&
      !(item.latitude === 0 && item.longitude === 0)
  );

  if (validItems.length === 0) return [];

  const projectedPoints = validItems.map((item) => {
    const { x, y } = project(item.latitude, item.longitude);
    return { item, x, y };
  });

  const visited = new Set<string>();
  const results: ClusterResult<T>[] = [];

  for (let i = 0; i < projectedPoints.length; i++) {
    const current = projectedPoints[i];
    if (!current || visited.has(current.item.id)) continue;

    visited.add(current.item.id);
    const clusterItems: T[] = [current.item];
    let sumLat = current.item.latitude;
    let sumLng = current.item.longitude;
    let minLat = current.item.latitude;
    let maxLat = current.item.latitude;
    let minLng = current.item.longitude;
    let maxLng = current.item.longitude;

    for (let j = i + 1; j < projectedPoints.length; j++) {
      const neighbor = projectedPoints[j];
      if (!neighbor || visited.has(neighbor.item.id)) continue;

      const dx = current.x - neighbor.x;
      const dy = current.y - neighbor.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusPixels * radiusPixels) {
        visited.add(neighbor.item.id);
        clusterItems.push(neighbor.item);
        sumLat += neighbor.item.latitude;
        sumLng += neighbor.item.longitude;
        minLat = Math.min(minLat, neighbor.item.latitude);
        maxLat = Math.max(maxLat, neighbor.item.latitude);
        minLng = Math.min(minLng, neighbor.item.longitude);
        maxLng = Math.max(maxLng, neighbor.item.longitude);
      }
    }

    if (clusterItems.length === 1) {
      results.push({
        type: "single",
        item: current.item,
        latitude: current.item.latitude,
        longitude: current.item.longitude,
      });
    } else {
      const count = clusterItems.length;
      results.push({
        type: "cluster",
        id: `cluster-${clusterItems.map((it) => it.id).join("-")}`,
        items: clusterItems,
        latitude: sumLat / count,
        longitude: sumLng / count,
        count,
        bounds: { minLat, maxLat, minLng, maxLng },
      });
    }
  }

  return results;
}

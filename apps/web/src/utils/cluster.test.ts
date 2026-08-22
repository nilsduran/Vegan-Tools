import { describe, expect, it } from "vitest";
import { clusterPoints, type Point } from "./cluster";

describe("clusterPoints Utility", () => {
  it("returns empty array when given no items or invalid items", () => {
    expect(clusterPoints([], () => ({ x: 0, y: 0 }))).toEqual([]);

    const invalidItems: Point[] = [
      { id: "1", latitude: 0, longitude: 0 },
      { id: "2", latitude: NaN, longitude: 2.1 },
    ];
    expect(clusterPoints(invalidItems, () => ({ x: 0, y: 0 }))).toEqual([]);
  });

  it("keeps isolated points as single marker items", () => {
    const items: Point[] = [
      { id: "p1", latitude: 41.38, longitude: 2.16 },
      { id: "p2", latitude: 41.39, longitude: 2.18 },
    ];

    // Projection gives distance of 200px between points (greater than radius 55px)
    const project = (lat: number) => {
      if (lat === 41.38) return { x: 100, y: 100 };
      return { x: 300, y: 100 };
    };

    const results = clusterPoints(items, project, 55);
    expect(results).toHaveLength(2);
    expect(results[0]?.type).toBe("single");
    expect(results[1]?.type).toBe("single");
  });

  it("groups close points into a cluster with computed centroid and bounds", () => {
    const items: Point[] = [
      { id: "p1", latitude: 41.38, longitude: 2.16 },
      { id: "p2", latitude: 41.382, longitude: 2.162 },
      { id: "p3", latitude: 41.381, longitude: 2.161 },
    ];

    // Projection gives points all within 20px of each other (less than radius 55px)
    const project = (_lat: number, lng: number) => ({
      x: 100 + (lng - 2.16) * 1000,
      y: 100,
    });

    const results = clusterPoints(items, project, 55);
    expect(results).toHaveLength(1);

    const cluster = results[0];
    expect(cluster?.type).toBe("cluster");
    if (cluster?.type === "cluster") {
      expect(cluster.count).toBe(3);
      expect(cluster.items).toHaveLength(3);
      expect(cluster.latitude).toBeCloseTo((41.38 + 41.382 + 41.381) / 3, 5);
      expect(cluster.longitude).toBeCloseTo((2.16 + 2.162 + 2.161) / 3, 5);
      expect(cluster.bounds.minLat).toBe(41.38);
      expect(cluster.bounds.maxLat).toBe(41.382);
    }
  });

  it("correctly separates nearby points from distant points into mixed clusters and singles", () => {
    const items: Point[] = [
      { id: "p1", latitude: 41.38, longitude: 2.16 },
      { id: "p2", latitude: 41.381, longitude: 2.161 },
      { id: "distant", latitude: 41.50, longitude: 2.30 },
    ];

    const project = (lat: number) => {
      if (lat > 41.45) return { x: 900, y: 900 };
      return { x: 100, y: 100 };
    };

    const results = clusterPoints(items, project, 55);
    expect(results).toHaveLength(2);

    const cluster = results.find((r) => r.type === "cluster");
    const single = results.find((r) => r.type === "single");

    expect(cluster).toBeDefined();
    expect(single).toBeDefined();
    if (cluster && cluster.type === "cluster") {
      expect(cluster.count).toBe(2);
    }
    if (single && single.type === "single") {
      expect(single.item.id).toBe("distant");
    }
  });
});

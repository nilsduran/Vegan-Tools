import { describe, expect, it } from "vitest";
import {
  MemoryRestaurantVisitStore,
  type RestaurantVisitStore,
} from "./restaurant-visit-store.js";
import type { RestaurantCandidate, RestaurantVisitLog } from "@vegan-tools/domain";

describe("RestaurantVisitStore", () => {
  it("saves, lists, updates and deletes visit logs in memory store", async () => {
    const store: RestaurantVisitStore = new MemoryRestaurantVisitStore();

    // 1. Initial visits should be empty
    const initial = await store.getUserVisits("user-1");
    expect(initial).toHaveLength(0);

    // 2. Save a visit
    const visit1: RestaurantVisitLog = {
      id: "visit-1",
      userId: "user-1",
      restaurantId: "rest-101",
      restaurantName: "Vrutal",
      restaurantAddress: "Rambla Poblenou 16",
      rating: 4.5,
      visitDate: "2026-09-01",
      notes: "Loved the chickn burger!",
      dishesTried: ["Chickn Burger", "Loaded Fries"],
      createdAt: "2026-09-01T14:00:00Z",
      updatedAt: "2026-09-01T14:00:00Z",
    };

    const saved = await store.saveVisit(visit1);
    expect(saved.id).toBe("visit-1");

    const fetched = await store.getUserVisits("user-1");
    expect(fetched).toHaveLength(1);
    expect(fetched[0]?.restaurantName).toBe("Vrutal");
    expect(fetched[0]?.dishesTried).toEqual(["Chickn Burger", "Loaded Fries"]);

    // 3. Updating same visit
    const updatedVisit: RestaurantVisitLog = {
      ...visit1,
      rating: 5.0,
      notes: "Best vegan burger in town!",
    };
    await store.saveVisit(updatedVisit);

    const fetchedUpdated = await store.getUserVisits("user-1");
    expect(fetchedUpdated).toHaveLength(1);
    expect(fetchedUpdated[0]?.rating).toBe(5.0);
    expect(fetchedUpdated[0]?.notes).toBe("Best vegan burger in town!");

    // 4. Save second visit without date
    const visit2: RestaurantVisitLog = {
      id: "visit-2",
      userId: "user-1",
      restaurantId: "rest-102",
      restaurantName: "Roots Vegan",
      rating: 4.0,
      notes: "Quick lunch",
      dishesTried: ["Truffle Fries"],
      createdAt: "2026-09-02T13:00:00Z",
      updatedAt: "2026-09-02T13:00:00Z",
    };
    await store.saveVisit(visit2);

    const allVisits = await store.getUserVisits("user-1");
    expect(allVisits).toHaveLength(2);

    // 5. Delete visit
    const deleted = await store.deleteVisit("visit-1", "user-1");
    expect(deleted).toBe(true);

    const afterDelete = await store.getUserVisits("user-1");
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0]?.id).toBe("visit-2");
  });

  it("manages user Top 4 favorite restaurants", async () => {
    const store: RestaurantVisitStore = new MemoryRestaurantVisitStore();

    expect(await store.getUserTop4("user-2")).toEqual([]);

    const sampleRest: RestaurantCandidate = {
      id: "rest-vrutal",
      name: "Vrutal",
      address: "Barcelona",
      latitude: 41.38,
      longitude: 2.16,
      mapUrl: "https://openstreetmap.org",
      isVegan: true,
      provider: "curated",
    };

    await store.saveUserTop4("user-2", [sampleRest]);

    const top4 = await store.getUserTop4("user-2");
    expect(top4).toHaveLength(1);
    expect(top4[0]?.name).toBe("Vrutal");
  });
});

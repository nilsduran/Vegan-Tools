import { describe, expect, it } from "vitest";
import { MemoryVenueStore } from "./venue-store.js";

describe("VenueStore (System of Record & Tombstones)", () => {
  it("initializes with known featured restaurants and excludes tombstones", async () => {
    const store = new MemoryVenueStore();
    const rasoterra = await store.getVenue("rasoterra-bcn");
    expect(rasoterra).toBeUndefined();

    const isRasoterraTombstone = await store.isTombstone("rasoterra-bcn", "Rasoterra");
    expect(isRasoterraTombstone).toBe(true);

    const asante = await store.getVenue("asante-bcn");
    expect(asante).toBeDefined();
    expect(asante?.name).toBe("Asante");
    expect(asante?.status).toBe("verified_active");
  });

  it("marks a venue as permanently closed and prevents resurrection", async () => {
    const store = new MemoryVenueStore();
    const asante = await store.getVenue("asante-bcn");
    expect(asante).toBeDefined();

    // Mark as closed
    await store.markVenueClosed("asante-bcn", "auditor-1", "Owner retirement");

    // Must be gone from regular queries
    const closedAsante = await store.getVenue("asante-bcn");
    expect(closedAsante).toBeUndefined();

    // Must be recognized as tombstone
    const isTombstone = await store.isTombstone("asante-bcn");
    expect(isTombstone).toBe(true);

    // Attempting to modify or re-save throws error to prevent accidental resurrection
    await expect(
      store.saveVenue(
        {
          id: "asante-bcn",
          name: "Asante",
          address: "Some address",
          latitude: 41.37,
          longitude: 2.16,
          mapUrl: "https://example.com",
          provider: "curated",
          status: "verified_active",
          version: 2,
        },
        "crawler-bot",
        "EXTERNAL_SYNC",
      ),
    ).rejects.toThrow(/Cannot modify or resurrect permanently closed venue/);
  });

  it("searches active venues by query and excludes closed ones", async () => {
    const store = new MemoryVenueStore();
    const results = await store.searchVenues({ query: "Vrutal" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.name).toBe("Vrutal");

    const closedResults = await store.searchVenues({ query: "Rasoterra" });
    expect(closedResults).toHaveLength(0);
  });
});

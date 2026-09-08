// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  getDiaryLogs,
  saveVisitLog,
  deleteVisitLog,
  getRatingHistogram,
  getUserTop4,
  setUserTop4,
} from "./diary";

describe("Restaurant Diary & Favorites (Letterboxd-style)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves a visit log and returns it", () => {
    const log = saveVisitLog({
      restaurantId: "rest-1",
      restaurantName: "Roots Vegan",
      visitDate: "2026-09-08",
      rating: 4.5,
      notes: "Amazing beyond burger and sweet potato fries!",
      dishesTried: ["Roots Burger", "Truffle Fries"],
    });

    expect(log.restaurantName).toBe("Roots Vegan");
    expect(log.rating).toBe(4.5);
    expect(getDiaryLogs()).toHaveLength(1);
    expect(getDiaryLogs()[0]?.id).toBe(log.id);
  });

  it("enforces max 1 log per restaurant per calendar day by updating existing log", () => {
    const log1 = saveVisitLog({
      restaurantId: "rest-1",
      restaurantName: "Roots Vegan",
      visitDate: "2026-09-08",
      rating: 4.0,
      notes: "First note",
    });

    expect(getDiaryLogs()).toHaveLength(1);

    // Same day visit update
    const log2 = saveVisitLog({
      restaurantId: "rest-1",
      restaurantName: "Roots Vegan",
      visitDate: "2026-09-08",
      rating: 4.5,
      notes: "Updated note with dessert",
    });

    const logs = getDiaryLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.id).toBe(log1.id);
    expect(logs[0]?.rating).toBe(4.5);
    expect(logs[0]?.notes).toBe("Updated note with dessert");
  });

  it("allows logging visits on different days for the same restaurant", () => {
    saveVisitLog({
      restaurantId: "rest-1",
      restaurantName: "Roots Vegan",
      visitDate: "2026-09-01",
      rating: 4.0,
    });

    saveVisitLog({
      restaurantId: "rest-1",
      restaurantName: "Roots Vegan",
      visitDate: "2026-09-08",
      rating: 5.0,
    });

    const logs = getDiaryLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0]?.visitDate).toBe("2026-09-08");
    expect(logs[1]?.visitDate).toBe("2026-09-01");
  });

  it("deletes a visit log by id", () => {
    const log = saveVisitLog({
      restaurantId: "rest-1",
      restaurantName: "Santoni",
      visitDate: "2026-09-08",
      rating: 4.5,
    });

    expect(getDiaryLogs()).toHaveLength(1);
    deleteVisitLog(log.id);
    expect(getDiaryLogs()).toHaveLength(0);
  });

  it("calculates half-star rating histogram correctly", () => {
    const logs = [
      { id: "1", restaurantId: "r1", restaurantName: "R1", visitDate: "2026-09-01", rating: 5.0, createdAt: "", updatedAt: "" },
      { id: "2", restaurantId: "r2", restaurantName: "R2", visitDate: "2026-09-02", rating: 5.0, createdAt: "", updatedAt: "" },
      { id: "3", restaurantId: "r3", restaurantName: "R3", visitDate: "2026-09-03", rating: 4.3, createdAt: "", updatedAt: "" }, // rounds to 4.5
      { id: "4", restaurantId: "r4", restaurantName: "R4", visitDate: "2026-09-04", rating: 3.5, createdAt: "", updatedAt: "" },
      { id: "5", restaurantId: "r5", restaurantName: "R5", visitDate: "2026-09-05", rating: 1.0, createdAt: "", updatedAt: "" },
    ];

    const hist = getRatingHistogram(logs);
    expect(hist).toHaveLength(10); // 0.5 to 5.0 (10 bins)

    const bin5 = hist.find((b) => b.score === 5.0);
    const bin45 = hist.find((b) => b.score === 4.5);
    const bin35 = hist.find((b) => b.score === 3.5);
    const bin1 = hist.find((b) => b.score === 1.0);
    const bin2 = hist.find((b) => b.score === 2.0);

    expect(bin5?.count).toBe(2);
    expect(bin5?.percentage).toBe(100); // 2 is max
    expect(bin45?.count).toBe(1);
    expect(bin45?.percentage).toBe(50);
    expect(bin35?.count).toBe(1);
    expect(bin1?.count).toBe(1);
    expect(bin2?.count).toBe(0);
    expect(bin2?.percentage).toBe(0);
  });

  it("manages user top 4 favorites (clamped to max 4)", () => {
    expect(getUserTop4()).toEqual([]);

    setUserTop4(["r1", "r2", "r3", "r4", "r5"]);
    expect(getUserTop4()).toEqual(["r1", "r2", "r3", "r4"]);

    setUserTop4(["r1", "r3"]);
    expect(getUserTop4()).toEqual(["r1", "r3"]);
  });
});

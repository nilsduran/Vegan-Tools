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
  const testUserId = "user-test-123";

  beforeEach(() => {
    localStorage.clear();
  });

  it("requires an authenticated userId to save logs", () => {
    expect(() =>
      saveVisitLog({
        userId: "",
        restaurantId: "rest-1",
        restaurantName: "Roots Vegan",
        rating: 4.5,
      }),
    ).toThrow(/Authentication required/i);
  });

  it("returns empty logs if no userId is provided", () => {
    expect(getDiaryLogs()).toEqual([]);
    expect(getDiaryLogs(undefined)).toEqual([]);
  });

  it("saves a visit log and returns it for the authenticated user", () => {
    const log = saveVisitLog({
      userId: testUserId,
      restaurantId: "rest-1",
      restaurantName: "Roots Vegan",
      visitDate: "2026-09-08",
      rating: 4.5,
      notes: "Amazing beyond burger and sweet potato fries!",
      dishesTried: ["Roots Burger", "Truffle Fries"],
    });

    expect(log.userId).toBe(testUserId);
    expect(log.restaurantName).toBe("Roots Vegan");
    expect(log.rating).toBe(4.5);
    expect(getDiaryLogs(testUserId)).toHaveLength(1);
    expect(getDiaryLogs(testUserId)[0]?.id).toBe(log.id);

    // Another user cannot see this user's logs
    expect(getDiaryLogs("other-user")).toHaveLength(0);
  });

  it("supports dateless visits without mandatory date", () => {
    const logNoDate1 = saveVisitLog({
      userId: testUserId,
      restaurantId: "rest-1",
      restaurantName: "Roots Vegan",
      rating: 4.0,
      notes: "Dateless visit 1",
    });

    const logNoDate2 = saveVisitLog({
      userId: testUserId,
      restaurantId: "rest-1",
      restaurantName: "Roots Vegan",
      rating: 5.0,
      notes: "Dateless visit 2",
    });

    const logs = getDiaryLogs(testUserId);
    expect(logs).toHaveLength(2);
    expect(logs.some((l) => l.id === logNoDate1.id)).toBe(true);
    expect(logs.some((l) => l.id === logNoDate2.id)).toBe(true);
  });

  it("enforces max 1 log per restaurant per calendar day when date is specified", () => {
    const log1 = saveVisitLog({
      userId: testUserId,
      restaurantId: "rest-1",
      restaurantName: "Roots Vegan",
      visitDate: "2026-09-08",
      rating: 4.0,
      notes: "First note",
    });

    expect(getDiaryLogs(testUserId)).toHaveLength(1);

    // Same day visit update
    const log2 = saveVisitLog({
      userId: testUserId,
      restaurantId: "rest-1",
      restaurantName: "Roots Vegan",
      visitDate: "2026-09-08",
      rating: 4.5,
      notes: "Updated note with dessert",
    });

    const logs = getDiaryLogs(testUserId);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.id).toBe(log1.id);
    expect(logs[0]?.rating).toBe(4.5);
    expect(logs[0]?.notes).toBe("Updated note with dessert");
  });

  it("allows logging visits on different days for the same restaurant", () => {
    saveVisitLog({
      userId: testUserId,
      restaurantId: "rest-1",
      restaurantName: "Roots Vegan",
      visitDate: "2026-09-01",
      rating: 4.0,
    });

    saveVisitLog({
      userId: testUserId,
      restaurantId: "rest-1",
      restaurantName: "Roots Vegan",
      visitDate: "2026-09-08",
      rating: 5.0,
    });

    const logs = getDiaryLogs(testUserId);
    expect(logs).toHaveLength(2);
    expect(logs[0]?.visitDate).toBe("2026-09-08");
    expect(logs[1]?.visitDate).toBe("2026-09-01");
  });

  it("deletes a visit log by id for authenticated user", () => {
    const log = saveVisitLog({
      userId: testUserId,
      restaurantId: "rest-1",
      restaurantName: "Santoni",
      visitDate: "2026-09-08",
      rating: 4.5,
    });

    expect(getDiaryLogs(testUserId)).toHaveLength(1);
    deleteVisitLog(log.id, testUserId);
    expect(getDiaryLogs(testUserId)).toHaveLength(0);
  });

  it("calculates half-star rating histogram correctly", () => {
    const logs = [
      { id: "1", userId: testUserId, restaurantId: "r1", restaurantName: "R1", visitDate: "2026-09-01", rating: 5.0, createdAt: "", updatedAt: "" },
      { id: "2", userId: testUserId, restaurantId: "r2", restaurantName: "R2", visitDate: "2026-09-02", rating: 5.0, createdAt: "", updatedAt: "" },
      { id: "3", userId: testUserId, restaurantId: "r3", restaurantName: "R3", visitDate: "2026-09-03", rating: 4.3, createdAt: "", updatedAt: "" }, // rounds to 4.5
      { id: "4", userId: testUserId, restaurantId: "r4", restaurantName: "R4", visitDate: "2026-09-04", rating: 3.5, createdAt: "", updatedAt: "" },
      { id: "5", userId: testUserId, restaurantId: "r5", restaurantName: "R5", visitDate: "2026-09-05", rating: 1.0, createdAt: "", updatedAt: "" },
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

  it("manages user top 4 favorites scoped to user", () => {
    expect(getUserTop4(testUserId)).toEqual([]);

    setUserTop4(["r1", "r2", "r3", "r4", "r5"], testUserId);
    expect(getUserTop4(testUserId)).toEqual(["r1", "r2", "r3", "r4"]);

    setUserTop4(["r1", "r3"], testUserId);
    expect(getUserTop4(testUserId)).toEqual(["r1", "r3"]);

    expect(getUserTop4("other-user")).toEqual([]);
  });
});

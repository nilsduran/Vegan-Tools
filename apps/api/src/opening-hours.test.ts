import { describe, expect, it } from "vitest";
import { evaluateOpeningHours } from "./opening-hours.js";

describe("evaluateOpeningHours", () => {
  it("handles 24/7 and simple open/closed strings", () => {
    expect(evaluateOpeningHours("24/7")).toBe(true);
    expect(evaluateOpeningHours("open")).toBe(true);
    expect(evaluateOpeningHours("closed")).toBe(false);
    expect(evaluateOpeningHours("off")).toBe(false);
    expect(evaluateOpeningHours("")).toBeUndefined();
    expect(evaluateOpeningHours(undefined)).toBeUndefined();
  });

  it("correctly evaluates daytime intervals on matching day and afternoon break", () => {
    // Wednesday 13:30 (Day 3 - Lunch time)
    const wednesdayLunch = new Date("2026-08-26T13:30:00");
    expect(evaluateOpeningHours("Mo-Fr 12:00-16:00, 20:00-23:30", wednesdayLunch)).toBe(true);

    // Wednesday 18:10 (Afternoon break between lunch and dinner in Spain/Catalonia)
    const wednesdayAfternoonBreak = new Date("2026-08-26T18:10:00");
    expect(evaluateOpeningHours("Mo-Fr 13:00-16:00, 20:00-23:30", wednesdayAfternoonBreak)).toBe(false);

    // Wednesday 21:00 (Dinner time)
    const wednesdayDinner = new Date("2026-08-26T21:00:00");
    expect(evaluateOpeningHours("Mo-Fr 13:00-16:00, 20:00-23:30", wednesdayDinner)).toBe(true);

    // Sunday (Day 0) when only Mo-Fr open
    const sundayLunch = new Date("2026-08-30T13:30:00");
    expect(evaluateOpeningHours("Mo-Fr 12:00-16:00, 20:00-23:30", sundayLunch)).toBeUndefined();
  });

  it("handles Catalan and Spanish day names and ranges", () => {
    // Wednesday 14:00 (Catalan: Dimecres, Dl-Dv)
    const wednesdayLunch = new Date("2026-08-26T14:00:00");
    expect(evaluateOpeningHours("Dl-Dv 13:00-16:00, 20:00-23:30", wednesdayLunch)).toBe(true);

    // Sunday 14:00 (Spanish: Domingo, Lun-Dom)
    const sundayLunch = new Date("2026-08-30T14:00:00");
    expect(evaluateOpeningHours("Lun-Dom 12:00-23:30", sundayLunch)).toBe(true);
  });

  it("handles Daily, Everyday and 12h AM/PM formats", () => {
    // Saturday 15:00 (3:00 PM)
    const saturdayAfternoon = new Date("2026-08-29T15:00:00");
    expect(evaluateOpeningHours("Daily 11:30 AM - 11:00 PM", saturdayAfternoon)).toBe(true);

    // Saturday 23:30 (11:30 PM - after close)
    const saturdayNight = new Date("2026-08-29T23:30:00");
    expect(evaluateOpeningHours("Daily 11:30 AM - 11:00 PM", saturdayNight)).toBe(false);
  });

  it("handles overnight hours that cross midnight", () => {
    // Friday night 23:00 (Day 5)
    const fridayNight = new Date("2026-08-28T23:00:00");
    const overnightSchedule = "Fr-Sa 20:00-02:00";
    expect(evaluateOpeningHours(overnightSchedule, fridayNight)).toBe(true);

    // Saturday early morning 01:30 (technically Saturday Day 6, from Friday shift)
    const saturdayEarlyMorning = new Date("2026-08-29T01:30:00");
    expect(evaluateOpeningHours(overnightSchedule, saturdayEarlyMorning)).toBe(true);

    // Saturday early morning 04:00 (after close)
    const saturdayLateNight = new Date("2026-08-29T04:00:00");
    expect(evaluateOpeningHours(overnightSchedule, saturdayLateNight)).toBe(false);
  });
});

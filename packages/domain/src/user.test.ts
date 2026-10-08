import { describe, expect, it } from "vitest";
import {
  normalizeUsername,
  validateUsername,
  isUsernameReserved,
} from "./user.js";

describe("User handle validation & reservation", () => {
  it("normalizes handles properly", () => {
    expect(normalizeUsername("@nils")).toBe("nils");
    expect(normalizeUsername("  Carla_Vegan  ")).toBe("Carla_Vegan");
  });

  it("reserves 'nils' and 'Nils' exclusively for nilsdula@gmail.com", () => {
    // Other users or undefined email must be rejected
    expect(isUsernameReserved("nils")).toBe(true);
    expect(isUsernameReserved("Nils")).toBe(true);
    expect(isUsernameReserved("NILS")).toBe(true);
    expect(isUsernameReserved("nils", "stranger@example.com")).toBe(true);
    expect(validateUsername("nils").valid).toBe(false);
    expect(validateUsername("Nils").valid).toBe(false);
    expect(validateUsername("nils", { email: "other@gmail.com" }).valid).toBe(false);
    expect(validateUsername("Nils", { email: "other@gmail.com" }).error).toBe("This username is reserved.");

    // Nils with his verified email is allowed
    expect(isUsernameReserved("nils", "nilsdula@gmail.com")).toBe(false);
    expect(isUsernameReserved("Nils", "nilsdula@gmail.com")).toBe(false);
    expect(isUsernameReserved("Nils", "NILSDULA@GMAIL.COM")).toBe(false);
    expect(validateUsername("nils", { email: "nilsdula@gmail.com" }).valid).toBe(true);
    expect(validateUsername("Nils", { email: "nilsdula@gmail.com" }).valid).toBe(true);
  });

  it("blocks system reserved names", () => {
    expect(validateUsername("admin").valid).toBe(false);
    expect(validateUsername("vegantools").valid).toBe(false);
    expect(validateUsername("vegan_tool").valid).toBe(false);
  });

  it("accepts valid general usernames", () => {
    expect(validateUsername("carla_bcn").valid).toBe(true);
    expect(validateUsername("jordi.veg").valid).toBe(true);
  });
});

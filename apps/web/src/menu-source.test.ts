import { describe, expect, it } from "vitest";
import { isPresentableMenuSource } from "./menu-source.js";

describe("menu source presentation", () => {
  it("shows PDFs and images but hides scraped text or HTML", () => {
    expect(isPresentableMenuSource("application/pdf")).toBe(true);
    expect(isPresentableMenuSource("image/jpeg")).toBe(true);
    expect(isPresentableMenuSource("text/plain")).toBe(false);
    expect(isPresentableMenuSource("text/html")).toBe(false);
  });
});

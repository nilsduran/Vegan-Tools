// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { setLanguage } from "../i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  afterEach(() => {
    cleanup();
    setLanguage("en");
  });

  it("switches the language and remembers it without an account", () => {
    setLanguage("en");
    render(<LanguageSwitcher />);
    expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Català" }));

    expect(screen.getByRole("button", { name: "Català" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("group", { name: "Idioma" })).toBeTruthy();
    expect(localStorage.getItem("vegan-tools-language")).toBe("ca");
  });
});

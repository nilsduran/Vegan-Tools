// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BottomSheet } from "./BottomSheet";

describe("BottomSheet Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });
  it("renders header and content properly", () => {
    const handleSnapChange = vi.fn();
    render(
      <BottomSheet
        snapPoint="half"
        onSnapChange={handleSnapChange}
        header={<div>Search Header</div>}
      >
        <div>Restaurant List Content</div>
      </BottomSheet>
    );

    expect(screen.getByText("Search Header")).toBeDefined();
    expect(screen.getByText("Restaurant List Content")).toBeDefined();
    expect(screen.getByRole("complementary", { name: /search restaurants|cerca restaurants/i })).toBeDefined();
  });

  it("cycles snap points on handle bar click", () => {
    const handleSnapChange = vi.fn();
    const { rerender } = render(
      <BottomSheet
        snapPoint="collapsed"
        onSnapChange={handleSnapChange}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </BottomSheet>
    );

    const handleBtn = screen.getByRole("button", { name: /open panel|expand panel|obre el panell|expandeix el panell/i });
    fireEvent.click(handleBtn);
    expect(handleSnapChange).toHaveBeenCalledWith("half");

    // From half -> expanded
    rerender(
      <BottomSheet
        snapPoint="half"
        onSnapChange={handleSnapChange}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </BottomSheet>
    );
    fireEvent.click(handleBtn);
    expect(handleSnapChange).toHaveBeenCalledWith("expanded");

    // From expanded -> half
    rerender(
      <BottomSheet
        snapPoint="expanded"
        onSnapChange={handleSnapChange}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </BottomSheet>
    );
    fireEvent.click(handleBtn);
    expect(handleSnapChange).toHaveBeenCalledWith("half");
  });

  it("handles keyboard ArrowUp and ArrowDown navigation", () => {
    const handleSnapChange = vi.fn();
    const { rerender } = render(
      <BottomSheet
        snapPoint="collapsed"
        onSnapChange={handleSnapChange}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </BottomSheet>
    );

    const handleBtn = screen.getByRole("button", { name: /open panel|expand panel|obre el panell|expandeix el panell/i });
    fireEvent.keyDown(handleBtn, { key: "ArrowUp" });
    expect(handleSnapChange).toHaveBeenCalledWith("half");

    rerender(
      <BottomSheet
        snapPoint="half"
        onSnapChange={handleSnapChange}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </BottomSheet>
    );
    fireEvent.keyDown(handleBtn, { key: "ArrowDown" });
    expect(handleSnapChange).toHaveBeenCalledWith("collapsed");
  });

  it("handles touch swipe gesture upwards", () => {
    const handleSnapChange = vi.fn();
    render(
      <BottomSheet
        snapPoint="half"
        onSnapChange={handleSnapChange}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </BottomSheet>
    );

    const handleBtn = screen.getByRole("button", { name: /open panel|expand panel|obre el panell|expandeix el panell/i });

    // Swipe up: start at y=400, end at y=300 (deltaY = -100)
    fireEvent.touchStart(handleBtn, {
      touches: [{ clientY: 400 }],
    });
    fireEvent.touchMove(handleBtn, {
      touches: [{ clientY: 300 }],
    });
    fireEvent.touchEnd(handleBtn, {
      changedTouches: [{ clientY: 300 }],
    });

    expect(handleSnapChange).toHaveBeenCalledWith("expanded");
  });

  it("handles touch swipe gesture downwards", () => {
    const handleSnapChange = vi.fn();
    render(
      <BottomSheet
        snapPoint="half"
        onSnapChange={handleSnapChange}
        header={<div>Header</div>}
      >
        <div>Content</div>
      </BottomSheet>
    );

    const handleBtn = screen.getByRole("button", { name: /open panel|expand panel|obre el panell|expandeix el panell/i });

    // Swipe down: start at y=300, end at y=400 (deltaY = +100)
    fireEvent.touchStart(handleBtn, {
      touches: [{ clientY: 300 }],
    });
    fireEvent.touchMove(handleBtn, {
      touches: [{ clientY: 400 }],
    });
    fireEvent.touchEnd(handleBtn, {
      changedTouches: [{ clientY: 400 }],
    });

    expect(handleSnapChange).toHaveBeenCalledWith("collapsed");
  });
});

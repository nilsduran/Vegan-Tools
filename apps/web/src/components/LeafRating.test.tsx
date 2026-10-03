// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { LeafRating } from "./LeafRating";

describe("LeafRating Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders 5 leaf slots by default", () => {
    render(<LeafRating value={0} />);
    const slots = screen.getAllByTestId(/^leaf-slot-/);
    expect(slots).toHaveLength(5);
  });

  it("renders 4 full leaves and 1 empty leaf for score 4.0", () => {
    const { container } = render(<LeafRating value={4.0} />);
    const paths = container.querySelectorAll("path[fill='#16a34a']");
    expect(paths.length).toBe(4);
  });

  it("renders 3 full leaves and 1 half leaf for score 3.5", () => {
    const { container } = render(<LeafRating value={3.5} />);
    const fullPaths = container.querySelectorAll("path[fill='#16a34a']");
    expect(fullPaths.length).toBe(3);

    const halfPaths = container.querySelectorAll("path[fill*='url(#leaf-grad']");
    expect(halfPaths.length).toBe(1);
  });

  it("handles left half and right half clicks in interactive mode", () => {
    const handleChange = vi.fn();
    const { getByTestId } = render(<LeafRating value={0} interactive onChange={handleChange} />);

    const slot2 = getByTestId("leaf-slot-2");
    slot2.getBoundingClientRect = () => ({
      left: 100,
      right: 140,
      top: 50,
      bottom: 90,
      width: 40,
      height: 40,
      x: 100,
      y: 50,
      toJSON: () => {},
    });

    fireEvent.click(slot2, { clientX: 110 });
    expect(handleChange).toHaveBeenCalledWith(2.5);

    fireEvent.click(slot2, { clientX: 130 });
    expect(handleChange).toHaveBeenCalledWith(3.0);
  });

  it("supports keyboard arrow navigation", () => {
    const handleChange = vi.fn();
    const { container } = render(<LeafRating value={3.0} interactive onChange={handleChange} />);
    const containerEl = container.querySelector(".leaf-rating-container");
    expect(containerEl).not.toBeNull();

    fireEvent.keyDown(containerEl!, { key: "ArrowRight" });
    expect(handleChange).toHaveBeenCalledWith(3.5);

    fireEvent.keyDown(containerEl!, { key: "ArrowLeft" });
    expect(handleChange).toHaveBeenCalledWith(2.5);
  });
});

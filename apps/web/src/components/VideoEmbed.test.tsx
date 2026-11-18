// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VideoEmbed } from "./VideoEmbed";

describe("VideoEmbed", () => {
  afterEach(cleanup);

  it("requests nothing from YouTube until the viewer presses play", () => {
    const { container } = render(<VideoEmbed videoId="abc123" title="A talk" />);
    expect(container.querySelector("iframe")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /A talk/ }));
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe("https://www.youtube-nocookie.com/embed/abc123?autoplay=1");
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A reader that, like ZBar did, throws on formats it does not know: the
// detector must only ask for supported formats.
const ZBAR_FORMATS = ["codabar", "code_39", "code_93", "code_128", "ean_8", "ean_13", "itf", "qr_code", "upc_a", "upc_e"];
const constructedWith: string[][] = [];

vi.mock("zxing-wasm/reader/zxing_reader.wasm?url", () => ({ default: "/zxing_reader.wasm" }));
vi.mock("barcode-detector/ponyfill", () => ({
  prepareZXingModule: vi.fn(),
  BarcodeDetector: class {
    static async getSupportedFormats() {
      return ZBAR_FORMATS;
    }
    constructor({ formats }: { formats: string[] }) {
      const unsupported = formats.filter((format) => !ZBAR_FORMATS.includes(format));
      if (unsupported.length) throw new TypeError(`Unsupported barcode format(s): ${unsupported.join(", ")}`);
      constructedWith.push(formats);
    }
    async detect() {
      return [];
    }
  },
}));

import { BarcodeCamera, createBarcodeDetector, PHOTO_BARCODE_FORMATS } from "./BarcodeCamera";

const fakeStream = () => ({ getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream;

/** A phone's rear camera: it can zoom and focus continuously. */
function phoneStream(applyConstraints: (constraints: MediaTrackConstraints) => Promise<void>) {
  const track = {
    stop: vi.fn(),
    applyConstraints,
    getCapabilities: () => ({ zoom: { min: 1, max: 8 }, focusMode: ["continuous", "manual"] }),
    getSettings: () => ({ facingMode: "environment" }),
  };
  return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
}

describe("BarcodeCamera without a native BarcodeDetector (iPhone, Firefox, Chrome on Windows)", () => {
  beforeEach(() => {
    constructedWith.length = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream()) },
    });
    delete (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("asks the reader only for the formats it supports", async () => {
    await createBarcodeDetector();
    expect(constructedWith[0]).toEqual(expect.arrayContaining(["ean_13", "qr_code"]));
    expect(constructedWith[0]).not.toContain("aztec");
    expect(constructedWith[0]).not.toContain("data_matrix");
    expect(constructedWith[0]).not.toContain("pdf417");
  });

  it("searches live frames only for the cheap formats, and photos for more", async () => {
    await createBarcodeDetector();
    // Data Matrix triples the time per frame (scripts/bench-barcode-formats.ts).
    expect(constructedWith[0]).not.toContain("codabar");
    expect(constructedWith[0]).toEqual(expect.arrayContaining(["ean_13", "upc_a", "qr_code", "code_128"]));
    await createBarcodeDetector(PHOTO_BARCODE_FORMATS);
    expect(constructedWith[1]).toEqual(expect.arrayContaining(["codabar", "itf", "ean_13"]));
  });

  it("zooms a little where the camera allows it, so the code stays in focus", async () => {
    const applyConstraints = vi.fn(async () => {});
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(phoneStream(applyConstraints));
    render(<BarcodeCamera onDetected={vi.fn()} />);
    await waitFor(() => expect(applyConstraints).toHaveBeenCalledWith({ advanced: [{ zoom: 1.5 }] }));
    expect(applyConstraints).toHaveBeenCalledWith({ advanced: [{ focusMode: "continuous" }] });
  });

  it("has a shutter only when the page wants photos", async () => {
    const { unmount } = render(<BarcodeCamera onDetected={vi.fn()} />);
    await waitFor(() => expect(constructedWith).toHaveLength(1));
    expect(screen.queryByRole("button", { name: "Take a photo" })).toBeNull();
    unmount();
    render(<BarcodeCamera onDetected={vi.fn()} onPhoto={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Take a photo" })).toBeTruthy();
  });

  it("shows the live camera instead of a permission error", async () => {
    render(<BarcodeCamera onDetected={vi.fn()} />);
    await waitFor(() => expect(constructedWith).toHaveLength(1));
    expect(screen.queryByText(/Camera access is unavailable/)).toBeNull();
    expect(screen.getByLabelText("Camera")).toBeInstanceOf(HTMLVideoElement);
  });

  it("offers permission help only when the camera is really denied", async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
      new DOMException("denied", "NotAllowedError"),
    );
    render(<BarcodeCamera onDetected={vi.fn()} />);
    expect(await screen.findByText(/Camera access is unavailable/)).toBeTruthy();
    expect(screen.getByText("How to enable camera")).toBeTruthy();
  });
});

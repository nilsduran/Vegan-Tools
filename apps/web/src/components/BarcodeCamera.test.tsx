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

import { BarcodeCamera, createBarcodeDetector } from "./BarcodeCamera";

const fakeStream = () => ({ getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream;

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

  it("shows the live camera instead of a permission error", async () => {
    render(<BarcodeCamera onDetected={vi.fn()} />);
    await waitFor(() => expect(constructedWith).toHaveLength(1));
    expect(screen.queryByText(/Camera access is unavailable/)).toBeNull();
    expect(screen.getByLabelText("Barcode")).toBeInstanceOf(HTMLVideoElement);
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

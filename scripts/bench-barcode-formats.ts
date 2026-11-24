/**
 * @file bench-barcode-formats.ts
 * @description What searching fewer barcode formats changes: read rate on degraded
 * webcam frames, decode time per frame (how long the page is blocked when decoding
 * runs on the main thread) and false reads on frames without any code.
 * The options mirror the barcode-detector ponyfill, which only sets the formats.
 *
 *   npx tsx scripts/bench-barcode-formats.ts
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { prepareZXingModule, readBarcodes, type ReaderOptions } from "zxing-wasm/reader";
import { SCANNED_GTIN } from "../e2e/support/barcode-video.ts";
import { type Frame, rng, toImageData, webcamFrame } from "./support/synthetic-barcode.ts";

const require = createRequire(import.meta.url);
prepareZXingModule({ overrides: { wasmBinary: readFileSync(require.resolve("zxing-wasm/reader/zxing_reader.wasm")).buffer as ArrayBuffer } });

const ALL = ["Aztec", "Code128", "Code39", "Code93", "Codabar", "DataMatrix", "EAN13", "EAN8", "ITF", "PDF417", "QRCode", "UPCA", "UPCE"];
const REDUCED = ["EAN13", "EAN8", "UPCA", "UPCE", "QRCode", "DataMatrix", "Code128"];
const sets = {
  [`all ${ALL.length} formats`]: ALL,
  [`reduced ${REDUCED.length}`]: REDUCED,
  "EAN/UPC + QR": ["EAN13", "EAN8", "UPCA", "UPCE", "QRCode"],
  "EAN/UPC + QR + Code128": ["EAN13", "EAN8", "UPCA", "UPCE", "QRCode", "Code128"],
  "EAN/UPC + QR + DataMatrix": ["EAN13", "EAN8", "UPCA", "UPCE", "QRCode", "DataMatrix"],
  "EAN/UPC only": ["EAN13", "EAN8", "UPCA", "UPCE"],
  "QR only": ["QRCode"],
} as Record<string, string[]>;

const options = (formats: string[]) => ({ textMode: "Plain", formats } as unknown as Partial<ReaderOptions>);

/** Frames without a code: noise, gradients and stripes (fabric, shelves, text lines). */
function noCodeFrame(seed: number, width: number, height: number): Frame {
  const random = rng(seed);
  const luma = new Float32Array(width * height);
  const kind = seed % 3;
  const stripes = Array.from({ length: 200 }, () => random());
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const noise = (random() - 0.5) * 0.3;
      const base = kind === 0 ? 0.5 : kind === 1 ? x / width : stripes[Math.floor((x / width) * stripes.length)]! > 0.5 ? 0.2 : 0.85;
      luma[y * width + x] = base + noise;
    }
  }
  return { width, height, luma };
}

const conditions: Array<[number, number, number]> = [];
for (const px of [1.5, 2, 3]) for (const blur of [0.8, 1.5, 2.5]) for (const noise of [0.03, 0.08]) conditions.push([px, blur, noise]);

for (const [name, formats] of Object.entries(sets)) {
  let reads = 0;
  let total = 0;
  for (const [px, blur, noise] of conditions) {
    for (let seed = 1; seed <= 3; seed += 1) {
      const found = await readBarcodes(toImageData(webcamFrame(px, blur, noise, 0.6, seed * 7919 + px * 100)), options(formats));
      total += 1;
      if (found.some((result) => result.text === SCANNED_GTIN)) reads += 1;
    }
  }

  const timing: string[] = [];
  for (const [width, height] of [[640, 480], [1920, 1080]] as const) {
    const frames = [webcamFrame(2, 1.5, 0.05, 0.6, 3, width, height), noCodeFrame(4, width, height), noCodeFrame(5, width, height)].map(toImageData);
    await readBarcodes(frames[0]!, options(formats)); // warm-up
    const started = performance.now();
    for (let round = 0; round < 3; round += 1) for (const frame of frames) await readBarcodes(frame, options(formats));
    timing.push(`${width}x${height} ${((performance.now() - started) / (frames.length * 3)).toFixed(0)} ms`);
  }

  let falseReads = 0;
  const falseSamples: string[] = [];
  for (let seed = 1; seed <= 60; seed += 1) {
    const found = await readBarcodes(toImageData(noCodeFrame(seed * 31, 640, 480)), options(formats));
    if (found.length > 0) {
      falseReads += 1;
      falseSamples.push(`${found[0]!.format}:${found[0]!.text.slice(0, 12)}`);
    }
  }

  console.log(`${name.padEnd(26)} EAN read ${reads}/${total}  per frame ${timing.join(", ")}  false reads ${falseReads}/60 ${falseSamples.slice(0, 4).join(" ")}`);
}

/**
 * @file read-frame.ts
 * @description Runs the barcode reader on a real camera frame (PNG or JPEG) with the
 * scanner's settings and variations, to see why a code is or is not read.
 *
 *   npx tsx scripts/read-frame.ts path/to/frame.png
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { prepareZXingModule, readBarcodes, type ReaderOptions } from "zxing-wasm/reader";

const require = createRequire(import.meta.url);
prepareZXingModule({ overrides: { wasmBinary: readFileSync(require.resolve("zxing-wasm/reader/zxing_reader.wasm")).buffer as ArrayBuffer } });

const file = process.argv[2];
if (!file) throw new Error("Usage: npx tsx scripts/read-frame.ts frame.png");
const image = new Uint8Array(readFileSync(file));

const LIVE = ["Code128", "EAN13", "EAN8", "QRCode", "UPCA", "UPCE"];
const ALL = ["Aztec", "Code128", "Code39", "Code93", "Codabar", "DataMatrix", "EAN13", "EAN8", "ITF", "PDF417", "QRCode", "UPCA", "UPCE"];
// What the barcode-detector ponyfill passes: only textMode and formats.
const ponyfill = (formats: string[]) => ({ textMode: "Plain", formats }) as unknown as Partial<ReaderOptions>;

const configs: Array<[string, Partial<ReaderOptions>]> = [
  ["scanner live (ponyfill, 6 formats)", ponyfill(LIVE)],
  ["photo (ponyfill, 13 formats)", ponyfill(ALL)],
  ["EAN only", ponyfill(["EAN13"])],
  ["EAN, minLineCount 1", { ...ponyfill(["EAN13"]), minLineCount: 1 }],
  ["EAN, GlobalHistogram", { ...ponyfill(["EAN13"]), binarizer: "GlobalHistogram" }],
  ["EAN, FixedThreshold", { ...ponyfill(["EAN13"]), binarizer: "FixedThreshold" }],
  ["EAN, no downscale", { ...ponyfill(["EAN13"]), tryDownscale: false }],
  ["EAN, downscaleThreshold 2000", { ...ponyfill(["EAN13"]), downscaleThreshold: 2000 }],
];

for (const [name, options] of configs) {
  const started = performance.now();
  const results = await readBarcodes(image, options);
  const text = results.map((result) => `${result.format}:${result.text}`).join(" ") || "—";
  console.log(`${name.padEnd(36)} ${text.padEnd(24)} ${(performance.now() - started).toFixed(0)} ms`);
}

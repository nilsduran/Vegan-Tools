/**
 * @file bench-barcode-reader.ts
 * @description How often the barcode reader reads an EAN-13 the way a low-quality webcam
 * sees it (few pixels per bar, blur, noise, low contrast), under different reader
 * settings and frame preparations. Used to choose the scanner settings with numbers.
 *
 *   npx tsx scripts/bench-barcode-reader.ts
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { prepareZXingModule, readBarcodes, type ReaderOptions } from "zxing-wasm/reader";
import { SCANNED_GTIN } from "../e2e/support/barcode-video.ts";

const require = createRequire(import.meta.url);
prepareZXingModule({ overrides: { wasmBinary: readFileSync(require.resolve("zxing-wasm/reader/zxing_reader.wasm")).buffer as ArrayBuffer } });

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

function modules(code: string): string {
  const digits = [...code].map(Number);
  let out = "101";
  for (let i = 1; i <= 6; i += 1) out += (PARITY[digits[0]!]![i - 1] === "L" ? L : G)[digits[i]!]!;
  out += "01010";
  for (let i = 7; i <= 12; i += 1) out += R[digits[i]!]!;
  return out + "101";
}

/** Seeded random numbers so every configuration sees the same frames. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

interface Frame { width: number; height: number; luma: Float32Array }

/** A 640x480 webcam frame: barcode `pxPerModule` wide, blurred, noisy, low contrast. */
function webcamFrame(pxPerModule: number, blur: number, noise: number, contrast: number, seed: number): Frame {
  const width = 640;
  const height = 480;
  const bars = modules(SCANNED_GTIN);
  const barWidth = bars.length * pxPerModule;
  const left = (width - barWidth) / 2;
  const top = height * 0.3;
  const bottom = height * 0.7;
  const luma = new Float32Array(width * height).fill(1);
  const supersample = 4;
  for (let x = 0; x < width; x += 1) {
    let dark = 0;
    for (let s = 0; s < supersample; s += 1) {
      const position = (x + (s + 0.5) / supersample - left) / pxPerModule;
      if (position >= 0 && position < bars.length && bars[Math.floor(position)] === "1") dark += 1;
    }
    const value = 1 - dark / supersample;
    for (let y = Math.floor(top); y < bottom; y += 1) luma[y * width + x] = value;
  }
  // Separable Gaussian blur (fixed-focus lens too close to the product).
  if (blur > 0) {
    const radius = Math.ceil(blur * 3);
    const kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-((i - radius) ** 2) / (2 * blur * blur)));
    const sum = kernel.reduce((a, b) => a + b, 0);
    const pass = (src: Float32Array, horizontal: boolean) => {
      const out = new Float32Array(src.length);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          let acc = 0;
          for (let k = -radius; k <= radius; k += 1) {
            const xx = horizontal ? Math.min(width - 1, Math.max(0, x + k)) : x;
            const yy = horizontal ? y : Math.min(height - 1, Math.max(0, y + k));
            acc += src[yy * width + xx]! * kernel[k + radius]!;
          }
          out[y * width + x] = acc / sum;
        }
      }
      return out;
    };
    const blurred = pass(pass(luma, true), false);
    luma.set(blurred);
  }
  const random = rng(seed);
  for (let i = 0; i < luma.length; i += 1) {
    const gaussian = Math.sqrt(-2 * Math.log(random() + 1e-9)) * Math.cos(2 * Math.PI * random());
    luma[i] = 0.5 + (luma[i]! - 0.5) * contrast + gaussian * noise;
  }
  return { width, height, luma };
}

function toImageData(frame: Frame) {
  const data = new Uint8ClampedArray(frame.width * frame.height * 4);
  for (let i = 0; i < frame.luma.length; i += 1) {
    const v = Math.max(0, Math.min(255, Math.round(frame.luma[i]! * 255)));
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  return { data, width: frame.width, height: frame.height, colorSpace: "srgb" as const };
}

/** Centre crop scaled up 2x horizontally (bilinear), the candidate frame preparation. */
function centreCropUpscaled(frame: Frame): Frame {
  const cropW = Math.round(frame.width * 0.7);
  const cropH = Math.round(frame.height * 0.6);
  const x0 = (frame.width - cropW) / 2;
  const y0 = (frame.height - cropH) / 2;
  const width = cropW * 2;
  const height = cropH;
  const luma = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = x0 + x / 2;
      const ix = Math.floor(sx);
      const t = sx - ix;
      const row = (Math.floor(y0) + y) * frame.width;
      luma[y * width + x] = frame.luma[row + ix]! * (1 - t) + frame.luma[row + Math.min(frame.width - 1, ix + 1)]! * t;
    }
  }
  return { width, height, luma };
}

/** Unsharp mask along rows (bars are vertical) plus contrast stretch to the full range. */
function sharpen(frame: Frame, amount: number, radius = 2): Frame {
  const { width, height } = frame;
  const luma = new Float32Array(frame.luma.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let acc = 0;
      let n = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const xx = Math.min(width - 1, Math.max(0, x + k));
        acc += frame.luma[y * width + xx]!;
        n += 1;
      }
      const v = frame.luma[y * width + x]!;
      luma[y * width + x] = v + amount * (v - acc / n);
    }
  }
  return stretch({ width, height, luma });
}

function stretch(frame: Frame): Frame {
  const sorted = Float32Array.from(frame.luma).sort();
  const low = sorted[Math.floor(sorted.length * 0.02)]!;
  const high = sorted[Math.floor(sorted.length * 0.98)]!;
  const luma = frame.luma.map((v) => (v - low) / Math.max(1e-6, high - low));
  return { ...frame, luma };
}

const PONYFILL: Partial<ReaderOptions> = {
  formats: ["EAN-13", "EAN-8", "UPC-A", "UPC-E"],
  tryHarder: true,
  tryRotate: true,
  tryInvert: true,
  tryDownscale: true,
  binarizer: "LocalAverage",
  minLineCount: 2,
  maxNumberOfSymbols: 1,
};

const configs: Array<{ name: string; options: Partial<ReaderOptions>; prepare?: (frame: Frame) => Frame }> = [
  { name: "current (ponyfill defaults, minLineCount 2)", options: PONYFILL },
  { name: "minLineCount 1", options: { ...PONYFILL, minLineCount: 1 } },
  { name: "GlobalHistogram binarizer", options: { ...PONYFILL, binarizer: "GlobalHistogram" } },
  { name: "centre crop, 2x wider", options: PONYFILL, prepare: centreCropUpscaled },
  { name: "centre crop 2x + minLineCount 1", options: { ...PONYFILL, minLineCount: 1 }, prepare: centreCropUpscaled },
  { name: "contrast stretch", options: PONYFILL, prepare: stretch },
  { name: "sharpen 1.0 + stretch", options: PONYFILL, prepare: (f) => sharpen(f, 1.0) },
  { name: "sharpen 2.0 + stretch", options: PONYFILL, prepare: (f) => sharpen(f, 2.0) },
  { name: "sharpen 2.0 + stretch + minLineCount 1", options: { ...PONYFILL, minLineCount: 1 }, prepare: (f) => sharpen(f, 2.0) },
];

const conditions: Array<[number, number, number, number]> = [];
for (const px of [1.2, 1.5, 2, 3]) for (const blur of [0.8, 1.5, 2.5]) for (const noise of [0.03, 0.08]) conditions.push([px, blur, noise, 0.6]);

const results: string[] = [];
for (const config of configs) {
  const perCondition: string[] = [];
  let reads = 0;
  let wrong = 0;
  let total = 0;
  const started = performance.now();
  for (const [px, blur, noise, contrast] of conditions) {
    let conditionReads = 0;
    for (let seed = 1; seed <= 3; seed += 1) {
      const frame = webcamFrame(px, blur, noise, contrast, seed * 7919 + px * 100);
      const prepared = config.prepare ? config.prepare(frame) : frame;
      const found = await readBarcodes(toImageData(prepared), config.options);
      total += 1;
      if (found.some((result) => result.text === SCANNED_GTIN)) {
        reads += 1;
        conditionReads += 1;
      }
      else if (found.some((result) => result.isValid && result.text)) wrong += 1;
    }
    perCondition.push(String(conditionReads));
  }
  const ms = (performance.now() - started) / total;
  results.push(`${config.name.padEnd(46)} read ${String(reads).padStart(3)}/${total}  wrong ${wrong}  ${ms.toFixed(0)} ms/frame  [${perCondition.join("")}]`);
}
console.log(`Synthetic webcam frames: ${conditions.length} conditions x 3 seeds\n` + results.join("\n"));

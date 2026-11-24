/**
 * @file synthetic-barcode.ts
 * @description Synthetic webcam frames of an EAN-13 for the barcode benchmarks.
 */

import { SCANNED_GTIN } from "../../e2e/support/barcode-video.ts";

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function modules(code: string): string {
  const digits = [...code].map(Number);
  let out = "101";
  for (let i = 1; i <= 6; i += 1) out += (PARITY[digits[0]!]![i - 1] === "L" ? L : G)[digits[i]!]!;
  out += "01010";
  for (let i = 7; i <= 12; i += 1) out += R[digits[i]!]!;
  return out + "101";
}

/** Seeded random numbers so every configuration sees the same frames. */
export function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

export interface Frame { width: number; height: number; luma: Float32Array }

/** A webcam frame (640x480 by default): barcode `pxPerModule` wide, blurred, noisy, low contrast. */
export function webcamFrame(pxPerModule: number, blur: number, noise: number, contrast: number, seed: number, width = 640, height = 480): Frame {
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

export function toImageData(frame: Frame) {
  const data = new Uint8ClampedArray(frame.width * frame.height * 4);
  for (let i = 0; i < frame.luma.length; i += 1) {
    const v = Math.max(0, Math.min(255, Math.round(frame.luma[i]! * 255)));
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  return { data, width: frame.width, height: frame.height, colorSpace: "srgb" as const };
}


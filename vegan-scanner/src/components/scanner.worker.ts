/**
 * scanner.worker.ts
 *
 * Runs barcode detection off the main thread.
 * Uses the native BarcodeDetector if available (Chrome Android),
 * otherwise falls back to the ZBar WASM polyfill — so this works on Safari too.
 *
 * Message in:  { bitmaps: ImageBitmap[] }
 *   Each bitmap is a preprocessed ROI crop. The worker tries them in order
 *   and returns the first hit, so the main thread can send e.g. a normal-contrast
 *   crop and an inverted crop in one round-trip rather than two.
 *
 * Message out: { type: 'ready' | 'result' | 'error', value?: string | null }
 */

import { BarcodeDetectorPolyfill } from '@undecaf/barcode-detector-polyfill';

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'code_128', 'itf'];

// Use native API if available; otherwise use ZBar WASM polyfill.
// The polyfill is a drop-in replacement so the rest of this file is format-agnostic.
const DetectorCtor: typeof BarcodeDetectorPolyfill =
  'BarcodeDetector' in self
    ? (self as any).BarcodeDetector
    : BarcodeDetectorPolyfill;

let detector: InstanceType<typeof BarcodeDetectorPolyfill> | null = null;

async function init() {
  try {
    detector = new DetectorCtor({ formats: FORMATS });
    // Warm up: some WASM implementations lazy-load on first detect call.
    // Calling getSupportedFormats() is enough to trigger module init.
    await DetectorCtor.getSupportedFormats();
    postMessage({ type: 'ready' });
  } catch (e) {
    postMessage({ type: 'error', reason: String(e) });
  }
}

init();

onmessage = async ({ data }: MessageEvent<{ bitmaps: ImageBitmap[] }>) => {
  const { bitmaps } = data;

  if (!detector) {
    bitmaps?.forEach(b => b.close());
    postMessage({ type: 'result', value: null });
    return;
  }

  // Try each bitmap in order. Return on first hit so we don't waste time
  // checking the inverted pass when the normal one already worked.
  for (const bitmap of bitmaps) {
    try {
      const results = await detector.detect(bitmap);
      bitmap.close();

      if (results.length > 0) {
        // The polyfill exposes a `quality` field; pick the highest-quality result
        // if there are multiple barcodes in frame.
        const best = results.reduce((a: any, b: any) =>
          (b.quality ?? 0) > (a.quality ?? 0) ? b : a
        );
        // Close remaining bitmaps we won't use
        bitmaps.slice(bitmaps.indexOf(bitmap) + 1).forEach(b => b.close());
        postMessage({ type: 'result', value: best.rawValue });
        return;
      }
    } catch {
      bitmap.close();
    }
  }

  postMessage({ type: 'result', value: null });
};

/**
 * Scanner.tsx
 *
 * Three-tier barcode detection strategy, in order of preference:
 *
 *  Tier 1 — Worker (best): ROI crop + multi-pass contrast → Web Worker.
 *            Uses native BarcodeDetector if available (Chrome Android),
 *            otherwise ZBar WASM polyfill. Works on all modern browsers.
 *
 *  Tier 2 — Main thread (good): same polyfill, same multi-pass logic,
 *            but runs on the main thread. Activates if the worker fails
 *            to init within WORKER_TIMEOUT_MS.
 *
 *  Tier 3 — html5-qrcode (last resort): activates only if the polyfill
 *            itself fails to construct a detector. Covers old Android
 *            browsers where WASM loading is broken.
 *
 * Each tier feeds the same confirmation debounce and ImageCapture grab logic.
 */

import { useEffect, useRef, useState } from 'react';
import { BarcodeDetectorPolyfill } from '@undecaf/barcode-detector-polyfill';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Flashlight, FlashlightOff } from 'lucide-react';

// ─── Polyfill install ─────────────────────────────────────────────────────────
// Patch window once at module load. The worker imports BarcodeDetectorPolyfill
// directly, so this only affects main-thread usage.
(async () => {
  try {
    await (window as any).BarcodeDetector.getSupportedFormats();
  } catch {
    (window as any).BarcodeDetector = BarcodeDetectorPolyfill;
  }
})();

// ─── Constants ────────────────────────────────────────────────────────────────

const BOX_W = 280;
const BOX_H = 160;
const CANVAS_W = BOX_W * 2;
const CANVAS_H = BOX_H * 2;

const CONFIRM_HITS        = 2;
const MIN_INTERVAL_MS     = 80;
const WORKER_TIMEOUT_MS   = 3000;
const GRAB_MISS_THRESHOLD = 6;

const FORMATS_NATIVE = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'code_128', 'itf'];

const FORMATS_HTML5 = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.ITF,
];

type ScannerMode = 'detecting' | 'worker' | 'main-thread' | 'html5qrcode';

// ─── ROI helpers ──────────────────────────────────────────────────────────────

function computeVideoCrop(video: HTMLVideoElement) {
  const { videoWidth: vw, videoHeight: vh, clientWidth: cw, clientHeight: ch } = video;
  if (!vw || !vh || !cw || !ch) return null;
  const scale = Math.max(cw / vw, ch / vh);
  const cropW = BOX_W / scale;
  const cropH = BOX_H / scale;
  return {
    x: Math.max(0, vw / 2 - cropW / 2),
    y: Math.max(0, vh / 2 - cropH / 2),
    w: Math.min(cropW, vw),
    h: Math.min(cropH, vh),
  };
}

type FilterPreset = 'normal' | 'inverted';

const FILTER: Record<FilterPreset, string> = {
  normal:   'contrast(1.4) brightness(1.05)',
  inverted: 'contrast(1.8) invert(1)',
};

function drawROI(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  filter: FilterPreset = 'normal',
): boolean {
  if (video.readyState < video.HAVE_ENOUGH_DATA) return false;
  const crop = computeVideoCrop(video);
  if (!crop) return false;
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.filter = FILTER[filter];
  ctx.drawImage(video, crop.x, crop.y, crop.w, crop.h, 0, 0, CANVAS_W, CANVAS_H);
  ctx.filter = 'none';
  return true;
}

async function drawStillROI(
  still: ImageBitmap,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  filter: FilterPreset = 'normal',
): Promise<boolean> {
  const { clientWidth: cw, clientHeight: ch } = video;
  const vw = still.width;
  const vh = still.height;
  if (!vw || !vh || !cw || !ch) return false;
  const scale = Math.max(cw / vw, ch / vh);
  const cropW = BOX_W / scale;
  const cropH = BOX_H / scale;
  const cropX = Math.max(0, vw / 2 - cropW / 2);
  const cropY = Math.max(0, vh / 2 - cropH / 2);
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.filter = FILTER[filter];
  ctx.drawImage(still, cropX, cropY, Math.min(cropW, vw), Math.min(cropH, vh), 0, 0, CANVAS_W, CANVAS_H);
  ctx.filter = 'none';
  return true;
}

// ─── Camera helpers ───────────────────────────────────────────────────────────

function applyConservativeZoom(track: MediaStreamTrack) {
  const caps = track.getCapabilities() as any;
  if (!caps?.zoom) return;
  setTimeout(async () => {
    try {
      const { min, max } = caps.zoom;
      await track.applyConstraints({
        advanced: [{ zoom: Math.max(min, Math.min(max, 1.5)) } as any],
      });
    } catch (e) { console.warn('Zoom failed', e); }
  }, 500);
}

async function acquireStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: 'environment' },
        width: { ideal: 1920 }, height: { ideal: 1080 },
        focusMode: 'continuous',
      } as any,
    });
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
    } catch {
      return navigator.mediaDevices.getUserMedia({ video: true });
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Scanner({ onScan }: { onScan: (code: string) => void }) {
  const [error,       setError]       = useState<string | null>(null);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('detecting');
  const [hasTorch,    setHasTorch]    = useState(false);
  const [torchOn,     setTorchOn]     = useState(false);

  const onScanRef      = useRef(onScan);
  const hasScannedRef  = useRef(false);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const canvasNormal   = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const canvasInverted = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const trackRef       = useRef<MediaStreamTrack | null>(null);
  const lastValueRef   = useRef<string | null>(null);
  const hitCountRef    = useRef(0);
  const missCountRef   = useRef(0);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  // ── Tier 1 + 2: Worker / main-thread (BarcodeDetector or polyfill) ──────────
  useEffect(() => {
    if (scannerMode === 'html5qrcode') return;

    let isMounted   = true;
    let stream: MediaStream | null = null;
    let timeoutId: ReturnType<typeof setTimeout>;
    let workerReady = false;
    let useWorker   = false;
    let scanPending = false;
    let detector: any = null;

    hasScannedRef.current = false;
    lastValueRef.current  = null;
    hitCountRef.current   = 0;
    missCountRef.current  = 0;

    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('./scanner.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      workerReady = true;
    }

    const workerTimeout = setTimeout(() => {
      if (!workerReady) { workerReady = true; useWorker = false; }
    }, WORKER_TIMEOUT_MS);

    const handleValue = (value: string | null): boolean => {
      if (!value || hasScannedRef.current) return false;
      if (value === lastValueRef.current) {
        hitCountRef.current++;
      } else {
        lastValueRef.current = value;
        hitCountRef.current  = 1;
      }
      if (hitCountRef.current >= CONFIRM_HITS) {
        hasScannedRef.current = true;
        navigator.vibrate?.(200);
        onScanRef.current(value);
        return true;
      }
      return false;
    };

    const schedule = (ms = MIN_INTERVAL_MS) => {
      if (isMounted && !hasScannedRef.current) {
        timeoutId = setTimeout(sendFrame, ms);
      }
    };

    const grabStill = async (): Promise<ImageBitmap | null> => {
      if (!trackRef.current || !('ImageCapture' in window)) return null;
      try {
        const capture = new (window as any).ImageCapture(trackRef.current);
        return await capture.grabFrame();
      } catch { return null; }
    };

    const buildBitmaps = async (): Promise<ImageBitmap[] | null> => {
      if (!videoRef.current) return null;

      let still: ImageBitmap | null = null;
      if (missCountRef.current >= GRAB_MISS_THRESHOLD) {
        still = await grabStill();
        if (still) missCountRef.current = 0;
      }

      const bitmaps: ImageBitmap[] = [];
      try {
        if (still) {
          if (await drawStillROI(still, canvasNormal.current,   videoRef.current, 'normal'))
            bitmaps.push(await createImageBitmap(canvasNormal.current));
          if (await drawStillROI(still, canvasInverted.current, videoRef.current, 'inverted'))
            bitmaps.push(await createImageBitmap(canvasInverted.current));
          still.close();
        } else {
          if (drawROI(videoRef.current, canvasNormal.current,   'normal'))
            bitmaps.push(await createImageBitmap(canvasNormal.current));
          if (drawROI(videoRef.current, canvasInverted.current, 'inverted'))
            bitmaps.push(await createImageBitmap(canvasInverted.current));
        }
      } catch {
        still?.close();
        bitmaps.forEach(b => { try { b.close(); } catch {} });
        return null;
      }
      return bitmaps.length > 0 ? bitmaps : null;
    };

    const sendFrame = async () => {
      if (!isMounted || hasScannedRef.current || !videoRef.current || scanPending) return;
      if (worker && !workerReady) { schedule(50); return; }

      const bitmaps = await buildBitmaps();
      if (!bitmaps) { schedule(50); return; }

      if (useWorker && worker) {
        worker.postMessage({ bitmaps }, bitmaps);
      } else {
        if (!detector) { bitmaps.forEach(b => b.close()); schedule(); return; }
        scanPending = true;
        try {
          let hit = false;
          for (const bitmap of bitmaps) {
            const results = await detector.detect(bitmap);
            bitmap.close();
            if (results.length > 0) {
              hit = true;
              handleValue(results[0].rawValue);
              // Close any remaining bitmaps we won't use
              bitmaps.slice(bitmaps.indexOf(bitmap) + 1).forEach(b => b.close());
              break;
            }
          }
          if (!hit) missCountRef.current++;
        } catch {
          bitmaps.forEach(b => { try { b.close(); } catch {} });
        } finally {
          scanPending = false;
        }
        schedule();
      }
    };

    if (worker) {
      worker.onmessage = ({ data }: MessageEvent) => {
        if (data.type === 'ready') {
          clearTimeout(workerTimeout);
          workerReady = true;
          useWorker   = true;
          setScannerMode('worker');
          schedule(0);
          return;
        }
        if (data.type === 'error') {
          clearTimeout(workerTimeout);
          workerReady = true;
          useWorker   = false;
          setScannerMode('main-thread');
          schedule(0);
          return;
        }
        if (data.type === 'result') {
          const hit = handleValue(data.value);
          if (!hit) {
            if (!data.value) missCountRef.current++;
            if (isMounted) schedule(0);
          }
        }
      };
      worker.onerror = () => {
        clearTimeout(workerTimeout);
        workerReady = true;
        useWorker   = false;
        setScannerMode('main-thread');
        schedule(0);
      };
    }

    const start = async () => {
      try {
        // Try to build the detector. If this throws (WASM broken, etc.),
        // we fall all the way down to html5-qrcode.
        detector = new (window as any).BarcodeDetector({ formats: FORMATS_NATIVE });

        stream = await acquireStream();
        if (!isMounted || !videoRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const caps = track.getCapabilities() as any;
        if (caps?.torch) setHasTorch(true);
        applyConservativeZoom(track);

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        schedule(200);
      } catch (err) {
        console.warn('BarcodeDetector init failed, falling back to html5-qrcode:', err);
        stream?.getTracks().forEach(t => t.stop());
        if (isMounted) setScannerMode('html5qrcode');
      }
    };

    start();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearTimeout(workerTimeout);
      worker?.terminate();
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [scannerMode === 'html5qrcode']);

  // ── Tier 3: html5-qrcode (last resort) ───────────────────────────────────
  useEffect(() => {
    if (scannerMode !== 'html5qrcode') return;

    let isMounted = true;
    hasScannedRef.current = false;
    lastValueRef.current  = null;
    hitCountRef.current   = 0;

    let html5QrCode: Html5Qrcode | null = null;
    let isStarting = false;

    const initScanner = async () => {
      isStarting = true;
      try {
        html5QrCode = new Html5Qrcode('reader');

        const config = {
          fps: 10,
          qrbox: { width: BOX_W, height: BOX_H },
          aspectRatio: 1.777778,
          formatsToSupport: FORMATS_HTML5,
        };

        const onScanSuccess = (decodedText: string) => {
          if (hasScannedRef.current || !isMounted) return;
          if (decodedText === lastValueRef.current) {
            hitCountRef.current++;
          } else {
            lastValueRef.current = decodedText;
            hitCountRef.current  = 1;
          }
          if (hitCountRef.current >= CONFIRM_HITS) {
            hasScannedRef.current = true;
            navigator.vibrate?.(200);
            onScanRef.current(decodedText);
          }
        };

        try {
          await html5QrCode.start(
            { facingMode: { exact: 'environment' } }, config, onScanSuccess, () => {},
          );
        } catch {
          try {
            await html5QrCode.start(
              { facingMode: 'environment' }, config, onScanSuccess, () => {},
            );
          } catch {
            const cameras = await Html5Qrcode.getCameras();
            if (cameras?.length > 0) {
              await html5QrCode.start(cameras[0].id, config, onScanSuccess, () => {});
            } else {
              throw new Error('No cameras found');
            }
          }
        }

        try {
          const track = (html5QrCode as any).getRunningTrack();
          if (track) {
            trackRef.current = track;
            const caps = track.getCapabilities() as any;
            if (caps?.torch) setHasTorch(true);
            applyConservativeZoom(track);
          }
        } catch { /* non-critical */ }
      } catch (err) {
        console.error('html5-qrcode failed:', err);
        if (isMounted) setError("No s'ha pogut iniciar la càmera. Assegura't de donar permisos.");
      } finally {
        isStarting = false;
      }
    };

    const timeoutId = setTimeout(() => { if (isMounted) initScanner(); }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      const stop = async () => {
        while (isStarting) await new Promise(r => setTimeout(r, 50));
        if (html5QrCode?.isScanning) {
          try { await html5QrCode.stop(); html5QrCode.clear(); }
          catch (e) { console.error('Error stopping html5-qrcode', e); }
        }
      };
      stop();
    };
  }, [scannerMode]);

  const toggleTorch = async () => {
    if (!trackRef.current) return;
    try {
      await trackRef.current.applyConstraints({
        advanced: [{ torch: !torchOn } as any],
      });
      setTorchOn(t => !t);
    } catch (e) { console.error('Torch toggle failed', e); }
  };

  const isHtml5Mode = scannerMode === 'html5qrcode';

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-4">
      <div className="w-full relative rounded-3xl overflow-hidden bg-black aspect-square flex items-center justify-center shadow-2xl">
        {error ? (
          <div className="text-red-400 p-6 text-center font-medium">{error}</div>
        ) : (
          <>
            {/* Native/polyfill path renders its own <video> */}
            {!isHtml5Mode && (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            )}

            {/* html5-qrcode manages its own video element inside #reader */}
            {isHtml5Mode && (
              <div
                id="reader"
                className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
              />
            )}

            {/* Scanner overlay — dimensions must match BOX_W / BOX_H */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
              <div className="w-[280px] h-[160px] relative">
                <div className="absolute inset-0 shadow-[0_0_0_4000px_rgba(0,0,0,0.5)]" />
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 z-10" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 z-10" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 z-10" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 z-10" />
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-emerald-500 z-10 shadow-[0_0_8px_2px_rgba(16,185,129,0.6)] animate-pulse" />
              </div>
            </div>

            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`absolute bottom-6 right-6 p-3 rounded-full backdrop-blur-md transition-colors z-20 ${
                  torchOn
                    ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    : 'bg-black/40 text-white/80 hover:bg-black/60'
                }`}
              >
                {torchOn ? <Flashlight className="w-6 h-6" /> : <FlashlightOff className="w-6 h-6" />}
              </button>
            )}
          </>
        )}
      </div>
      <p className="text-center text-stone-500 text-sm font-medium px-4">
        Apunta al codi de barres. Si es veu borrós, allunya una mica el mòbil.
      </p>
    </div>
  );
}
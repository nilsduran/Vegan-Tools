import { useEffect, useRef, useState } from "react";
import { BarcodeDetector as ZXingBarcodeDetector, prepareZXingModule } from "barcode-detector/ponyfill";
import zxingReaderWasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import { Camera, CameraOff, Flashlight, FlashlightOff, HelpCircle, RefreshCw } from "lucide-react";
import { classifyScannedCode } from "@vegan-tools/domain";
import { tx } from "../i18n";
import { CameraPermissionModal } from "./CameraPermissionModal";
import { getCameraPermissionState, isCameraPermissionError } from "../utils/camera";

type Detector = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorClass = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
};

/**
 * Formats searched in every live frame. Each extra format costs time on every
 * frame where ZXing runs (iPhone, Firefox, desktop Chrome): with all 13, a Full
 * HD frame took ~0.7 s; with these, ~0.15 s, reading the same codes
 * (scripts/bench-barcode-formats.ts). The 2D formats (Data Matrix, Aztec,
 * PDF417) are the costly ones.
 */
export const LIVE_BARCODE_FORMATS = ["code_128", "ean_13", "ean_8", "qr_code", "upc_a", "upc_e"];

/** A single photo can afford every format (Data Matrix on medicines, for example). */
export const PHOTO_BARCODE_FORMATS = [
  "aztec",
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "data_matrix",
  "ean_13",
  "ean_8",
  "itf",
  "pdf417",
  "qr_code",
  "upc_a",
  "upc_e",
];

// The ZXing engine is bundled with the app (no CDN): scanning works offline and
// makes no third-party request.
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? zxingReaderWasmUrl : prefix + path),
  },
});

const FIRST_FRAME_TIMEOUT_MS = 3500;

/**
 * Starts the video and says whether it really started within `timeoutMs`.
 * `play()` only settles once the first frame arrives; with a camera that sends
 * nothing it never does.
 */
async function playWithin(video: HTMLVideoElement, timeoutMs: number): Promise<boolean> {
  let timer: number | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = window.setTimeout(() => resolve(false), timeoutMs);
  });
  try {
    const played = video.play().then(() => true);
    return await Promise.race([played, timeout]);
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Creates a detector for every format the reader in use actually supports.
 *
 * The native BarcodeDetector exists on Android Chrome and macOS. Elsewhere
 * (iPhone Safari, Firefox, Chrome on Windows and Linux) ZXing-C++ compiled to
 * WebAssembly is used: it reads blurry, small and rotated codes from desktop
 * webcams much better than the ZBar polyfill used before (November 2026).
 */
export async function createBarcodeDetector(wanted: string[] = LIVE_BARCODE_FORMATS): Promise<Detector> {
  const NativeDetector = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorClass })
    .BarcodeDetector;
  const DetectorClass = NativeDetector ?? (ZXingBarcodeDetector as unknown as BarcodeDetectorClass);
  const available = DetectorClass.getSupportedFormats
    ? await DetectorClass.getSupportedFormats()
    : wanted;
  const formats = wanted.filter((format) => available.includes(format));
  return new DetectorClass({ formats: formats.length > 0 ? formats : ["qr_code"] });
}

/** How much to zoom where the camera allows it (phones). See applyCameraExtras. */
const SCAN_ZOOM = 1.5;

/**
 * Light, focus and zoom are extras: a device without them still scans.
 * Zoom: many phones cannot focus closer than 10-15 cm, so people bring the
 * code too close and it blurs. A little zoom makes them hold it further away,
 * where the lens focuses. Desktop webcams expose no zoom, so nothing changes there.
 */
function applyCameraExtras(track: MediaStreamTrack | null) {
  const capabilities = (track?.getCapabilities?.() ?? {}) as {
    torch?: boolean;
    focusMode?: string[];
    zoom?: { min: number; max: number };
  };
  const advanced: MediaTrackConstraintSet[] = [];
  if (capabilities.focusMode?.includes("continuous")) advanced.push({ focusMode: "continuous" } as MediaTrackConstraintSet);
  if (capabilities.zoom && capabilities.zoom.max >= SCAN_ZOOM && capabilities.zoom.min <= SCAN_ZOOM) {
    advanced.push({ zoom: SCAN_ZOOM } as MediaTrackConstraintSet);
  }
  for (const constraint of advanced) void track?.applyConstraints({ advanced: [constraint] }).catch(() => {});
  return { torch: Boolean(capabilities.torch) };
}

/**
 * The frame exactly as it is shown on screen (the preview crops the video to
 * fill the frame), as a JPEG file.
 */
export async function captureVisibleFrame(video: HTMLVideoElement): Promise<File | undefined> {
  const { videoWidth: videoW, videoHeight: videoH, clientWidth: clientW, clientHeight: clientH } = video;
  if (!videoW || !videoH) return undefined;
  let sx = 0;
  let sy = 0;
  let sWidth = videoW;
  let sHeight = videoH;
  if (clientW > 0 && clientH > 0) {
    const clientAspect = clientW / clientH;
    const videoAspect = videoW / videoH;
    if (Math.abs(clientAspect - videoAspect) > 0.01) {
      if (clientAspect > videoAspect) {
        sHeight = videoW / clientAspect;
        sy = (videoH - sHeight) / 2;
      } else {
        sWidth = videoH * clientAspect;
        sx = (videoW - sWidth) / 2;
      }
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sWidth));
  canvas.height = Math.max(1, Math.round(sHeight));
  canvas.getContext("2d")?.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  return blob ? new File([blob], "scan-photo.jpg", { type: "image/jpeg" }) : undefined;
}

/**
 * The scanner's only camera: it reads barcodes and QR codes by itself, and the
 * shutter takes a photo of anything without a code (a label, clothing...).
 */
export function BarcodeCamera({ onDetected, onPhoto }: { onDetected: (value: string) => void; onPhoto?: (file: File) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [readerFailed, setReaderFailed] = useState(false);
  const [started, setStarted] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [canShowPermissionHelp, setCanShowPermissionHelp] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!started) return;
    let active = true;
    let stream: MediaStream | undefined;
    let frame = 0;

    const start = async () => {
      setError("");
      setReaderFailed(false);
      setCanShowPermissionHelp(false);
      try {
        const permissionState = await getCameraPermissionState();
        if (permissionState === "denied") {
          throw new DOMException("Camera permission was denied.", "NotAllowedError");
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new DOMException("Camera access is unavailable in this browser.", "SecurityError");
        }
        // Some webcams open in Firefox but never send a frame in the mode a size
        // request selects (a black picture). After a few seconds without frames,
        // reopen with no size request: the camera's own default mode.
        // Full HD first: a fixed-focus laptop webcam reads a code only with
        // enough pixels per bar (scripts/bench-barcode-reader.ts).
        const attempts: MediaTrackConstraints[] = [
          { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          { facingMode: "environment", width: { ideal: 1280 } },
          { facingMode: "environment" },
        ];
        let playing = false;
        for (const [index, video] of attempts.entries()) {
          stream = await navigator.mediaDevices.getUserMedia({ video });
          if (!active || !videoRef.current) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          videoRef.current.srcObject = stream;
          playing = await playWithin(videoRef.current, FIRST_FRAME_TIMEOUT_MS);
          if (!active) return;
          if (playing) break;
          console.warn(`[BarcodeCamera] No frames from the camera (attempt ${index + 1})`);
          videoRef.current.srcObject = null;
          stream.getTracks().forEach((track) => track.stop());
          stream = undefined;
        }
        if (!playing || !stream) throw new DOMException("The camera sends no image.", "NotReadableError");
        try {
          const track = stream.getVideoTracks?.()[0] ?? null;
          trackRef.current = track;
          setTorchAvailable(applyCameraExtras(track).torch);
        } catch {
          setTorchAvailable(false);
        }
      } catch (error) {
        console.error("[BarcodeCamera] Camera could not start", error);
        stream?.getTracks().forEach((track) => track.stop());
        const noPicture = error instanceof DOMException && error.message === "The camera sends no image.";
        setError(
          noPicture
            ? tx("The camera opened but sends no picture. Close other apps using it and retry, or take a photo.")
            : tx("Camera access is unavailable. Enter the barcode below."),
        );
        setCanShowPermissionHelp(isCameraPermissionError(error));
        setShowPermissionModal(false);
        return;
      }

      // The camera works from here on: a failure now is the barcode reader,
      // not a permission problem, and the message must say so.
      let detector: Detector;
      try {
        detector = await createBarcodeDetector();
      } catch (error) {
        console.error("[BarcodeCamera] Barcode reader could not start", error);
        stream?.getTracks().forEach((track) => track.stop());
        setReaderFailed(true);
        setError(tx("The barcode reader could not start on this device. Enter the barcode below."));
        return;
      }

      const detect = async () => {
        if (!active || !videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          // ZXing only returns codes that decode completely (EAN/UPC check digit
          // included), and measured on degraded webcam frames it never returned a
          // wrong code (scripts/bench-barcode-reader.ts). So the first valid read
          // is enough: waiting for a second one doubled the wait on blurry webcams.
          const value = results
            .map((result) => result.rawValue)
            .find((raw) => raw && classifyScannedCode(raw).kind !== "invalid_gtin") ?? "";
          if (value) {
            navigator.vibrate?.(100);
            onDetected(value);
            return;
          }
        } catch {
          // A partially decoded frame is expected; continue scanning.
        }
        window.setTimeout(() => {
          frame = requestAnimationFrame(detect);
        }, 120);
      };
      frame = requestAnimationFrame(detect);
    };
    void start();

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      trackRef.current = null;
      setTorchOn(false);
    };
  }, [onDetected, started, retryCount]);

  // From the camera-permission help: a photo when the live camera is refused.
  const handleNativeCapture = async (file: File) => {
    const value = await readCodeFromPhoto(file);
    if (value) onDetected(value);
    else setError(tx(NO_CODE_IN_PHOTO));
  };

  if (!started) {
    return (
      <div className="camera-start">
        <Camera aria-hidden="true" />
        <p>{tx("Use your camera to scan a barcode.")}</p>
        <button className="primary-button" onClick={() => setStarted(true)}>
          {tx("Start camera")}
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="camera-error" style={{ display: "flex", flexDirection: "column", gap: "0.6rem", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CameraOff />
            <span>{error}</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            {canShowPermissionHelp && !readerFailed && (
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: "0.82rem", padding: "0.4rem 0.75rem", gap: "0.35rem" }}
                onClick={() => setShowPermissionModal(true)}
              >
                <HelpCircle size={15} aria-hidden="true" />
                <span>{tx("How to enable camera")}</span>
              </button>
            )}
            <button
              type="button"
              className="secondary-button"
              style={{ fontSize: "0.82rem", padding: "0.4rem 0.75rem", gap: "0.35rem" }}
              onClick={() => setRetryCount((prev) => prev + 1)}
            >
              <RefreshCw size={15} aria-hidden="true" />
              <span>{tx("Retry")}</span>
            </button>
          </div>
        </div>

        <CameraPermissionModal
          isOpen={showPermissionModal}
          onClose={() => setShowPermissionModal(false)}
          onRetry={() => {
            setRetryCount((prev) => prev + 1);
          }}
          onNativeCapture={handleNativeCapture}
        />
      </>
    );
  }

  const toggleTorch = async () => {
    const next = !torchOn;
    try {
      await trackRef.current?.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  };

  // No aiming box: the reader scans the whole picture, and a box only made
  // people think the code had to fit inside it.
  return (
    <>
    <div className="camera-frame">
      <video ref={videoRef} muted playsInline aria-label={tx("Camera")} />
      {onPhoto && (
        <button
          type="button"
          className="camera-shutter"
          disabled={capturing}
          aria-label={tx("Take a photo")}
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            setCapturing(true);
            void captureVisibleFrame(video).then((file) => {
              setCapturing(false);
              if (file) onPhoto(file);
            });
          }}
        >
          <Camera aria-hidden="true" />
        </button>
      )}
      {torchAvailable && (
        <button
          type="button"
          className="camera-torch"
          onClick={() => void toggleTorch()}
          aria-pressed={torchOn}
          aria-label={torchOn ? tx("Turn off the light") : tx("Turn on the light")}
        >
          {torchOn ? <FlashlightOff aria-hidden="true" /> : <Flashlight aria-hidden="true" />}
        </button>
      )}
    </div>
    {onPhoto && (
      <p className="muted camera-caption">{tx("Codes are read by themselves. For anything else (a label, clothing…), take a photo.")}</p>
    )}
    </>
  );
}

export const NO_CODE_IN_PHOTO = "No code was found in the photo. Try a closer, sharper photo or type the number.";

/** Reads a barcode or QR code from a still photo; undefined when none is readable. */
export async function readCodeFromPhoto(file: File): Promise<string | undefined> {
  if (typeof URL.createObjectURL !== "function") return undefined;
  const url = URL.createObjectURL(file);
  try {
    const detector = await createBarcodeDetector(PHOTO_BARCODE_FORMATS);
    const img = new Image();
    img.src = url;
    await img.decode();
    const results = await detector.detect(img);
    const value = results
      .map((result) => result.rawValue)
      .find((raw) => raw && classifyScannedCode(raw).kind !== "invalid_gtin");
    if (value) navigator.vibrate?.(100);
    return value;
  } catch (error) {
    console.error("[BarcodeCamera] Could not read a code from the photo", error);
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}

import { useEffect, useRef, useState } from "react";
import { BarcodeDetector as ZXingBarcodeDetector, prepareZXingModule } from "barcode-detector/ponyfill";
import zxingReaderWasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import { Camera, CameraOff, Flashlight, FlashlightOff, HelpCircle, ImagePlus, RefreshCw } from "lucide-react";
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

const UNIVERSAL_BARCODE_FORMATS = [
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
export async function createBarcodeDetector(): Promise<Detector> {
  const NativeDetector = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorClass })
    .BarcodeDetector;
  const DetectorClass = NativeDetector ?? (ZXingBarcodeDetector as unknown as BarcodeDetectorClass);
  const available = DetectorClass.getSupportedFormats
    ? await DetectorClass.getSupportedFormats()
    : UNIVERSAL_BARCODE_FORMATS;
  const formats = UNIVERSAL_BARCODE_FORMATS.filter((format) => available.includes(format));
  return new DetectorClass({ formats: formats.length > 0 ? formats : ["qr_code"] });
}

export function BarcodeCamera({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [readerFailed, setReaderFailed] = useState(false);
  const [started, setStarted] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [canShowPermissionHelp, setCanShowPermissionHelp] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  // A front (selfie) camera is shown mirrored, like a video call: otherwise
  // moving the product right moves it left on screen and aiming is hard.
  // Only the preview is flipped; the reader gets the real frames.
  const [mirrored, setMirrored] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

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
        // Light and focus are extras: a device without them still scans.
        try {
          const track = stream.getVideoTracks?.()[0] ?? null;
          trackRef.current = track;
          const capabilities = (track?.getCapabilities?.() ?? {}) as { torch?: boolean; focusMode?: string[] };
          setTorchAvailable(Boolean(capabilities.torch));
          setMirrored(track?.getSettings?.().facingMode !== "environment");
          if (capabilities.focusMode?.includes("continuous")) {
            void track?.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
          }
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
    const value = await readBarcodeFromPhoto(file);
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
    <div className="camera-frame">
      <video ref={videoRef} muted playsInline aria-label={tx("Barcode")} className={mirrored ? "mirrored" : undefined} />
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
  );
}

const NO_CODE_IN_PHOTO = "No code was found in the photo. Try a closer, sharper photo or type the number.";

/** Reads a barcode or QR code from a still photo; undefined when none is readable. */
async function readBarcodeFromPhoto(file: File): Promise<string | undefined> {
  const url = URL.createObjectURL(file);
  try {
    const detector = await createBarcodeDetector();
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
    console.error("[BarcodeCamera] Could not read a barcode from the photo", error);
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * A still photo is sharper than a live frame (autofocus, full resolution): the
 * fallback when the live reader struggles or the camera is unavailable.
 */
export function BarcodePhotoButton({ onDetected }: { onDetected: (value: string) => void }) {
  const [message, setMessage] = useState("");
  return (
    <div className="barcode-photo-row">
      <label className="secondary-button barcode-photo-button">
        <ImagePlus aria-hidden="true" />
        <span>{tx("Photo of the barcode")}</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          data-testid="barcode-photo-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setMessage("");
            void readBarcodeFromPhoto(file).then((value) => {
              if (value) onDetected(value);
              else setMessage(tx(NO_CODE_IN_PHOTO));
            });
          }}
        />
      </label>
      {message && <p className="muted" role="status">{message}</p>}
    </div>
  );
}

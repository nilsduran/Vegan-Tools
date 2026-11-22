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
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    if (!started) return;
    let active = true;
    let stream: MediaStream | undefined;
    let frame = 0;
    let lastValue = "";
    let hits = 0;

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
        // Full HD reads small and dense barcodes from further away.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (!active || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        // Light and focus are extras: a device without them still scans.
        try {
          const track = stream.getVideoTracks?.()[0] ?? null;
          trackRef.current = track;
          const capabilities = (track?.getCapabilities?.() ?? {}) as { torch?: boolean; focusMode?: string[] };
          setTorchAvailable(Boolean(capabilities.torch));
          if (capabilities.focusMode?.includes("continuous")) {
            void track?.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
          }
        } catch {
          setTorchAvailable(false);
        }
      } catch (error) {
        console.error("[BarcodeCamera] Camera could not start", error);
        stream?.getTracks().forEach((track) => track.stop());
        setError(tx("Camera access is unavailable. Enter the barcode below."));
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

      // Every other frame only the centre is read, so a small code held far from
      // a fixed-focus desktop webcam fills more of what the reader sees.
      const crop = document.createElement("canvas");
      let useCrop = false;
      const frameSource = (video: HTMLVideoElement): CanvasImageSource => {
        useCrop = !useCrop;
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!useCrop || !width || !height) return video;
        crop.width = Math.round(width * 0.7);
        crop.height = Math.round(height * 0.6);
        crop.getContext("2d", { willReadFrequently: true })?.drawImage(video, width * 0.15, height * 0.2, crop.width, crop.height, 0, 0, crop.width, crop.height);
        return crop;
      };

      const detect = async () => {
        if (!active || !videoRef.current) return;
        try {
          const results = await detector.detect(frameSource(videoRef.current));
          // A barcode whose check digit fails is a misread: keep scanning.
          const value = results
            .map((result) => result.rawValue)
            .find((raw) => raw && classifyScannedCode(raw).kind !== "invalid_gtin") ?? "";
          // Two matching reads confirm a code. Frames without a read (e.g. the centre
          // crop missing a large code) do not reset the count; a different code does.
          if (value) {
            if (value === lastValue) hits += 1;
            else {
              lastValue = value;
              hits = 1;
            }
          }
          if (hits >= 2) {
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

  const [photoMessage, setPhotoMessage] = useState("");
  // A still photo is sharper than a live frame (autofocus, full resolution):
  // the fallback when the live reader struggles.
  const handleNativeCapture = async (file: File) => {
    setPhotoMessage("");
    try {
      const detector = await createBarcodeDetector();
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();
      const results = await detector.detect(img);
      URL.revokeObjectURL(img.src);
      const value = results
        .map((result) => result.rawValue)
        .find((raw) => raw && classifyScannedCode(raw).kind !== "invalid_gtin");
      if (value) {
        navigator.vibrate?.(100);
        onDetected(value);
      } else {
        setPhotoMessage(tx("No code was found in the photo. Try a closer, sharper photo or type the number."));
      }
    } catch (error) {
      console.error("[BarcodeCamera] Could not read a barcode from the photo", error);
      setPhotoMessage(tx("No code was found in the photo. Try a closer, sharper photo or type the number."));
    }
  };

  // One element in both views (live camera and camera error), so a photo chosen
  // while the view switches is never lost.
  const photoRow = (
    <div className="barcode-photo-row" key="barcode-photo-row">
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
          if (file) void handleNativeCapture(file);
        }}
      />
    </label>
    {photoMessage && <p className="muted" role="status">{photoMessage}</p>}
    </div>
  );

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
        {photoRow}

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
      <video ref={videoRef} muted playsInline aria-label={tx("Barcode")} />
      <p className="camera-hint" aria-hidden="true">{tx("Point at a barcode or QR code")}</p>
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
    {photoRow}
    </>
  );
}

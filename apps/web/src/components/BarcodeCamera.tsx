import { useEffect, useRef, useState } from "react";
import { BarcodeDetectorPolyfill } from "@undecaf/barcode-detector-polyfill";
import { Camera, CameraOff, HelpCircle, RefreshCw } from "lucide-react";
import { tx } from "../i18n";
import { CameraPermissionModal } from "./CameraPermissionModal";
import { getCameraPermissionState, isCameraPermissionError } from "../utils/camera";

type Detector = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
};

type NativeBarcodeDetector = {
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

export function BarcodeCamera({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [canShowPermissionHelp, setCanShowPermissionHelp] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    let active = true;
    let stream: MediaStream | undefined;
    let frame = 0;
    let lastValue = "";
    let hits = 0;

    const start = async () => {
      setError("");
      setCanShowPermissionHelp(false);
      try {
        const permissionState = await getCameraPermissionState();
        if (permissionState === "denied") {
          throw new DOMException("Camera permission was denied.", "NotAllowedError");
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new DOMException("Camera access is unavailable in this browser.", "SecurityError");
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
        });
        if (!active || !videoRef.current) return;
        const NativeDetector = (globalThis as unknown as {
          BarcodeDetector?: NativeBarcodeDetector;
        }).BarcodeDetector;
        const supportedFormats = NativeDetector?.getSupportedFormats
          ? (await NativeDetector.getSupportedFormats()).filter((format) => UNIVERSAL_BARCODE_FORMATS.includes(format))
          : UNIVERSAL_BARCODE_FORMATS;
        const DetectorClass = NativeDetector ?? (BarcodeDetectorPolyfill as unknown as NativeBarcodeDetector);
        const detector = new DetectorClass({
          formats: supportedFormats.length > 0 ? supportedFormats : ["qr_code"],
        });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detect = async () => {
          if (!active || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            const value = results[0]?.rawValue ?? "";
            if (value && value === lastValue) hits += 1;
            else {
              lastValue = value;
              hits = value ? 1 : 0;
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
          }, 180);
        };
        frame = requestAnimationFrame(detect);
      } catch (error) {
        setError(tx("Camera access is unavailable. Enter the barcode below."));
        const permissionError = isCameraPermissionError(error);
        setCanShowPermissionHelp(permissionError);
        setShowPermissionModal(false);
      }
    };
    void start();

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetected, started, retryCount]);

  const handleNativeCapture = async (file: File) => {
    try {
      const NativeDetector = (globalThis as unknown as {
        BarcodeDetector?: NativeBarcodeDetector;
      }).BarcodeDetector;
      const supportedFormats = NativeDetector?.getSupportedFormats
        ? (await NativeDetector.getSupportedFormats()).filter((format) => UNIVERSAL_BARCODE_FORMATS.includes(format))
        : UNIVERSAL_BARCODE_FORMATS;
      const DetectorClass = NativeDetector ?? (BarcodeDetectorPolyfill as unknown as NativeBarcodeDetector);
      const detector = new DetectorClass({
        formats: supportedFormats.length > 0 ? supportedFormats : ["qr_code"],
      });

      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();
      const results = await detector.detect(img);
      URL.revokeObjectURL(img.src);
      if (results[0]?.rawValue) {
        navigator.vibrate?.(100);
        onDetected(results[0].rawValue);
      }
    } catch {
      // Continue without breaking
    }
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
            {canShowPermissionHelp && (
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

  return (
    <div className="camera-frame">
      <video ref={videoRef} muted playsInline aria-label={tx("Barcode")} />
      <div className="scan-window" aria-hidden="true" />
    </div>
  );
}

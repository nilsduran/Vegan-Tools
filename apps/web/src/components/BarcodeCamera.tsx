import { useEffect, useRef, useState } from "react";
import { BarcodeDetectorPolyfill } from "@undecaf/barcode-detector-polyfill";
import { Camera, CameraOff, HelpCircle, RefreshCw } from "lucide-react";
import { tx } from "../i18n";
import { CameraPermissionModal } from "./CameraPermissionModal";

type Detector = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
};

export function BarcodeCamera({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
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
      try {
        const NativeDetector = (globalThis as unknown as {
          BarcodeDetector?: new (options: { formats: string[] }) => Detector;
        }).BarcodeDetector;
        const DetectorClass = NativeDetector ?? (BarcodeDetectorPolyfill as unknown as new (
          options: { formats: string[] },
        ) => Detector);
        const detector = new DetectorClass({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
        });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
        });
        if (!active || !videoRef.current) return;
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
      } catch (err) {
        setError(tx("Camera access is unavailable. Enter the barcode below."));
        setShowPermissionModal(true);
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
        BarcodeDetector?: new (options: { formats: string[] }) => Detector;
      }).BarcodeDetector;
      const DetectorClass = NativeDetector ?? (BarcodeDetectorPolyfill as unknown as new (
        options: { formats: string[] },
      ) => Detector);
      const detector = new DetectorClass({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
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
            <button
              type="button"
              className="secondary-button"
              style={{ fontSize: "0.82rem", padding: "0.4rem 0.75rem", gap: "0.35rem" }}
              onClick={() => setShowPermissionModal(true)}
            >
              <HelpCircle size={15} aria-hidden="true" />
              <span>{tx("How to enable camera")}</span>
            </button>
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

import { useEffect, useRef, useState } from "react";
import { BarcodeDetectorPolyfill } from "@undecaf/barcode-detector-polyfill";
import { Camera, CameraOff } from "lucide-react";
import { tx } from "../i18n";

type Detector = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
};

export function BarcodeCamera({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    let active = true;
    let stream: MediaStream | undefined;
    let frame = 0;
    let lastValue = "";
    let hits = 0;

    const start = async () => {
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
      } catch {
        setError(tx("Camera access is unavailable. Enter the barcode below."));
      }
    };
    void start();

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetected, started]);

  if (!started) {
    return (
      <div className="camera-start">
        <Camera aria-hidden="true" />
        <p>{tx("Use your camera to scan an EAN or UPC barcode.")}</p>
        <button className="primary-button" onClick={() => setStarted(true)}>
          {tx("Start camera")}
        </button>
      </div>
    );
  }

  if (error) {
    return <div className="camera-error"><CameraOff />{error}</div>;
  }

  return (
    <div className="camera-frame">
      <video ref={videoRef} muted playsInline aria-label={tx("Barcode")} />
      <div className="scan-window" aria-hidden="true" />
    </div>
  );
}

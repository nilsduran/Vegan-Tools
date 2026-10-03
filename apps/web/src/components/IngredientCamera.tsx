import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, HelpCircle, LoaderCircle, RefreshCw } from "lucide-react";
import { tx } from "../i18n";
import { CameraPermissionModal } from "./CameraPermissionModal";

export function IngredientCamera({
  onCapture,
}: {
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(true);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number>();

  useEffect(() => {
    if (!started) return;
    let active = true;
    let stream: MediaStream | undefined;

    const openCamera = async () => {
      setError("");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (!active || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
          setAspectRatio(videoRef.current.videoWidth / videoRef.current.videoHeight);
        }
        setReady(true);
      } catch {
        setError(tx("Camera access is unavailable. Upload an image below instead."));
        setShowPermissionModal(true);
      }
    };

    void openCamera();
    return () => {
      active = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [started, retryCount]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    setCapturing(true);

    const clientW = video.clientWidth;
    const clientH = video.clientHeight;
    const videoW = video.videoWidth;
    const videoH = video.videoHeight;

    let sx = 0;
    let sy = 0;
    let sWidth = videoW;
    let sHeight = videoH;

    // Ensure the captured frame matches EXACTLY what is visible on screen
    if (clientW > 0 && clientH > 0) {
      const clientAspect = clientW / clientH;
      const videoAspect = videoW / videoH;

      if (Math.abs(clientAspect - videoAspect) > 0.01) {
        if (clientAspect > videoAspect) {
          // Video is cropped vertically on screen
          sHeight = videoW / clientAspect;
          sy = (videoH - sHeight) / 2;
        } else {
          // Video is cropped horizontally on screen
          sWidth = videoH * clientAspect;
          sx = (videoW - sWidth) / 2;
        }
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sWidth));
    canvas.height = Math.max(1, Math.round(sHeight));
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    }
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    setCapturing(false);
    if (blob) {
      onCapture(new File([blob], "ingredient-label.jpg", { type: "image/jpeg" }));
    }
  };

  if (!started) {
    return (
      <div className="ingredient-camera-start">
        <Camera aria-hidden="true" />
        <strong>{tx("Photograph the ingredient label")}</strong>
        <span>{tx("Keep the full list in focus and avoid glare.")}</span>
        <button className="primary-button" onClick={() => setStarted(true)}>
          {tx("Open camera")}
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
          onNativeCapture={onCapture}
        />
      </>
    );
  }

  return (
    <div
      className="ingredient-camera-frame"
      style={aspectRatio ? { aspectRatio: `${aspectRatio}` } : undefined}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label={tx("Photograph the ingredient label")}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth && v.videoHeight) {
            setAspectRatio(v.videoWidth / v.videoHeight);
          }
        }}
      />
      <div className="document-guide" aria-hidden="true" />
      <button
        className="capture-button"
        onClick={() => void capture()}
        disabled={!ready || capturing}
      >
        {capturing ? <LoaderCircle className="spin" /> : <Camera />}
        {tx("Capture label")}
      </button>
    </div>
  );
}

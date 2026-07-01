import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, LoaderCircle } from "lucide-react";

export function IngredientCamera({
  onCapture,
}: {
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!started) return;
    let active = true;
    let stream: MediaStream | undefined;

    const openCamera = async () => {
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
        setReady(true);
      } catch {
        setError("Camera access is unavailable. Upload an image below instead.");
      }
    };

    void openCamera();
    return () => {
      active = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [started]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
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
        <strong>Photograph the ingredient label</strong>
        <span>Keep the full list in focus and avoid glare.</span>
        <button className="primary-button" onClick={() => setStarted(true)}>
          Open camera
        </button>
      </div>
    );
  }

  if (error) {
    return <div className="camera-error"><CameraOff />{error}</div>;
  }

  return (
    <div className="ingredient-camera-frame">
      <video ref={videoRef} muted playsInline aria-label="Ingredient label camera" />
      <div className="document-guide" aria-hidden="true" />
      <button
        className="capture-button"
        onClick={() => void capture()}
        disabled={!ready || capturing}
      >
        {capturing ? <LoaderCircle className="spin" /> : <Camera />}
        Capture label
      </button>
    </div>
  );
}

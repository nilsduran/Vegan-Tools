import { useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera } from "lucide-react";

export function FallbackCapture({ onCapture }: { onCapture: (imageSrc: string) => void }) {
  const webcamRef = useRef<Webcam>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] w-full shadow-2xl">
        {/* @ts-ignore */}
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "environment" }}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <button
            onClick={capture}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl border-[6px] border-white/30 active:scale-95 transition-transform"
          >
            <Camera className="w-8 h-8 text-stone-800" />
          </button>
        </div>
      </div>
      <p className="mt-6 text-center text-sm font-medium text-stone-500">
        Fes una foto clara de la llista d'ingredients.
      </p>
    </div>
  );
}

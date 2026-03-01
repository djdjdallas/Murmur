"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export default function Camera({ onCapture, disabled }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");

  const startCamera = useCallback(async (facing) => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setError(
          "Camera access denied. Please allow camera access in your browser settings to use Murmur."
        );
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError("Could not access camera. Please try again.");
      }
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, startCamera]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);
    onCapture?.(imageBase64);
  }, [cameraReady, onCapture]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) =>
      prev === "environment" ? "user" : "environment"
    );
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-stone-900 text-stone-200 p-6 text-center rounded-2xl">
        <div className="text-4xl mb-4">📷</div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover rounded-2xl"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Hint text overlay — inside camera, above controls */}
      {cameraReady && (
        <div className="absolute bottom-24 left-0 right-0 text-center pointer-events-none z-10">
          <p className="text-white/70 text-sm drop-shadow-lg">
            Point your camera at a plant, tree, bird, insect, or mushroom
          </p>
          <p className="text-white/50 text-xs mt-1 drop-shadow-lg">
            Tap the green button to capture
          </p>
        </div>
      )}

      {/* Camera controls overlay */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-6">
        {/* Flip camera button */}
        <button
          onClick={toggleCamera}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          aria-label="Flip camera"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
            <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
            <polyline points="15 3 13 5 15 7" />
            <polyline points="9 21 11 19 9 17" />
          </svg>
        </button>

        {/* Capture button */}
        <button
          onClick={capture}
          disabled={!cameraReady || disabled}
          className="w-16 h-16 rounded-full bg-white border-4 border-white/50 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Capture photo"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500" />
        </button>

        {/* Spacer to balance layout */}
        <div className="w-10 h-10" />
      </div>

      {/* Camera status indicator */}
      {!cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900/80 rounded-2xl">
          <div className="flex flex-col items-center gap-3 text-stone-300">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Starting camera...</span>
          </div>
        </div>
      )}
    </div>
  );
}

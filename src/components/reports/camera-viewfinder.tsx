"use client";

/**
 * CameraViewfinder — In-browser camera for continuous photo capture
 *
 * Uses getUserMedia to show a live video feed inside the dialog.
 * Tap shutter to capture → photo uploads in background → camera stays open.
 * Tap Done to exit. Apple Notes-style continuous shooting experience.
 *
 * Progressive enhancement: if getUserMedia fails, caller falls back
 * to native <input capture="environment">.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  CameraIcon,
  SwitchCameraIcon,
  CheckCircleIcon,
  XIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CameraViewfinderProps {
  /** Called with the captured photo as a File. Parent handles upload. */
  onCapture: (file: File) => Promise<void>;
  /** Called when user taps Done or Back */
  onClose: () => void;
  /** Called if camera fails to initialize — parent should fallback */
  onError: (message: string) => void;
  /** Number of photos captured in this session (for counter display) */
  capturedCount: number;
}

// ============================================================================
// Component
// ============================================================================

export function CameraViewfinder({
  onCapture,
  onClose,
  onError,
  capturedCount,
}: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flashEffect, setFlashEffect] = useState(false);

  // -------------------------------------------------------------------
  // Start camera stream
  // -------------------------------------------------------------------
  const startCamera = useCallback(
    async (facing: "environment" | "user") => {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsReady(true);
        }
      } catch (err) {
        console.error("Camera access failed:", err);
        const message =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access in your browser settings."
            : "Could not access camera. Using file picker instead.";
        onError(message);
      }
    },
    [onError]
  );

  // -------------------------------------------------------------------
  // Initialize on mount, cleanup on unmount
  // -------------------------------------------------------------------
  useEffect(() => {
    // Check if getUserMedia is available
    if (!navigator.mediaDevices?.getUserMedia) {
      onError("Camera not supported in this browser. Using file picker instead.");
      return;
    }

    startCamera(facingMode);

    return () => {
      // Critical: stop all tracks to release camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // Only run on mount/unmount — facingMode changes handled by flip button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------
  // Flip camera (front ↔ rear)
  // -------------------------------------------------------------------
  const handleFlip = useCallback(() => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    setIsReady(false);
    startCamera(newFacing);
  }, [facingMode, startCamera]);

  // -------------------------------------------------------------------
  // Capture a still frame from the video
  // -------------------------------------------------------------------
  const handleShutter = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Flash effect
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 150);

    // Convert to blob
    setIsCapturing(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      });

      if (blob) {
        const file = new File(
          [blob],
          `camera-${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );
        await onCapture(file);
      }
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCapture]);

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full -mx-6 -mb-6 sm:-mx-6">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/90">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/20 h-8 gap-1.5"
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>

        {capturedCount > 0 && (
          <span className="text-sm font-medium text-white/90">
            {capturedCount} photo{capturedCount !== 1 ? "s" : ""}
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/20 h-8 gap-1.5"
        >
          <CheckCircleIcon className="size-4" />
          Done
        </Button>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px]">
        {!isReady && (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <Spinner className="size-8" />
            <span className="text-sm">Starting camera...</span>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover",
            !isReady && "opacity-0 absolute"
          )}
        />

        {/* Flash overlay */}
        {flashEffect && (
          <div className="absolute inset-0 bg-white/80 pointer-events-none z-10" />
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-6 px-4 py-4 bg-black/90">
        {/* Flip camera */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFlip}
          disabled={!isReady}
          className="text-white hover:bg-white/20 size-12 rounded-full"
        >
          <SwitchCameraIcon className="size-5" />
        </Button>

        {/* Shutter button */}
        <button
          onClick={handleShutter}
          disabled={!isReady || isCapturing}
          className={cn(
            "size-16 rounded-full border-4 border-white flex items-center justify-center transition-all",
            "active:scale-90",
            isCapturing
              ? "bg-white/30"
              : "bg-white/10 hover:bg-white/20"
          )}
        >
          {isCapturing ? (
            <Spinner className="size-6 text-white" />
          ) : (
            <div className="size-12 rounded-full bg-white" />
          )}
        </button>

        {/* Done button (redundant with header, but thumb-reachable) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20 size-12 rounded-full"
        >
          <CheckCircleIcon className="size-5" />
        </Button>
      </div>
    </div>
  );
}

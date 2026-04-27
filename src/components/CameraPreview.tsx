import { useEffect, useRef } from 'react';
import { drawLandmarks, clearCanvas } from '../utils/landmarkUtils';
import type { HandLandmarks } from '../types/mediapipe';

interface CameraPreviewProps {
  videoEl: HTMLVideoElement | null;
  landmarksRef: React.MutableRefObject<HandLandmarks[]>;
}

export function CameraPreview({ videoEl, landmarksRef }: CameraPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // Mirror the external video element into our container
  useEffect(() => {
    if (!videoEl || !containerRef.current) return;
    containerRef.current.appendChild(videoEl);
    return () => {
      videoEl.parentNode?.removeChild(videoEl);
    };
  }, [videoEl]);

  // Draw landmarks each frame
  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const lms = landmarksRef.current;
      if (lms.length > 0) {
        drawLandmarks(canvas, lms[0]);
      } else {
        clearCanvas(canvas);
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [landmarksRef]);

  return (
    <div className="fixed bottom-5 right-5 z-10 w-52 h-40 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 backdrop-blur">
      <div
        ref={containerRef}
        className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>video]:scale-x-[-1]"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none"
      />
    </div>
  );
}

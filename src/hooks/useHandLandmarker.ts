import { useEffect, useRef } from 'react';
import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

interface UseHandLandmarkerOptions {
  videoEl: HTMLVideoElement | null;
  onResult: (result: HandLandmarkerResult) => void;
  enabled: boolean;
}

export function useHandLandmarker({
  videoEl,
  onResult,
  enabled,
}: UseHandLandmarkerOptions) {
  // Keep onResult in a ref so its identity changing doesn't restart the model
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    if (!enabled || !videoEl) return;

    let destroyed = false;
    let rafId = 0;
    let landmarker: HandLandmarker | null = null;
    let lastTs = -1;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
      );

      if (destroyed) return;

      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });

      if (destroyed) {
        landmarker.close();
        landmarker = null;
        return;
      }

      function loop() {
        if (destroyed) return;
        if (!videoEl || videoEl.readyState < 2 || !landmarker) {
          rafId = requestAnimationFrame(loop);
          return;
        }
        const now = performance.now();
        if (now > lastTs) {
          lastTs = now;
          try {
            const result = landmarker.detectForVideo(videoEl, now);
            onResultRef.current(result);
          } catch (e) {
            console.error('MediaPipe detect error:', e);
          }
        }
        rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);
    }

    init().catch((e) => console.error('MediaPipe init error:', e));

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      landmarker?.close();
      landmarker = null;
    };
  }, [enabled, videoEl]); // ⬅ note: onResult NOT in deps (uses ref)
}

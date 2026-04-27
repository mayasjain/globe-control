import { useCallback, useRef } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { useHandLandmarker } from '../hooks/useHandLandmarker';
import { useGestureState } from '../hooks/useGestureState';
import { useGlobeControls } from '../hooks/useGlobeControls';
import { GlobeScene } from './GlobeScene';
import { CameraPreview } from './CameraPreview';
import { GestureOverlay } from './GestureOverlay';
import { DebugPanel } from './DebugPanel';
import { GLOBE_MARKERS } from '../data/globeMarkers';
import type { GestureType } from '../types/gestures';
import type { HandLandmarks } from '../types/mediapipe';

interface GlobeControllerProps {
  videoEl: HTMLVideoElement | null;
  showDebug: boolean;
}

export function GlobeController({ videoEl, showDebug }: GlobeControllerProps) {
  const activeGestureRef = useRef<GestureType>('idle');
  const landmarksRef = useRef<HandLandmarks[]>([]);

  const onGestureChange = useCallback((g: GestureType) => {
    activeGestureRef.current = g;
  }, []);

  const { gestureStateRef, processResult } = useGestureState(onGestureChange);
  const { controlsRef, applyDelta, applyZoom, applyTwoHandZoom } = useGlobeControls();

  const handleResult = useCallback(
    (result: HandLandmarkerResult) => {
      landmarksRef.current = (result.landmarks as HandLandmarks[]) ?? [];
      processResult(result);

      const state = gestureStateRef.current;
      if (state.gesture === 'open-palm') {
        applyDelta(state.deltaX, state.deltaY);
      } else if (state.gesture === 'pinch') {
        applyZoom(state.zoom);
      } else if (state.gesture === 'two-hand-spread' && state.twoHandDistance !== null) {
        applyTwoHandZoom(state.twoHandDistance);
      }
    },
    [processResult, gestureStateRef, applyDelta, applyZoom, applyTwoHandZoom],
  );

  useHandLandmarker({ videoEl, onResult: handleResult, enabled: !!videoEl });

  return (
    <>
      <GlobeScene controlsRef={controlsRef} markers={GLOBE_MARKERS} />
      <CameraPreview videoEl={videoEl} landmarksRef={landmarksRef} />
      <GestureOverlay gestureRef={activeGestureRef} />
      {showDebug && (
        <DebugPanel
          gestureStateRef={gestureStateRef}
          controlsRef={controlsRef}
          landmarksRef={landmarksRef}
        />
      )}
    </>
  );
}

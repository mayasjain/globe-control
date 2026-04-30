import { useCallback, useMemo, useRef } from 'react';
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
import { DEFAULT_PROFILE, type CalibrationProfile } from '../utils/calibrationProfile';

interface GlobeControllerProps {
  videoEl: HTMLVideoElement | null;
  showDebug: boolean;
  profile?: CalibrationProfile;
}

const AUTO_PAUSE_AFTER_MS = 1500;

export function GlobeController({ videoEl, showDebug, profile }: GlobeControllerProps) {
  const activeGestureRef = useRef<GestureType>('idle');
  const landmarksRef = useRef<HandLandmarks[]>([]);
  const lastHandSeenAtRef = useRef<number>(performance.now());

  const { controlsRef, isGrabbingRef, isPausedRef, beginGrab, updateGrab, endGrab, applyTwoHandZoom, tick } =
    useGlobeControls();

  const onGestureChange = useCallback((g: GestureType) => {
    activeGestureRef.current = g;
  }, []);

  const gestureOpts = useMemo(
    () => ({
      profile: profile ?? DEFAULT_PROFILE,
      onGestureChange,
      onGrabStart: beginGrab,
      onGrabMove: updateGrab,
      onGrabEnd: endGrab,
    }),
    [profile, onGestureChange, beginGrab, updateGrab, endGrab],
  );

  const { gestureStateRef, processResult } = useGestureState(gestureOpts);

  const handleResult = useCallback(
    (result: HandLandmarkerResult) => {
      const lms = (result.landmarks as HandLandmarks[]) ?? [];
      landmarksRef.current = lms;

      const now = performance.now();
      if (lms.length > 0) {
        lastHandSeenAtRef.current = now;
        if (isPausedRef.current) isPausedRef.current = false;
      } else if (now - lastHandSeenAtRef.current > AUTO_PAUSE_AFTER_MS) {
        isPausedRef.current = true;
      }

      processResult(result);

      const state = gestureStateRef.current;
      if (state.gesture === 'two-hand-spread' && state.twoHandDistance !== null) {
        applyTwoHandZoom(state.twoHandDistance);
      }
    },
    [processResult, gestureStateRef, applyTwoHandZoom, isPausedRef],
  );

  useHandLandmarker({ videoEl, onResult: handleResult, enabled: !!videoEl });

  return (
    <>
      <GlobeScene
        controlsRef={controlsRef}
        markers={GLOBE_MARKERS}
        tick={tick}
        isGrabbingRef={isGrabbingRef}
      />
      <CameraPreview videoEl={videoEl} landmarksRef={landmarksRef} />
      <GestureOverlay
        gestureRef={activeGestureRef}
        gestureStateRef={gestureStateRef}
        isPausedRef={isPausedRef}
        isGrabbingRef={isGrabbingRef}
      />
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

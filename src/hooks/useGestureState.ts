import { useRef, useCallback } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { GestureType, GestureState } from '../types/gestures';
import {
  isPinching,
  isOpenPalm,
  isFist,
  palmCenter,
  dist2D,
  applyDeadZone,
  THRESHOLDS,
  LM,
} from '../utils/gestureMath';
import { EMA } from '../utils/smoothing';

interface GestureStateRefs {
  gestureStateRef: React.MutableRefObject<GestureState>;
  processResult: (result: HandLandmarkerResult) => void;
}

export function useGestureState(
  onGestureChange: (g: GestureType) => void,
): GestureStateRefs {
  const gestureStateRef = useRef<GestureState>({
    gesture: 'idle',
    deltaX: 0,
    deltaY: 0,
    zoom: 0.5,
    twoHandDistance: null,
  });

  // Smoothers — lower alpha = more lag, less jitter
  const smoothX = useRef(new EMA(0.5, THRESHOLDS.SMOOTHING_ALPHA));
  const smoothY = useRef(new EMA(0.5, THRESHOLDS.SMOOTHING_ALPHA));
  const smoothZoom = useRef(new EMA(0.5, THRESHOLDS.SMOOTHING_ALPHA));
  const smoothTwoHand = useRef(new EMA(0, THRESHOLDS.SMOOTHING_ALPHA));

  // Last smoothed positions (for velocity computation)
  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
  const lastTwoHand = useRef<number | null>(null);

  // Hysteresis
  const pendingGesture = useRef<GestureType>('idle');
  const pendingCount = useRef(0);
  const currentGesture = useRef<GestureType>('idle');

  function confirmGesture(raw: GestureType): GestureType {
    if (raw === currentGesture.current) {
      pendingCount.current = 0;
      return currentGesture.current;
    }
    if (raw === pendingGesture.current) {
      pendingCount.current++;
      if (pendingCount.current >= THRESHOLDS.GESTURE_CONFIRM_FRAMES) {
        pendingCount.current = 0;
        currentGesture.current = raw;
        onGestureChange(raw);
        // Reset velocity tracking on transition so a stale "last" doesn't cause a jump
        lastX.current = null;
        lastY.current = null;
        lastTwoHand.current = null;
      }
    } else {
      pendingGesture.current = raw;
      pendingCount.current = 1;
    }
    return currentGesture.current;
  }

  const processResult = useCallback((result: HandLandmarkerResult) => {
    const hands = result.landmarks;

    if (!hands || hands.length === 0) {
      confirmGesture('idle');
      gestureStateRef.current = {
        gesture: 'idle',
        deltaX: 0,
        deltaY: 0,
        zoom: gestureStateRef.current.zoom,
        twoHandDistance: null,
      };
      lastX.current = null;
      lastY.current = null;
      lastTwoHand.current = null;
      return;
    }

    const lm0 = hands[0];

    // ── Two-hand spread detection ──
    if (hands.length === 2) {
      const c0 = palmCenter(hands[0]);
      const c1 = palmCenter(hands[1]);
      const rawDist = dist2D(
        { x: c0.x, y: c0.y, z: 0 },
        { x: c1.x, y: c1.y, z: 0 },
      );
      const smoothed = smoothTwoHand.current.update(rawDist);

      let velocity = 0;
      if (lastTwoHand.current !== null) {
        velocity = (smoothed - lastTwoHand.current) * THRESHOLDS.ZOOM_SENSITIVITY;
        velocity = applyDeadZone(velocity, THRESHOLDS.DEAD_ZONE);
      }
      lastTwoHand.current = smoothed;

      confirmGesture('two-hand-spread');
      gestureStateRef.current = {
        gesture: 'two-hand-spread',
        deltaX: 0,
        deltaY: 0,
        zoom: gestureStateRef.current.zoom,
        twoHandDistance: velocity,
      };
      return;
    }
    lastTwoHand.current = null;

    // ── Single-hand classification ──
    // Order: pinch > open-palm > fist > idle.
    // Pinch first (most specific). Palm next. Fist last + must be strict (all 4 curled)
    // so it doesn't trigger from a relaxed hand.
    let rawGesture: GestureType = 'idle';
    if (isPinching(lm0)) rawGesture = 'pinch';
    else if (isOpenPalm(lm0)) rawGesture = 'open-palm';
    else if (isFist(lm0)) rawGesture = 'fist';

    const gesture = confirmGesture(rawGesture);

    const palm = palmCenter(lm0);
    const sx = smoothX.current.update(palm.x);
    const sy = smoothY.current.update(palm.y);

    if (gesture === 'open-palm') {
      // Per-frame velocity: change since last frame
      let vx = 0, vy = 0;
      if (lastX.current !== null && lastY.current !== null) {
        vx = (sx - lastX.current) * THRESHOLDS.PALM_SENSITIVITY;
        vy = (sy - lastY.current) * THRESHOLDS.PALM_SENSITIVITY;
        vx = applyDeadZone(vx, THRESHOLDS.DEAD_ZONE);
        vy = applyDeadZone(vy, THRESHOLDS.DEAD_ZONE);
      }
      lastX.current = sx;
      lastY.current = sy;

      gestureStateRef.current = {
        gesture,
        deltaX: -vx, // mirror compensation
        deltaY: vy,
        zoom: gestureStateRef.current.zoom,
        twoHandDistance: null,
      };
    } else if (gesture === 'pinch') {
      const rawDist = dist2D(lm0[LM.THUMB_TIP], lm0[LM.INDEX_TIP]);
      const smoothedDist = smoothZoom.current.update(rawDist);
      const zoom = Math.max(0, Math.min(1, smoothedDist / THRESHOLDS.PINCH_OPEN));
      lastX.current = null;
      lastY.current = null;
      gestureStateRef.current = {
        gesture, deltaX: 0, deltaY: 0, zoom, twoHandDistance: null,
      };
    } else {
      lastX.current = null;
      lastY.current = null;
      gestureStateRef.current = {
        gesture, deltaX: 0, deltaY: 0, zoom: gestureStateRef.current.zoom, twoHandDistance: null,
      };
    }
  }, [onGestureChange]);

  return { gestureStateRef, processResult };
}

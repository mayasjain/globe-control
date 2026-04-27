import { useRef, useCallback, useEffect } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { GestureType, GestureState } from '../types/gestures';
import {
  isOpenPalm,
  pinchDistance,
  palmCenter,
  dist2D,
  applyDeadZone,
  THRESHOLDS,
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

  const smoothX = useRef(new EMA(0.5, THRESHOLDS.SMOOTHING_ALPHA));
  const smoothY = useRef(new EMA(0.5, THRESHOLDS.SMOOTHING_ALPHA));
  const smoothPinch = useRef(new EMA(0.15, THRESHOLDS.SMOOTHING_ALPHA));
  const smoothTwoHand = useRef(new EMA(0, THRESHOLDS.SMOOTHING_ALPHA));

  // Per-frame velocity tracking
  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
  const lastPinch = useRef<number | null>(null);
  const lastTwoHand = useRef<number | null>(null);

  // Stateful pinch with hysteresis
  const isPinchActive = useRef(false);

  const onChangeRef = useRef(onGestureChange);
  useEffect(() => { onChangeRef.current = onGestureChange; }, [onGestureChange]);

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
        onChangeRef.current(raw);
        // Reset velocity tracking on transition
        lastX.current = null;
        lastY.current = null;
        lastPinch.current = null;
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
      isPinchActive.current = false;
      lastX.current = lastY.current = lastPinch.current = lastTwoHand.current = null;
      gestureStateRef.current = { gesture: 'idle', deltaX: 0, deltaY: 0, zoom: 0, twoHandDistance: null };
      return;
    }

    const lm0 = hands[0];

    // ── Two-hand spread → zoom ──
    if (hands.length === 2) {
      isPinchActive.current = false;
      const c0 = palmCenter(hands[0]);
      const c1 = palmCenter(hands[1]);
      const rawDist = dist2D({ x: c0.x, y: c0.y, z: 0 }, { x: c1.x, y: c1.y, z: 0 });
      const smoothed = smoothTwoHand.current.update(rawDist);
      let velocity = 0;
      if (lastTwoHand.current !== null) {
        velocity = (smoothed - lastTwoHand.current) * THRESHOLDS.TWO_HAND_SENSITIVITY;
        velocity = applyDeadZone(velocity, THRESHOLDS.DEAD_ZONE);
      }
      lastTwoHand.current = smoothed;
      confirmGesture('two-hand-spread');
      gestureStateRef.current = {
        gesture: 'two-hand-spread', deltaX: 0, deltaY: 0, zoom: 0, twoHandDistance: velocity,
      };
      return;
    }
    lastTwoHand.current = null;

    // ── Stateful pinch detection (hysteresis) ──
    const rawPinch = pinchDistance(lm0);
    const smoothedPinch = smoothPinch.current.update(rawPinch);

    if (!isPinchActive.current && smoothedPinch < THRESHOLDS.PINCH_ENTER) {
      isPinchActive.current = true;
      lastPinch.current = smoothedPinch;
    } else if (isPinchActive.current && smoothedPinch > THRESHOLDS.PINCH_EXIT) {
      isPinchActive.current = false;
    }

    let rawGesture: GestureType = 'idle';
    if (isPinchActive.current) rawGesture = 'pinch';
    else if (isOpenPalm(lm0)) rawGesture = 'open-palm';

    const gesture = confirmGesture(rawGesture);

    const palm = palmCenter(lm0);
    const sx = smoothX.current.update(palm.x);
    const sy = smoothY.current.update(palm.y);

    if (gesture === 'open-palm') {
      let vx = 0, vy = 0;
      if (lastX.current !== null && lastY.current !== null) {
        vx = (sx - lastX.current) * THRESHOLDS.PALM_SENSITIVITY;
        vy = (sy - lastY.current) * THRESHOLDS.PALM_SENSITIVITY;
        vx = applyDeadZone(vx, THRESHOLDS.DEAD_ZONE);
        vy = applyDeadZone(vy, THRESHOLDS.DEAD_ZONE);
      }
      lastX.current = sx; lastY.current = sy;
      gestureStateRef.current = {
        gesture, deltaX: -vx, deltaY: vy, zoom: 0, twoHandDistance: null,
      };
    } else if (gesture === 'pinch') {
      // Velocity-based pinch zoom: distance decreasing = zoom in (negative altitude delta)
      let zoomVel = 0;
      if (lastPinch.current !== null) {
        // Inverted: closing pinch (negative delta) → zoom IN → negative altitude change
        zoomVel = (smoothedPinch - lastPinch.current) * THRESHOLDS.PINCH_ZOOM_SENSITIVITY;
        zoomVel = applyDeadZone(zoomVel, THRESHOLDS.DEAD_ZONE);
      }
      lastPinch.current = smoothedPinch;
      lastX.current = lastY.current = null;
      gestureStateRef.current = {
        gesture, deltaX: 0, deltaY: 0, zoom: zoomVel, twoHandDistance: null,
      };
    } else {
      lastX.current = lastY.current = lastPinch.current = null;
      gestureStateRef.current = {
        gesture, deltaX: 0, deltaY: 0, zoom: 0, twoHandDistance: null,
      };
    }
  }, []);

  return { gestureStateRef, processResult };
}

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
import { OneEuroFilter } from '../utils/oneEuro';
import { DEFAULT_PROFILE, type CalibrationProfile } from '../utils/calibrationProfile';

// If the hand disappears for less than this, hold state — don't end the grab.
const LOST_TRACK_GRACE_MS = 200;

interface UseGestureStateOptions {
  profile?: CalibrationProfile;
  onGestureChange: (g: GestureType) => void;
  onGrabStart: (x: number, y: number) => void;
  onGrabMove: (x: number, y: number) => void;
  onGrabEnd: () => void;
}

interface GestureStateRefs {
  gestureStateRef: React.MutableRefObject<GestureState>;
  processResult: (result: HandLandmarkerResult) => void;
}

export function useGestureState(opts: UseGestureStateOptions): GestureStateRefs {
  const gestureStateRef = useRef<GestureState>({
    gesture: 'idle',
    deltaX: 0,
    deltaY: 0,
    zoom: 0,
    twoHandDistance: null,
  });

  // Keep callbacks in refs so identity churn doesn't invalidate processResult.
  const cbRef = useRef(opts);
  useEffect(() => { cbRef.current = opts; }, [opts]);

  const profileRef = useRef<CalibrationProfile>(opts.profile ?? DEFAULT_PROFILE);
  useEffect(() => {
    profileRef.current = opts.profile ?? DEFAULT_PROFILE;
  }, [opts.profile]);

  // One-Euro filters: heavy smoothing at rest, responsive during motion.
  const smoothX = useRef(new OneEuroFilter({ minCutoff: 1.0, beta: 0.05 }));
  const smoothY = useRef(new OneEuroFilter({ minCutoff: 1.0, beta: 0.05 }));
  const smoothPinch = useRef(new OneEuroFilter({ minCutoff: 1.5, beta: 0.04 }));
  const smoothTwoHand = useRef(new OneEuroFilter({ minCutoff: 1.0, beta: 0.05 }));

  const lastTwoHand = useRef<number | null>(null);

  // Stateful pinch with hysteresis. While true, we are in a "grab".
  const isPinchActive = useRef(false);
  // Last palm position seen — used to keep firing onGrabMove during grace.
  const lastPalm = useRef<{ x: number; y: number } | null>(null);
  // When did we last see zero hands? null = currently tracking.
  const lostSinceMs = useRef<number | null>(null);

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
        cbRef.current.onGestureChange(raw);
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
    const now = performance.now();
    const profile = profileRef.current;

    // ── Lost-track grace ──────────────────────────────────────────────────
    if (!hands || hands.length === 0) {
      if (lostSinceMs.current === null) lostSinceMs.current = now;
      const lostFor = now - lostSinceMs.current;

      if (lostFor < LOST_TRACK_GRACE_MS) {
        // Hold gesture state. If we were grabbing, keep firing onGrabMove with
        // the last palm position so the globe target doesn't snap back.
        if (isPinchActive.current && lastPalm.current) {
          cbRef.current.onGrabMove(lastPalm.current.x, lastPalm.current.y);
        }
        return;
      }

      // Grace expired — commit reset.
      if (isPinchActive.current) {
        isPinchActive.current = false;
        cbRef.current.onGrabEnd();
      }
      confirmGesture('idle');
      lastTwoHand.current = null;
      lastPalm.current = null;
      smoothX.current.reset();
      smoothY.current.reset();
      smoothPinch.current.reset();
      smoothTwoHand.current.reset();
      gestureStateRef.current = { gesture: 'idle', deltaX: 0, deltaY: 0, zoom: 0, twoHandDistance: null };
      return;
    }

    lostSinceMs.current = null;
    const lm0 = hands[0];

    // ── Two-hand spread → zoom ───────────────────────────────────────────
    if (hands.length === 2) {
      // Two hands cancel any in-progress grab.
      if (isPinchActive.current) {
        isPinchActive.current = false;
        cbRef.current.onGrabEnd();
      }
      const c0 = palmCenter(hands[0]);
      const c1 = palmCenter(hands[1]);
      const rawDist = dist2D({ x: c0.x, y: c0.y, z: 0 }, { x: c1.x, y: c1.y, z: 0 });
      const smoothed = smoothTwoHand.current.update(rawDist, now);
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

    // ── Single-hand: pinch hysteresis + grab events ──────────────────────
    const palm = palmCenter(lm0);
    const sx = smoothX.current.update(palm.x, now);
    const sy = smoothY.current.update(palm.y, now);
    lastPalm.current = { x: sx, y: sy };

    const rawPinch = pinchDistance(lm0);
    const smoothedPinch = smoothPinch.current.update(rawPinch, now);

    const wasPinching = isPinchActive.current;
    if (!isPinchActive.current && smoothedPinch < profile.pinchEnter) {
      isPinchActive.current = true;
    } else if (isPinchActive.current && smoothedPinch > profile.pinchExit) {
      isPinchActive.current = false;
    }

    if (!wasPinching && isPinchActive.current) {
      cbRef.current.onGrabStart(sx, sy);
    } else if (wasPinching && !isPinchActive.current) {
      cbRef.current.onGrabEnd();
    } else if (isPinchActive.current) {
      cbRef.current.onGrabMove(sx, sy);
    }

    let rawGesture: GestureType = 'idle';
    if (isPinchActive.current) rawGesture = 'pinch';
    else if (isOpenPalm(lm0, profile.extThreshold, profile.pinchEnter)) rawGesture = 'open-palm';

    const gesture = confirmGesture(rawGesture);

    // Live numeric feedback for the HUD: pinch closeness (0 closed → 1 open),
    // normalized against the user's calibrated band.
    const pinchClose = clamp01(
      (smoothedPinch - profile.pinchEnter) / (profile.pinchExit - profile.pinchEnter),
    );

    gestureStateRef.current = {
      gesture,
      deltaX: 0,
      deltaY: 0,
      zoom: pinchClose,
      twoHandDistance: null,
    };
  }, []);

  return { gestureStateRef, processResult };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

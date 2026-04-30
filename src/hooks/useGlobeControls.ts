import { useRef, useCallback } from 'react';
import { clamp, THRESHOLDS } from '../utils/gestureMath';

export interface GlobeControlValues {
  lat: number;
  lng: number;
  altitude: number;
  targetLat: number;
  targetLng: number;
  targetAltitude: number;
}

const ALT_MIN = 0.08;
const ALT_MAX = 5.0;

// Grab-and-drag: hand position (normalized 0..1) → degrees of rotation.
// Multiply by altScale so close-in pans aren't twitchy.
const GRAB_GAIN_LNG = 220;
const GRAB_GAIN_LAT = 160;

// Inertia decay time constant (seconds). Higher = longer coast.
const INERTIA_TAU = 0.8;
// Velocity (deg/s) below this magnitude is considered settled and zeroed out.
const INERTIA_EPSILON = 0.5;
// Cap release velocity so a flick can't fling the camera off a pole.
const INERTIA_MAX = 360;

function wrapLng(lng: number): number {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}

// Shortest signed delta from a → b on a ±180° circle.
function shortestAngleDelta(from: number, to: number): number {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  else if (d < -180) d += 360;
  return d;
}

interface GrabAnchor {
  handX0: number;
  handY0: number;
  lng0: number;
  lat0: number;
  altScale: number; // captured at grab start so updates feel consistent
  // Last two samples for release-velocity estimation.
  lastX: number;
  lastY: number;
  lastT: number;
  prevX: number;
  prevY: number;
  prevT: number;
}

export function useGlobeControls() {
  const controlsRef = useRef<GlobeControlValues>({
    lat: 20,
    lng: 0,
    altitude: 2.5,
    targetLat: 20,
    targetLng: 0,
    targetAltitude: 2.5,
  });

  const isGrabbingRef = useRef(false);
  const isPausedRef = useRef(false);
  const anchorRef = useRef<GrabAnchor | null>(null);
  // Inertia velocities in deg/s, applied to targets each tick.
  const inertiaRef = useRef({ vLng: 0, vLat: 0 });

  const beginGrab = useCallback((x: number, y: number) => {
    const c = controlsRef.current;
    isGrabbingRef.current = true;
    inertiaRef.current.vLng = 0;
    inertiaRef.current.vLat = 0;
    const now = performance.now();
    anchorRef.current = {
      handX0: x,
      handY0: y,
      lng0: c.targetLng,
      lat0: c.targetLat,
      altScale: clamp(c.targetAltitude / 2.5, 0.3, 1.0),
      lastX: x,
      lastY: y,
      lastT: now,
      prevX: x,
      prevY: y,
      prevT: now,
    };
  }, []);

  const updateGrab = useCallback((x: number, y: number) => {
    const a = anchorRef.current;
    if (!a) return;
    const c = controlsRef.current;
    // Mirrored video: hand moving right → globe rotates so surface follows hand
    // → lng decreases. Hand moving down → lat decreases.
    c.targetLng = wrapLng(a.lng0 - (x - a.handX0) * GRAB_GAIN_LNG * a.altScale);
    c.targetLat = clamp(a.lat0 - (y - a.handY0) * GRAB_GAIN_LAT * a.altScale, -85, 85);

    const now = performance.now();
    a.prevX = a.lastX;
    a.prevY = a.lastY;
    a.prevT = a.lastT;
    a.lastX = x;
    a.lastY = y;
    a.lastT = now;
  }, []);

  const endGrab = useCallback(() => {
    const a = anchorRef.current;
    isGrabbingRef.current = false;
    if (!a) {
      return;
    }
    // Velocity from the last sample interval (normalized hand units / second),
    // converted to deg/s using the same gain we used during the grab.
    const dtSec = (a.lastT - a.prevT) / 1000;
    if (dtSec > 1e-3 && dtSec < 0.2) {
      const vxNorm = (a.lastX - a.prevX) / dtSec;
      const vyNorm = (a.lastY - a.prevY) / dtSec;
      const vLng = -vxNorm * GRAB_GAIN_LNG * a.altScale;
      const vLat = -vyNorm * GRAB_GAIN_LAT * a.altScale;
      inertiaRef.current.vLng = clamp(vLng, -INERTIA_MAX, INERTIA_MAX);
      inertiaRef.current.vLat = clamp(vLat, -INERTIA_MAX, INERTIA_MAX);
    } else {
      inertiaRef.current.vLng = 0;
      inertiaRef.current.vLat = 0;
    }
    anchorRef.current = null;
  }, []);

  const applyTwoHandZoom = useCallback((velocity: number) => {
    const c = controlsRef.current;
    c.targetAltitude = clamp(c.targetAltitude - velocity * c.targetAltitude, ALT_MIN, ALT_MAX);
  }, []);

  // Frame-rate independent ease toward target; applies inertia when not grabbing.
  const tick = useCallback((dt: number) => {
    if (dt <= 0) return;
    const c = controlsRef.current;
    const inertia = inertiaRef.current;

    if (!isGrabbingRef.current) {
      if (isPausedRef.current) {
        // Auto-paused (no hand seen for a while). Halt coast so the globe
        // doesn't drift away while the user has stepped away.
        inertia.vLng = 0;
        inertia.vLat = 0;
      } else {
        const decay = Math.exp(-dt / INERTIA_TAU);
        c.targetLng = wrapLng(c.targetLng + inertia.vLng * dt);
        c.targetLat = clamp(c.targetLat + inertia.vLat * dt, -85, 85);
        inertia.vLng *= decay;
        inertia.vLat *= decay;
        if (Math.abs(inertia.vLng) < INERTIA_EPSILON) inertia.vLng = 0;
        if (Math.abs(inertia.vLat) < INERTIA_EPSILON) inertia.vLat = 0;
      }
    }

    const tRot = 1 - Math.exp(-dt / THRESHOLDS.TAU_ROT);
    const tAlt = 1 - Math.exp(-dt / THRESHOLDS.TAU_ALT);
    c.lat += (c.targetLat - c.lat) * tRot;
    c.lng = wrapLng(c.lng + shortestAngleDelta(c.lng, c.targetLng) * tRot);
    c.altitude += (c.targetAltitude - c.altitude) * tAlt;
  }, []);

  return {
    controlsRef,
    isGrabbingRef,
    isPausedRef,
    beginGrab,
    updateGrab,
    endGrab,
    applyTwoHandZoom,
    tick,
  };
}

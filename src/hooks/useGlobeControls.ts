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
const ROTATION_GAIN = 280;

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

export function useGlobeControls() {
  const controlsRef = useRef<GlobeControlValues>({
    lat: 20,
    lng: 0,
    altitude: 2.5,
    targetLat: 20,
    targetLng: 0,
    targetAltitude: 2.5,
  });

  const applyDelta = useCallback((deltaX: number, deltaY: number) => {
    const c = controlsRef.current;
    const altScale = clamp(c.targetAltitude / 2.5, 0.3, 1.0);
    c.targetLng = wrapLng(c.targetLng - deltaX * ROTATION_GAIN * altScale);
    c.targetLat = clamp(c.targetLat + deltaY * ROTATION_GAIN * altScale, -85, 85);
  }, []);

  // Velocity-based zoom: positive zoomVel = pinch spreading = zoom out (alt up)
  // negative zoomVel = pinch closing = zoom in (alt down)
  const applyZoomVelocity = useCallback((zoomVel: number) => {
    const c = controlsRef.current;
    c.targetAltitude = clamp(c.targetAltitude + zoomVel * c.targetAltitude, ALT_MIN, ALT_MAX);
  }, []);

  const applyTwoHandZoom = useCallback((velocity: number) => {
    const c = controlsRef.current;
    c.targetAltitude = clamp(c.targetAltitude - velocity * c.targetAltitude, ALT_MIN, ALT_MAX);
  }, []);

  // Frame-rate independent ease toward target. Called from useFrame.
  const tick = useCallback((dt: number) => {
    if (dt <= 0) return;
    const c = controlsRef.current;
    const tRot = 1 - Math.exp(-dt / THRESHOLDS.TAU_ROT);
    const tAlt = 1 - Math.exp(-dt / THRESHOLDS.TAU_ALT);
    c.lat += (c.targetLat - c.lat) * tRot;
    c.lng = wrapLng(c.lng + shortestAngleDelta(c.lng, c.targetLng) * tRot);
    c.altitude += (c.targetAltitude - c.altitude) * tAlt;
  }, []);

  return { controlsRef, applyDelta, applyZoomVelocity, applyTwoHandZoom, tick };
}

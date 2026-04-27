import { useRef, useCallback } from 'react';
import { clamp } from '../utils/gestureMath';

export interface GlobeControlValues {
  lat: number;
  lng: number;
  altitude: number;
}

const ALT_MIN = 0.08;
const ALT_MAX = 5.0;
const ROTATION_GAIN = 280;

export function useGlobeControls() {
  const controlsRef = useRef<GlobeControlValues>({
    lat: 20,
    lng: 0,
    altitude: 2.5,
  });

  const applyDelta = useCallback((deltaX: number, deltaY: number) => {
    const c = controlsRef.current;
    const altScale = clamp(c.altitude / 2.5, 0.3, 1.0);
    c.lng = ((c.lng - deltaX * ROTATION_GAIN * altScale + 180) % 360 + 360) % 360 - 180;
    c.lat = clamp(c.lat + deltaY * ROTATION_GAIN * altScale, -85, 85);
  }, []);

  // Velocity-based zoom: positive zoomVel = pinch spreading = zoom out (alt up)
  // negative zoomVel = pinch closing = zoom in (alt down)
  const applyZoomVelocity = useCallback((zoomVel: number) => {
    const c = controlsRef.current;
    // Scale rate by current altitude so zooming feels uniform across distances
    c.altitude = clamp(c.altitude + zoomVel * c.altitude, ALT_MIN, ALT_MAX);
  }, []);

  const applyTwoHandZoom = useCallback((velocity: number) => {
    const c = controlsRef.current;
    c.altitude = clamp(c.altitude - velocity * c.altitude, ALT_MIN, ALT_MAX);
  }, []);

  return { controlsRef, applyDelta, applyZoomVelocity, applyTwoHandZoom };
}

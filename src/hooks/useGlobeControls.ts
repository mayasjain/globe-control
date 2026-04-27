import { useRef, useCallback } from 'react';
import { clamp } from '../utils/gestureMath';

export interface GlobeControlValues {
  lat: number;
  lng: number;
  altitude: number;
}

const ALT_MIN = 0.08;
const ALT_MAX = 5.0;
const ROTATION_GAIN = 220;
const PINCH_ALT_RANGE = [ALT_MIN, 3.5] as const;

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

  const applyZoom = useCallback((zoom: number) => {
    const target = PINCH_ALT_RANGE[0] + zoom * (PINCH_ALT_RANGE[1] - PINCH_ALT_RANGE[0]);
    controlsRef.current.altitude += (target - controlsRef.current.altitude) * 0.04;
    controlsRef.current.altitude = clamp(controlsRef.current.altitude, ALT_MIN, ALT_MAX);
  }, []);

  const applyTwoHandZoom = useCallback((velocity: number) => {
    controlsRef.current.altitude = clamp(
      controlsRef.current.altitude - velocity * 12,
      ALT_MIN,
      ALT_MAX,
    );
  }, []);

  return { controlsRef, applyDelta, applyZoom, applyTwoHandZoom };
}

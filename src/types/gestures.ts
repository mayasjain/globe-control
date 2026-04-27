export type GestureType =
  | 'idle'
  | 'open-palm'
  | 'pinch'
  | 'fist'
  | 'two-hand-spread';

export interface GestureState {
  gesture: GestureType;
  // Normalized -1..1 deltas for globe movement
  deltaX: number;  // left/right → longitude
  deltaY: number;  // up/down   → latitude
  zoom: number;    // 0..1 pinch scale (0=closed, 1=fully open)
  twoHandDistance: number | null; // px distance between hands, null if one hand
}

export interface PalmPosition {
  x: number;
  y: number;
}

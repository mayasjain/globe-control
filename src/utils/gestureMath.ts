import type { Landmark, HandLandmarks } from '../types/mediapipe';

// ── Landmark indices ──────────────────────────────────────────────────────────
export const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_TIP: 20,
} as const;

// ── Tunable thresholds ────────────────────────────────────────────────────────
export const THRESHOLDS = {
  PINCH_ENTER: 0.07,         // enter pinch when thumb↔index < this
  PINCH_EXIT:  0.22,         // exit pinch when thumb↔index > this (hysteresis)
  DEAD_ZONE: 0.003,          // per-frame velocity dead zone
  PALM_SENSITIVITY: 0.85,    // velocity multiplier for palm swipe → rotation
  PINCH_ZOOM_SENSITIVITY: 6, // pinch distance velocity → altitude change
  TWO_HAND_SENSITIVITY: 8,   // two-hand spread velocity → altitude change
  GESTURE_CONFIRM_FRAMES: 3,
  SMOOTHING_ALPHA: 0.18,
};

// ── Math helpers ──────────────────────────────────────────────────────────────
export function dist2D(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function applyDeadZone(v: number, zone: number): number {
  if (Math.abs(v) < zone) return 0;
  return (v - Math.sign(v) * zone) / (1 - zone);
}

// ── Gesture detectors ─────────────────────────────────────────────────────────
export function pinchDistance(lm: HandLandmarks): number {
  return dist2D(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]);
}
/** Stateless quick check used during calibration only */
export function isPinching(lm: HandLandmarks): boolean {
  return pinchDistance(lm) < THRESHOLDS.PINCH_ENTER;
}

/**
 * Returns how extended a finger is (orientation-independent).
 * Ratio = dist(tip → wrist) / dist(mcp → wrist).
 * Extended finger: ratio ≈ 2.0+. Curled finger: ratio ≈ 0.9–1.2.
 */
function fingerExtensionRatio(lm: HandLandmarks, tipIdx: number, mcpIdx: number): number {
  const tipDist = dist2D(lm[tipIdx], lm[LM.WRIST]);
  const mcpDist = dist2D(lm[mcpIdx], lm[LM.WRIST]);
  if (mcpDist < 1e-6) return 1;
  return tipDist / mcpDist;
}

const EXT_THRESHOLD = 1.5; // ratio above this = finger extended

export function isOpenPalm(lm: HandLandmarks): boolean {
  const r1 = fingerExtensionRatio(lm, LM.INDEX_TIP,  LM.INDEX_MCP);
  const r2 = fingerExtensionRatio(lm, LM.MIDDLE_TIP, LM.MIDDLE_MCP);
  const r3 = fingerExtensionRatio(lm, LM.RING_TIP,   LM.RING_MCP);
  const r4 = fingerExtensionRatio(lm, LM.PINKY_TIP,  LM.PINKY_MCP);
  // All four fingers extended (lenient: at least 3 of 4 strongly extended)
  const extendedCount = [r1, r2, r3, r4].filter((r) => r > EXT_THRESHOLD).length;
  return extendedCount >= 3 && !isPinching(lm);
}

export function isFist(lm: HandLandmarks): boolean {
  const r1 = fingerExtensionRatio(lm, LM.INDEX_TIP,  LM.INDEX_MCP);
  const r2 = fingerExtensionRatio(lm, LM.MIDDLE_TIP, LM.MIDDLE_MCP);
  const r3 = fingerExtensionRatio(lm, LM.RING_TIP,   LM.RING_MCP);
  const r4 = fingerExtensionRatio(lm, LM.PINKY_TIP,  LM.PINKY_MCP);
  // ALL four fingers strongly curled (strict so it doesn't trigger by accident)
  const curledCount = [r1, r2, r3, r4].filter((r) => r < 1.25).length;
  return curledCount === 4;
}

export function palmCenter(lm: HandLandmarks): { x: number; y: number } {
  return { x: lm[LM.WRIST].x, y: lm[LM.WRIST].y };
}

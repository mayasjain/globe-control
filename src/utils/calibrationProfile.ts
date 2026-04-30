// Per-user gesture thresholds, persisted across sessions.
// Sampled during CalibrationScreen and read by useGestureState.

const STORAGE_KEY = 'globeControl.calibration.v1';

export interface CalibrationProfile {
  pinchEnter: number;   // close threshold (thumb↔index distance)
  pinchExit: number;    // open threshold; > pinchEnter for hysteresis
  extThreshold: number; // finger extension ratio for open-palm detection
  version: 1;
}

export const DEFAULT_PROFILE: CalibrationProfile = {
  pinchEnter: 0.07,
  pinchExit: 0.22,
  extThreshold: 1.5,
  version: 1,
};

export function loadProfile(): CalibrationProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return null;
    if (
      typeof parsed.pinchEnter !== 'number' ||
      typeof parsed.pinchExit !== 'number' ||
      typeof parsed.extThreshold !== 'number'
    ) return null;
    return parsed as CalibrationProfile;
  } catch {
    return null;
  }
}

export function saveProfile(p: CalibrationProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // localStorage unavailable (private mode, quota) — silently skip.
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Build a profile from samples collected during calibration.
// pinchSamples: thumb↔index distances captured while user held the pinch.
// extSamples: finger-extension ratios captured while user held open palm.
export function profileFromSamples(
  pinchSamples: number[],
  extSamples: number[],
): CalibrationProfile {
  const pinchMin = pinchSamples.length
    ? percentile(pinchSamples, 0.2)
    : DEFAULT_PROFILE.pinchEnter;
  // Floor + small margin so we don't end up with a hair-trigger threshold.
  const pinchEnter = Math.max(0.04, pinchMin + 0.01);
  const pinchExit = pinchEnter + 0.12;

  const extLow = extSamples.length
    ? percentile(extSamples, 0.2)
    : DEFAULT_PROFILE.extThreshold + 0.15;
  const extThreshold = Math.max(1.3, extLow - 0.15);

  return { pinchEnter, pinchExit, extThreshold, version: 1 };
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx];
}

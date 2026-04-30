# Globe Control — CLAUDE.md

## What this is
Browser MVP: hand gestures via webcam control a 3D Earth globe. No backend. No custom ML.

## Stack
- React 19 + Vite 8 + TypeScript 6
- React Three Fiber + Drei for 3D scene
- three-globe for Earth rendering
- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) for hand tracking
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin)

## App flow
`App.tsx` owns a `phase` state machine: `permission → calibration → globe`.
- **PermissionGate** — requests camera, creates the `<video>` imperatively, hands it up.
- **CalibrationScreen** — hosts the same `videoEl`, walks the user through `detecting → open-palm → pinch → done`. Each step requires holding the gesture for `HOLD_FRAMES_REQUIRED` (~12 frames). While holding, samples are collected and a `CalibrationProfile` is saved to `localStorage` on completion. User can skip.
- Returning users with a saved profile **skip CalibrationScreen** entirely; a "Recalibrate" button on the globe screen clears the profile and re-enters calibration.
- **GlobeController** — wires hooks to scene/overlays once calibration completes.

## Architecture
```
useHandLandmarker  →  raw MediaPipe results (rAF loop, no React state, paused on document.hidden)
useGestureState    →  pinch hysteresis + grab events (onGrabStart/Move/End), one-euro filtered
useGlobeControls   →  grab anchor + inertia + target lat/lng/altitude + eased current values
GlobeScene         →  pure renderer, calls tick(dt) + reads controlsRef in useFrame
GestureOverlay     →  HUD: rotate/zoom rows + pinch-closeness bar, polled at ~11fps
DebugPanel         →  polls all refs at 5fps
```

**Rule:** fast-changing values (landmarks, gesture, rotation) live in refs. React state only for: `phase`, `videoEl`, `showDebug`, and `profile`.

## Control model (grab-and-drag + inertia)
- `useGestureState` watches a single hand's pinch state with hysteresis (`pinchEnter` < `pinchExit`, both per-user). On the rising edge it fires `onGrabStart(x, y)`; while held, `onGrabMove(x, y)` each frame; on falling edge `onGrabEnd()`.
- `useGlobeControls.beginGrab` snapshots `(handX0, handY0, lng0, lat0)`. `updateGrab` writes `targetLng/targetLat` directly from the hand displacement (no velocity integration during grab). `endGrab` derives a release velocity from the last sample interval and seeds inertia (`vLng`, `vLat` in deg/s).
- `tick(dt)` (called from `useFrame`):
  - When grabbing: just eases live `lat/lng/altitude` toward targets (`TAU_ROT`, `TAU_ALT`).
  - When not grabbing: applies + decays inertia (`INERTIA_TAU ≈ 0.8s`, hard cap `INERTIA_MAX = 360 deg/s`) into the target before the same easing.
- Two-hand spread is the primary zoom; its velocity feeds `applyTwoHandZoom`. Single-hand pinch-zoom is gone — pinch now exclusively means "grab".
- Longitude wraps at ±180°; lat clamps to ±85°; altitude clamps `[0.08, 5.0]`. Grab gain scales with `altScale = clamp(targetAltitude / 2.5, 0.3, 1.0)` so close-in pans aren't twitchy.

## Stability features
- **One-Euro filter** (`src/utils/oneEuro.ts`) smooths palm.x, palm.y, pinch distance, and two-hand distance — adapts smoothing to motion speed (heavy at rest, responsive in motion). Replaces the prior EMA.
- **Lost-track grace** (200 ms) in `useGestureState`: if hands disappear briefly, the active grab is held alive and `onGrabMove` keeps firing with the last palm position. After grace expires, `onGrabEnd` fires and state fully resets.
- **Auto-pause** in `GlobeController`: after 1500 ms with zero hands seen, `isPausedRef = true`. `useGlobeControls.tick` zeroes inertia while paused, so the globe doesn't drift away when the user steps out of frame. Resumes on next detection.
- **Tab visibility**: `useHandLandmarker` skips MediaPipe inference while `document.hidden`.
- **Per-user thresholds**: `pinchEnter`, `pinchExit`, and the open-palm `extThreshold` come from the saved `CalibrationProfile` (or `DEFAULT_PROFILE` fallback) and flow through `GlobeController → useGestureState`.

## Gesture thresholds
Global tunables in `src/utils/gestureMath.ts` → `THRESHOLDS`. Per-user values in `src/utils/calibrationProfile.ts` → `CalibrationProfile`. Gesture transitions still require `GESTURE_CONFIRM_FRAMES` consecutive frames.

## Gesture mapping
| Gesture | Action |
|---|---|
| Pinch (single hand) | **Grab** the globe; drag to rotate; release to coast (inertia) |
| Two hands apart / together | Zoom (spread velocity → altitude delta) |
| Open palm | Informational state — HUD shows "ready to grab"; no movement |
| No hand for >1.5s | Auto-pause; inertia halts |

> Note: `isFist` is implemented in `gestureMath.ts` but not wired into the classifier — no fist-driven action exists.

## Key gotchas
- MediaPipe needs `runningMode: 'VIDEO'` and `performance.now()` timestamps (not frame counters)
- Must be served over HTTP (not `file://`) due to WASM CORS
- Camera video element is created imperatively in `PermissionGate`, not via JSX
- `three-globe` adds itself directly to the Three.js scene — access via `useThree().scene`

## File map
```
src/
  app/App.tsx              — root: phase machine, profile load/save, Recalibrate button
  components/
    GlobeScene.tsx         — Canvas + three-globe (Earth, atmosphere, clouds, rings, labels, stars); pulses atmosphere on grab
    GlobeController.tsx    — wires hooks; tracks no-hand timer for auto-pause
    CameraPreview.tsx      — PIP webcam + landmark canvas overlay
    GestureOverlay.tsx     — HUD with rotate/zoom rows + live pinch-closeness bar
    PermissionGate.tsx     — camera permission screen
    CalibrationScreen.tsx  — guided 3-step calibration; samples + saves a CalibrationProfile
    DebugPanel.tsx         — toggleable debug info
  hooks/
    useHandLandmarker.ts   — MediaPipe init + rAF inference loop; pauses on document.hidden
    useGestureState.ts     — pinch hysteresis + grab events + lost-track grace; one-euro filtered
    useGlobeControls.ts    — grab anchor + inertia + target/eased lat/lng/altitude
  utils/
    gestureMath.ts         — THRESHOLDS, detectors, math helpers
    oneEuro.ts             — One-Euro filter (adaptive smoothing)
    calibrationProfile.ts  — per-user profile type + load/save/clear + sample → profile builder
    landmarkUtils.ts       — canvas drawing helpers
  types/
    gestures.ts            — GestureType, GestureState
    mediapipe.ts           — Landmark, HandLandmarks
  data/globeMarkers.ts     — city marker data
  styles/globals.css       — Tailwind import + base reset
```

## Commands
```bash
npm run dev        # local dev server
npm run typecheck  # TS check (no emit)
npm run build      # production build
npm run format     # prettier
```

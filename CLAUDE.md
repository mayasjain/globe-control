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
- **CalibrationScreen** — hosts the same `videoEl`, walks the user through `detecting → open-palm → pinch → done`. Each step requires holding the gesture for `HOLD_FRAMES_REQUIRED` (~12 frames). User can skip.
- **GlobeController** — wires hooks to scene/overlays once calibration completes.

## Architecture
```
useHandLandmarker  →  raw MediaPipe results (rAF loop, no React state)
useGestureState    →  gesture classification + per-frame velocities (refs, not state)
useGlobeControls   →  target lat/lng/altitude + eased current values (refs, not state)
GlobeScene         →  pure renderer, calls tick(dt) + reads controlsRef in useFrame
GestureOverlay     →  polls gestureRef at 12fps for UI label update
DebugPanel         →  polls all refs at 5fps
```

**Rule:** fast-changing values (landmarks, gesture, rotation) live in refs. React state only for: `phase`, `videoEl`, and `showDebug`.

## Control model (velocity-based)
- `useGestureState` outputs **per-frame deltas** (vx, vy, zoomVel) from EMA-smoothed landmark positions, with a dead zone applied.
- `useGlobeControls` integrates those deltas into `targetLat / targetLng / targetAltitude`, then `tick(dt)` (called from `useFrame`) eases the live `lat / lng / altitude` toward the target with frame-rate-independent exponential smoothing (`TAU_ROT`, `TAU_ALT`).
- Longitude wraps at ±180°; lat clamps to ±85°; altitude clamps `[0.08, 5.0]`. Rotation gain scales down at low altitude so close-in pans aren't twitchy.

## Gesture thresholds
All in `src/utils/gestureMath.ts` → `THRESHOLDS` object. Pinch uses **hysteresis** (`PINCH_ENTER` < `PINCH_EXIT`) so it doesn't flicker; gesture transitions require `GESTURE_CONFIRM_FRAMES` consecutive frames before committing.

## Gesture mapping
| Gesture | Action |
|---|---|
| Open palm + move | Rotate globe (palm velocity → lat/lng deltas) |
| Pinch open/close | Zoom (pinch-distance velocity → altitude delta) |
| Two hands apart | Zoom (inter-hand-distance velocity → altitude delta) |
| Idle / no hand | No movement; eases toward last target |

> Note: `isFist` is implemented in `gestureMath.ts` but not currently wired into the classifier — no fist-driven action exists.

## Key gotchas
- MediaPipe needs `runningMode: 'VIDEO'` and `performance.now()` timestamps (not frame counters)
- Must be served over HTTP (not `file://`) due to WASM CORS
- Camera video element is created imperatively in `PermissionGate`, not via JSX
- `three-globe` adds itself directly to the Three.js scene — access via `useThree().scene`

## File map
```
src/
  app/App.tsx              — root, owns videoEl + showDebug state
  components/
    GlobeScene.tsx         — Canvas + three-globe (Earth, atmosphere, clouds, rings, labels, stars)
    GlobeController.tsx    — wires hooks to components
    CameraPreview.tsx      — PIP webcam + landmark canvas overlay
    GestureOverlay.tsx     — gesture label pill (top center)
    PermissionGate.tsx     — camera permission screen
    CalibrationScreen.tsx  — guided 3-step gesture calibration before globe
    DebugPanel.tsx         — toggleable debug info
  hooks/
    useHandLandmarker.ts   — MediaPipe init + rAF inference loop
    useGestureState.ts     — landmark → gesture + smoothing
    useGlobeControls.ts    — gesture → lat/lng/altitude
  utils/
    gestureMath.ts         — THRESHOLDS, detectors, math helpers
    smoothing.ts           — EMA, MovingAverage
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

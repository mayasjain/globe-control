# Globe Control — CLAUDE.md

## What this is
Browser MVP: hand gestures via webcam control a 3D Earth globe. No backend. No custom ML.

## Stack
- React 19 + Vite 8 + TypeScript 6
- React Three Fiber + Drei for 3D scene
- three-globe for Earth rendering
- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) for hand tracking
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin)

## Architecture
```
useHandLandmarker  →  raw MediaPipe results (rAF loop, no React state)
useGestureState    →  gesture classification + smoothing (refs, not state)
useGlobeControls   →  lat/lng/altitude control values (refs, not state)
GlobeScene         →  pure renderer, reads controlsRef in useFrame
GestureOverlay     →  polls gestureRef at 12fps for UI label update
DebugPanel         →  polls all refs at 5fps
```

**Rule:** fast-changing values (landmarks, gesture, rotation) live in refs. React state only for: camera granted (`videoEl`) and `showDebug`.

## Gesture thresholds
All in `src/utils/gestureMath.ts` → `THRESHOLDS` object.

## Gesture mapping
| Gesture | Action |
|---|---|
| Open palm + move | Rotate globe (lng ← wrist X, lat ← wrist Y) |
| Pinch | Zoom (pinch distance → altitude) |
| Fist | Pause (no globe movement) |
| Two hands apart | Zoom in/out |

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
    GlobeScene.tsx         — Canvas + three-globe rendering
    GlobeController.tsx    — wires hooks to components
    CameraPreview.tsx      — PIP webcam + landmark canvas overlay
    GestureOverlay.tsx     — gesture label pill (top center)
    PermissionGate.tsx     — camera permission screen
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

# Globe Control

Control a 3D Earth globe with your hand gestures — runs entirely in the browser.

## Gestures

| Gesture | Action |
|---|---|
| 🤌 Pinch (thumb + index) | Grab the globe; drag to rotate, release to coast |
| ↔ Two hands apart/together | Zoom in/out |
| 🖐 Open palm | Ready state — HUD shows "ready to grab" |
| No hand for >1.5s | Auto-pause; inertia halts |

First-time users are walked through a short calibration (open palm → pinch) so thresholds match their hand. The profile is saved to `localStorage`; use the **Recalibrate** button on the globe screen to redo it.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in Chrome, allow camera access, and start gesturing.

> **Note:** Must be served over HTTP — opening `index.html` directly as `file://` will fail due to MediaPipe WASM CORS restrictions.

## Commands

```bash
npm run dev        # dev server with HMR
npm run build      # production build → dist/
npm run preview    # preview production build locally
npm run typecheck  # TypeScript check
npm run lint       # ESLint
npm run format     # Prettier
```

## Deploy

The built `dist/` folder is a static site — deploy to Vercel or Netlify with zero config:

**Vercel:** `vercel --prod` or connect the repo and set build command `npm run build`, output dir `dist`.

**Netlify:** drag `dist/` into the Netlify dashboard, or use `netlify deploy --prod --dir=dist`.

## Tech stack

- React 19 + Vite + TypeScript
- MapLibre GL for globe rendering
- MediaPipe Tasks Vision (hand tracking)
- Tailwind CSS v4

## MVP scope

- [x] 3D globe with city markers
- [x] Camera permission screen
- [x] Per-user calibration flow with persisted profile
- [x] MediaPipe hand landmark detection
- [x] Rule-based gesture recognition (pinch-grab, open palm, two-hand)
- [x] Grab-and-drag rotation with release inertia
- [x] Two-hand spread → zoom
- [x] One-Euro filtering + lost-track grace + tab-visibility pause
- [x] Gesture overlay UI
- [x] Toggleable debug panel (FPS, landmarks, control values)

# Globe Control

Control a 3D Earth globe with your hand gestures — runs entirely in the browser.

## Gestures

| Gesture | Action |
|---|---|
| 🖐 Open palm + move | Rotate the globe |
| 🤌 Pinch (thumb + index) | Zoom in/out |
| ✊ Fist | Pause movement |
| ↔ Two hands apart/together | Zoom in/out |

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
- React Three Fiber + Drei
- three-globe
- MediaPipe Tasks Vision (hand tracking)
- Tailwind CSS v4

## MVP scope

- [x] Static 3D globe with city markers
- [x] Camera permission screen
- [x] MediaPipe hand landmark detection
- [x] Rule-based gesture recognition (pinch, palm, fist, two-hand)
- [x] Gesture → globe rotation + zoom
- [x] Gesture overlay UI
- [x] Toggleable debug panel (FPS, landmarks, control values)

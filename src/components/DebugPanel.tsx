import { useEffect, useState } from 'react';
import type { GestureState } from '../types/gestures';
import type { GlobeControlValues } from '../hooks/useGlobeControls';
import type { HandLandmarks } from '../types/mediapipe';

interface DebugPanelProps {
  gestureStateRef: React.MutableRefObject<GestureState>;
  controlsRef: React.MutableRefObject<GlobeControlValues>;
  landmarksRef: React.MutableRefObject<HandLandmarks[]>;
}

export function DebugPanel({ gestureStateRef, controlsRef, landmarksRef }: DebugPanelProps) {
  const [snapshot, setSnapshot] = useState({ gesture: 'idle', dx: 0, dy: 0, zoom: 0, lat: 0, lng: 0, alt: 0, hands: 0 });
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frames = 0;
    let last = performance.now();

    const id = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - last) / 1000;
      setFps(Math.round(frames / elapsed));
      frames = 0;
      last = now;

      const g = gestureStateRef.current;
      const c = controlsRef.current;
      setSnapshot({
        gesture: g.gesture,
        dx: +g.deltaX.toFixed(3),
        dy: +g.deltaY.toFixed(3),
        zoom: +g.zoom.toFixed(3),
        lat: +c.lat.toFixed(1),
        lng: +c.lng.toFixed(1),
        alt: +c.altitude.toFixed(2),
        hands: landmarksRef.current.length,
      });
    }, 200);

    // Count frames via rAF
    let rafId: number;
    function countFrame() {
      frames++;
      rafId = requestAnimationFrame(countFrame);
    }
    rafId = requestAnimationFrame(countFrame);

    return () => {
      clearInterval(id);
      cancelAnimationFrame(rafId);
    };
  }, [gestureStateRef, controlsRef, landmarksRef]);

  return (
    <div className="fixed top-16 right-4 z-20 w-52 rounded-xl bg-black/70 border border-white/10 backdrop-blur p-3 text-xs font-mono text-white/60 space-y-1">
      <Row label="FPS" value={fps} />
      <Row label="Hands" value={snapshot.hands} />
      <Row label="Gesture" value={snapshot.gesture} />
      <Row label="ΔX" value={snapshot.dx} />
      <Row label="ΔY" value={snapshot.dy} />
      <Row label="Zoom" value={snapshot.zoom} />
      <div className="border-t border-white/10 my-1" />
      <Row label="Lat" value={snapshot.lat} />
      <Row label="Lng" value={snapshot.lng} />
      <Row label="Alt" value={snapshot.alt} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/35">{label}</span>
      <span>{String(value)}</span>
    </div>
  );
}

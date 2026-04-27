import { useEffect, useState } from 'react';
import type { GestureType } from '../types/gestures';

const GESTURE_LABELS: Record<GestureType, string> = {
  'idle':            '· · ·',
  'open-palm':       '🖐 Swipe to rotate',
  'pinch':           '🤌 Pinch to zoom',
  'fist':            '· · ·',
  'two-hand-spread': '↔ Zoom (two hands)',
};

const GESTURE_COLORS: Record<GestureType, string> = {
  'idle':            'text-white/40',
  'open-palm':       'text-emerald-300',
  'pinch':           'text-sky-300',
  'fist':            'text-white/40',
  'two-hand-spread': 'text-amber-300',
};

interface GestureOverlayProps {
  gestureRef: React.MutableRefObject<GestureType>;
}

export function GestureOverlay({ gestureRef }: GestureOverlayProps) {
  const [label, setLabel] = useState('· · ·');
  const [colorClass, setColorClass] = useState('text-white/30');

  useEffect(() => {
    let prev: GestureType = 'idle';
    const id = setInterval(() => {
      const g = gestureRef.current;
      if (g !== prev) {
        prev = g;
        setLabel(GESTURE_LABELS[g]);
        setColorClass(GESTURE_COLORS[g]);
      }
    }, 80); // poll at ~12fps — enough for UI feedback, no per-frame re-renders
    return () => clearInterval(id);
  }, [gestureRef]);

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div className="px-5 py-2 rounded-full bg-black/50 border border-white/10 backdrop-blur text-sm font-medium tracking-wide">
        <span className={`${colorClass} transition-colors duration-200`}>{label}</span>
      </div>
    </div>
  );
}

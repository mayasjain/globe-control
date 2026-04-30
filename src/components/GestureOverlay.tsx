import { useEffect, useState } from 'react';
import type { GestureType, GestureState } from '../types/gestures';

interface GestureOverlayProps {
  gestureRef: React.MutableRefObject<GestureType>;
  gestureStateRef?: React.MutableRefObject<GestureState>;
  isPausedRef?: React.MutableRefObject<boolean>;
  isGrabbingRef?: React.MutableRefObject<boolean>;
}

interface Snapshot {
  gesture: GestureType;
  pinchClose: number;     // 0 fully closed → 1 fully open (relative to user's calibration)
  twoHandActive: boolean;
  paused: boolean;
  grabbing: boolean;
}

const INITIAL: Snapshot = {
  gesture: 'idle',
  pinchClose: 1,
  twoHandActive: false,
  paused: false,
  grabbing: false,
};

export function GestureOverlay({
  gestureRef,
  gestureStateRef,
  isPausedRef,
  isGrabbingRef,
}: GestureOverlayProps) {
  const [snap, setSnap] = useState<Snapshot>(INITIAL);

  useEffect(() => {
    const id = setInterval(() => {
      const g = gestureRef.current;
      const s = gestureStateRef?.current;
      const next: Snapshot = {
        gesture: g,
        pinchClose: s ? s.zoom : 1,
        twoHandActive: g === 'two-hand-spread',
        paused: !!isPausedRef?.current,
        grabbing: !!isGrabbingRef?.current,
      };
      setSnap((prev) =>
        prev.gesture === next.gesture &&
        Math.abs(prev.pinchClose - next.pinchClose) < 0.04 &&
        prev.twoHandActive === next.twoHandActive &&
        prev.paused === next.paused &&
        prev.grabbing === next.grabbing
          ? prev
          : next,
      );
    }, 90);
    return () => clearInterval(id);
  }, [gestureRef, gestureStateRef, isPausedRef, isGrabbingRef]);

  const rotateActive = snap.grabbing;
  const zoomActive = snap.twoHandActive;
  // pinch-but-not-grabbing means the user is forming the pinch but hysteresis
  // hasn't latched it yet. Don't claim grab.
  const idle = !rotateActive && !zoomActive;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div className="px-4 py-2.5 rounded-2xl bg-black/55 border border-white/10 backdrop-blur flex items-center gap-4 text-xs font-medium tracking-wide">
        {snap.paused ? (
          <span className="text-white/45 px-1">Paused — show your hand</span>
        ) : (
          <>
            <Row
              icon="🤌"
              label="Grab"
              active={rotateActive}
              activeColor="text-sky-300"
              hint={rotateActive ? 'rotating' : 'pinch to grab'}
            />
            <Divider />
            <Row
              icon="↔"
              label="Zoom"
              active={zoomActive}
              activeColor="text-amber-300"
              hint={zoomActive ? 'spread to zoom' : 'two hands'}
            />
            {idle && <Divider />}
            {idle && <span className="text-white/35 italic">{IDLE_HINTS[Math.floor(Date.now() / 3000) % IDLE_HINTS.length]}</span>}
          </>
        )}
      </div>

      {/* Pinch-closeness micro-bar: appears whenever a single hand is in frame
          and useful for confirming the user's pinch is being detected. */}
      {!snap.paused && (snap.gesture === 'open-palm' || snap.gesture === 'pinch') && (
        <div className="mt-1.5 mx-auto w-32 h-0.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-[width,background-color] duration-100 ${
              snap.grabbing ? 'bg-sky-300' : 'bg-white/40'
            }`}
            style={{ width: `${(1 - snap.pinchClose) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

const IDLE_HINTS = [
  'pinch + drag to rotate',
  'two hands apart to zoom',
  'release to coast',
];

function Row({
  icon, label, active, activeColor, hint,
}: { icon: string; label: string; active: boolean; activeColor: string; hint: string }) {
  return (
    <span className={`flex items-center gap-1.5 transition-colors duration-200 ${
      active ? activeColor : 'text-white/40'
    }`}>
      <span className={active ? 'scale-110 transition-transform' : ''}>{icon}</span>
      <span>{label}</span>
      <span className={`text-[10px] ${active ? 'opacity-90' : 'opacity-50'}`}>· {hint}</span>
    </span>
  );
}

function Divider() {
  return <span className="w-px h-3 bg-white/10" />;
}

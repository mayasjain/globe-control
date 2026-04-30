import { useState, useCallback, useMemo } from 'react';

interface PermissionGateProps {
  onGranted: (videoEl: HTMLVideoElement) => void;
}

export function PermissionGate({ onGranted }: PermissionGateProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestCamera = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      await new Promise<void>((res) =>
        video.addEventListener('loadeddata', () => res(), { once: true }),
      );
      onGranted(video);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera access denied');
      setLoading(false);
    }
  }, [onGranted]);

  // Deterministic starfield so it doesn't reshuffle on re-renders.
  const stars = useMemo(() => {
    const rng = mulberry32(42);
    return Array.from({ length: 80 }, () => ({
      top: rng() * 100,
      left: rng() * 100,
      delay: rng() * 4,
      size: rng() < 0.85 ? 1 : 2,
      opacity: 0.4 + rng() * 0.6,
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#050816] text-white">
      {/* Deep-space radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, #1e3a8a22 0%, #0b132f 40%, #050816 75%, #02030a 100%)',
        }}
      />

      {/* Aurora blobs */}
      <div className="gc-aurora" style={{ top: '10%', left: '10%', width: 360, height: 360, background: '#3b82f6' }} />
      <div className="gc-aurora" style={{ bottom: '5%', right: '5%', width: 420, height: 420, background: '#8b5cf6', animationDelay: '-6s' }} />
      <div className="gc-aurora" style={{ top: '40%', right: '20%', width: 280, height: 280, background: '#22d3ee', animationDelay: '-12s', opacity: 0.3 }} />

      {/* Starfield */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((s, i) => (
          <span
            key={i}
            className="gc-star"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          {/* Animated globe */}
          <div className="relative mx-auto mb-8 w-32 h-32">
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-70"
              style={{
                background: 'radial-gradient(circle, #60a5fa 0%, #3b82f6 35%, transparent 70%)',
                animation: 'glow-pulse 4s ease-in-out infinite',
              }}
            />
            <div
              className="relative w-full h-full flex items-center justify-center text-7xl"
              style={{ animation: 'float-y 5s ease-in-out infinite' }}
            >
              <span style={{ display: 'inline-block', animation: 'spin-slow 22s linear infinite' }}>
                🌍
              </span>
            </div>
            {/* Orbit ring */}
            <div
              className="absolute inset-[-8px] rounded-full border border-white/10"
              style={{ animation: 'spin-slow 30s linear infinite' }}
            >
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-sky-300 shadow-[0_0_12px_3px_rgba(125,211,252,0.8)]" />
            </div>
          </div>

          {/* Pre-title chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur text-[11px] font-medium text-white/60 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            On-device · No upload
          </div>

          <h1 className="text-5xl font-semibold tracking-tight mb-3">
            <span className="gc-gradient-text">Globe Control</span>
          </h1>

          <p className="text-white/55 text-[15px] leading-relaxed mb-8 max-w-sm mx-auto">
            Control a 3D Earth with your hands. Pinch to grab. Drag to rotate. Two hands to zoom.
          </p>

          {error && (
            <div className="mb-4 mx-auto max-w-xs px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs">
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={requestCamera}
            disabled={loading}
            className="group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-black text-sm font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_40px_-8px_rgba(96,165,250,0.6)] hover:shadow-[0_0_60px_-4px_rgba(96,165,250,0.9)]"
          >
            {/* Animated gradient ring */}
            <span
              className="absolute -inset-px rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                background:
                  'conic-gradient(from 0deg, #60a5fa, #c084fc, #22d3ee, #60a5fa)',
                animation: 'spin-slow 6s linear infinite',
                filter: 'blur(8px)',
                zIndex: -1,
              }}
            />
            {loading ? (
              <>
                <Spinner /> Starting camera…
              </>
            ) : (
              <>
                <CameraIcon /> Enable Camera
              </>
            )}
          </button>

          {/* Gesture cheatsheet */}
          <div className="mt-12 grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <Hint icon="🤌" title="Pinch + drag" sub="rotate the globe" />
            <Hint icon="↔" title="Two hands" sub="spread to zoom" />
          </div>

          <p className="mt-8 text-[11px] text-white/30">
            Works best in a well-lit room with your hand fully visible.
          </p>
        </div>
      </div>
    </div>
  );
}

function Hint({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur text-left transition-colors hover:bg-white/[0.06] hover:border-white/20">
      <span className="text-xl">{icon}</span>
      <div className="leading-tight">
        <div className="text-[12px] font-medium text-white/85">{title}</div>
        <div className="text-[11px] text-white/45">{sub}</div>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5"/>
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

// Tiny seeded PRNG so the starfield is stable across renders.
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

import { useState, useCallback } from 'react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="text-center max-w-sm px-6">
        <div className="text-6xl mb-6">🌍</div>
        <h1 className="text-2xl font-semibold text-white mb-2">Globe Control</h1>
        <p className="text-white/50 text-sm mb-8">
          Control a 3D globe with your hand gestures. Camera access is required — your video stays on-device.
        </p>

        {error && (
          <p className="text-rose-400 text-xs mb-4">{error}</p>
        )}

        <button
          onClick={requestCamera}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-95 transition-all disabled:opacity-40"
        >
          {loading ? 'Starting camera…' : 'Enable Camera'}
        </button>

        <div className="mt-10 text-white/40 text-xs space-y-1">
          <p>🖐 Swipe with open palm — rotate</p>
          <p>🤌 Pinch in / out — zoom</p>
          <p>↔ Two hands apart / together — zoom</p>
        </div>
      </div>
    </div>
  );
}

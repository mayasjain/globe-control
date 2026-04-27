import { useState, useCallback } from 'react';
import { PermissionGate } from '../components/PermissionGate';
import { CalibrationScreen } from '../components/CalibrationScreen';
import { GlobeController } from '../components/GlobeController';

type Phase = 'permission' | 'calibration' | 'globe';

export default function App() {
  const [phase, setPhase] = useState<Phase>('permission');
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const handleGranted = useCallback((el: HTMLVideoElement) => {
    setVideoEl(el);
    setPhase('calibration');
  }, []);

  const handleCalibrated = useCallback(() => {
    setPhase('globe');
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      {phase === 'permission' && <PermissionGate onGranted={handleGranted} />}

      {phase === 'calibration' && videoEl && (
        <CalibrationScreen videoEl={videoEl} onComplete={handleCalibrated} />
      )}

      {phase === 'globe' && videoEl && (
        <>
          <GlobeController videoEl={videoEl} showDebug={showDebug} />

          <div className="fixed bottom-5 left-5 z-10 text-white/30 text-xs space-y-1 pointer-events-none">
            <p>🖐 Open palm — rotate</p>
            <p>🤌 Pinch — zoom</p>
            <p>✊ Fist — pause</p>
            <p>↔ Two hands — zoom</p>
          </div>

          <button
            onClick={() => setShowDebug((v) => !v)}
            className="fixed top-5 right-5 z-20 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/70 transition-colors"
          >
            {showDebug ? 'Hide Debug' : 'Debug'}
          </button>
        </>
      )}
    </div>
  );
}

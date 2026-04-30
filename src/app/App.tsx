import { useState, useCallback } from 'react';
import { PermissionGate } from '../components/PermissionGate';
import { CalibrationScreen } from '../components/CalibrationScreen';
import { GlobeController } from '../components/GlobeController';
import { loadProfile, clearProfile, type CalibrationProfile } from '../utils/calibrationProfile';

type Phase = 'permission' | 'calibration' | 'globe';

export default function App() {
  const [phase, setPhase] = useState<Phase>('permission');
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [showDebug, setShowDebug] = useState(true); // default-on for diagnosis
  // Returning users with a saved profile skip CalibrationScreen entirely.
  const [profile, setProfile] = useState<CalibrationProfile | null>(() => loadProfile());

  const handleGranted = useCallback((el: HTMLVideoElement) => {
    setVideoEl(el);
    setPhase(profile ? 'globe' : 'calibration');
  }, [profile]);

  const handleCalibrated = useCallback(() => {
    // CalibrationScreen has already saved the profile; re-read it.
    setProfile(loadProfile());
    setPhase('globe');
  }, []);

  const handleRecalibrate = useCallback(() => {
    clearProfile();
    setProfile(null);
    setPhase('calibration');
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      {phase === 'permission' && <PermissionGate onGranted={handleGranted} />}

      {phase === 'calibration' && videoEl && (
        <CalibrationScreen videoEl={videoEl} onComplete={handleCalibrated} />
      )}

      {phase === 'globe' && videoEl && (
        <>
          <GlobeController videoEl={videoEl} showDebug={showDebug} profile={profile ?? undefined} />

          <div className="fixed top-5 right-5 z-20 flex gap-2">
            <button
              onClick={handleRecalibrate}
              className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/70 transition-colors"
            >
              Recalibrate
            </button>
            <button
              onClick={() => setShowDebug((v) => !v)}
              className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/70 transition-colors"
            >
              {showDebug ? 'Hide Debug' : 'Debug'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

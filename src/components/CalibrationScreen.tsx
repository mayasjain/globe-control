import { useEffect, useRef, useState, useCallback } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { useHandLandmarker } from '../hooks/useHandLandmarker';
import { drawLandmarks, clearCanvas } from '../utils/landmarkUtils';
import { isPinching, isOpenPalm } from '../utils/gestureMath';
import type { HandLandmarks } from '../types/mediapipe';

type Step = 'detecting' | 'open-palm' | 'pinch' | 'done';

const STEP_ORDER: Step[] = ['detecting', 'open-palm', 'pinch', 'done'];

const STEP_INSTRUCTIONS: Record<Step, { title: string; hint: string; emoji: string }> = {
  'detecting': { title: 'Show your hand',  hint: 'Hold your hand in view of the camera.',              emoji: '👋' },
  'open-palm': { title: 'Open palm',       hint: 'Spread all five fingers, palm facing the camera.',   emoji: '🖐' },
  'pinch':     { title: 'Pinch',           hint: 'Touch your thumb and index fingertip together.',     emoji: '🤌' },
  'done':      { title: "You're all set",  hint: 'Gestures recognized. Ready to launch the globe.',    emoji: '✨' },
};

const HOLD_FRAMES_REQUIRED = 12; // ~0.4s at 30fps

interface CalibrationScreenProps {
  videoEl: HTMLVideoElement;
  onComplete: () => void;
}

export function CalibrationScreen({ videoEl, onComplete }: CalibrationScreenProps) {
  const [step, setStep] = useState<Step>('detecting');
  const [holdProgress, setHoldProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stepRef = useRef<Step>('detecting');
  const holdRef = useRef(0);
  const completedRef = useRef(false);

  // Mount video into our container (we own it during calibration)
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.appendChild(videoEl);
    return () => {
      videoEl.parentNode?.removeChild(videoEl);
    };
  }, [videoEl]);

  // Keep stepRef in sync with state
  useEffect(() => { stepRef.current = step; }, [step]);

  const onResult = useCallback((result: HandLandmarkerResult) => {
    const lms = (result.landmarks as HandLandmarks[]) ?? [];
    if (canvasRef.current) {
      if (lms.length > 0) drawLandmarks(canvasRef.current, lms[0]);
      else clearCanvas(canvasRef.current);
    }

    const lm = lms[0];
    const current = stepRef.current;

    let pass = false;
    if (current === 'detecting') pass = !!lm;
    else if (current === 'open-palm' && lm) pass = isOpenPalm(lm);
    else if (current === 'pinch' && lm) pass = isPinching(lm);

    if (pass) {
      holdRef.current = Math.min(HOLD_FRAMES_REQUIRED, holdRef.current + 1);
    } else {
      holdRef.current = Math.max(0, holdRef.current - 1);
    }
    setHoldProgress(holdRef.current / HOLD_FRAMES_REQUIRED);

    if (holdRef.current >= HOLD_FRAMES_REQUIRED && current !== 'done') {
      const idx = STEP_ORDER.indexOf(current);
      const next = STEP_ORDER[idx + 1];
      holdRef.current = 0;
      setStep(next);
      if (next === 'done' && !completedRef.current) {
        completedRef.current = true;
        setTimeout(() => onComplete(), 900);
      }
    }
  }, [onComplete]);

  useHandLandmarker({ videoEl, onResult, enabled: true });

  const info = STEP_INSTRUCTIONS[step];
  const stepIdx = STEP_ORDER.indexOf(step);
  const totalSteps = STEP_ORDER.length - 1; // exclude 'done'

  return (
    <div className="fixed inset-0 z-40 bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 px-6">
        {/* Step indicator */}
        <div className="flex gap-2">
          {STEP_ORDER.slice(0, totalSteps).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                i < stepIdx ? 'bg-emerald-400' : i === stepIdx ? 'bg-white' : 'bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* Camera preview with landmark overlay */}
        <div className="relative w-[480px] h-[360px] max-w-[80vw] rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(96,165,250,0.15)]">
          <div
            ref={containerRef}
            className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>video]:scale-x-[-1]"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none"
          />

          {/* Hold progress ring */}
          {step !== 'done' && holdProgress > 0 && (
            <div className="absolute top-3 right-3 w-12 h-12">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="16" fill="none"
                  stroke="#34d399" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${holdProgress * 100.5}, 100.5`}
                  className="transition-[stroke-dasharray] duration-75"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Instruction */}
        <div className="text-center max-w-md">
          <div className="text-5xl mb-3">{info.emoji}</div>
          <h2 className="text-white text-xl font-semibold mb-1.5">{info.title}</h2>
          <p className="text-white/45 text-sm">{info.hint}</p>
        </div>

        {/* Skip / done */}
        {step === 'done' ? (
          <button
            onClick={onComplete}
            className="px-6 py-3 rounded-xl bg-emerald-400 text-black text-sm font-semibold hover:bg-emerald-300 active:scale-95 transition-all"
          >
            Launch globe →
          </button>
        ) : (
          <button
            onClick={onComplete}
            className="text-white/30 text-xs hover:text-white/60 transition-colors"
          >
            Skip calibration
          </button>
        )}
      </div>
    </div>
  );
}

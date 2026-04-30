// One-Euro filter — Casiez et al. 2012.
// Adapts smoothing to motion speed: low cutoff at rest (heavy smoothing,
// kills jitter), high cutoff during fast motion (low lag).
//
// Tuning:
//   minCutoff — lower = smoother at rest, but more lag
//   beta      — higher = less smoothing during fast motion (less lag)
//   dCutoff   — derivative cutoff; rarely needs changing

export interface OneEuroOptions {
  minCutoff?: number;
  beta?: number;
  dCutoff?: number;
}

function alpha(cutoff: number, dtSec: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dtSec);
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;

  constructor(opts: OneEuroOptions = {}) {
    this.minCutoff = opts.minCutoff ?? 1.0;
    this.beta = opts.beta ?? 0.05;
    this.dCutoff = opts.dCutoff ?? 1.0;
  }

  update(value: number, timestampMs: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.tPrev = timestampMs;
      this.xPrev = value;
      this.dxPrev = 0;
      return value;
    }

    const dtSec = Math.max(1e-3, (timestampMs - this.tPrev) / 1000);
    this.tPrev = timestampMs;

    const dx = (value - this.xPrev) / dtSec;
    const aD = alpha(this.dCutoff, dtSec);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;

    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = alpha(cutoff, dtSec);
    const xHat = a * value + (1 - a) * this.xPrev;

    this.xPrev = xHat;
    this.dxPrev = dxHat;
    return xHat;
  }

  reset(value?: number): void {
    this.xPrev = value ?? null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

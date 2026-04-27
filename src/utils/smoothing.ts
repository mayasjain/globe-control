export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class EMA {
  private value: number;
  private alpha: number;

  constructor(initial = 0, alpha = 0.2) {
    this.value = initial;
    this.alpha = alpha;
  }

  update(next: number): number {
    this.value = this.alpha * next + (1 - this.alpha) * this.value;
    return this.value;
  }

  get(): number { return this.value; }
  reset(v = 0): void { this.value = v; }
}

export class MovingAverage {
  private buf: number[] = [];
  private size: number;

  constructor(size = 5) { this.size = size; }

  update(v: number): number {
    this.buf.push(v);
    if (this.buf.length > this.size) this.buf.shift();
    return this.buf.reduce((s, x) => s + x, 0) / this.buf.length;
  }

  reset(): void { this.buf = []; }
}

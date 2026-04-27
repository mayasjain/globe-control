import type { HandLandmarks } from '../types/mediapipe';

/** Draw all 21 landmarks + pinch line on a canvas overlay */
export function drawLandmarks(
  canvas: HTMLCanvasElement,
  lm: HandLandmarks,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width: w, height: h } = canvas.getBoundingClientRect();
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#00ff88';
  for (const pt of lm) {
    ctx.beginPath();
    ctx.arc(pt.x * w, pt.y * h, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pinch indicator line (thumb tip → index tip)
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(lm[4].x * w, lm[4].y * h);
  ctx.lineTo(lm[8].x * w, lm[8].y * h);
  ctx.stroke();
}

export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

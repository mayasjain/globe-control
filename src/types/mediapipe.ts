export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type HandLandmarks = Landmark[]; // 21 landmarks

export interface HandDetectionResult {
  landmarks: HandLandmarks[];
  handednesses: Array<Array<{ categoryName: string; score: number }>>;
}

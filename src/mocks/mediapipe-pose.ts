// Mock for @mediapipe/pose — not needed for MoveNet TF.js backend
// pose-detection imports this at the top level but we never use BlazePose mediapipe

// Named export that pose-detection ESM bundle expects
export class Pose {
  constructor() {
    throw new Error("@mediapipe/pose is mocked — use TF.js backend for MoveNet");
  }
}

export default {};


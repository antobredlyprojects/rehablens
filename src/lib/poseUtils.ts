import { Point } from "./types";

// MoveNet keypoint names
export const POSE_KEYPOINTS = [
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

// Skeleton connections for drawing
export const SKELETON_CONNECTIONS: [string, string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

/**
 * Calculate the angle (in degrees) between three points.
 * The middle point is the vertex of the angle.
 */
export function calculateAngle(a: Point, b: Point, c: Point): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

/**
 * Get keypoints as a name->point map from an array of keypoints
 */
export function keypointsToMap(
  keypoints: Array<{ name: string; x: number; y: number; score?: number }>
): Map<string, Point> {
  const map = new Map<string, Point>();
  for (const kp of keypoints) {
    map.set(kp.name, { x: kp.x, y: kp.y, score: kp.score });
  }
  return map;
}

/**
 * Determine joint angle for specific exercises
 */
export function getExerciseAngle(
  exerciseId: string,
  keypoints: Map<string, Point>
): { angle: number; jointName: string } | null {
  switch (exerciseId) {
    case "knee-flexion": {
      const hip = keypoints.get("left_hip") || keypoints.get("right_hip");
      const knee = keypoints.get("left_knee") || keypoints.get("right_knee");
      const ankle =
        keypoints.get("left_ankle") || keypoints.get("right_ankle");
      if (hip && knee && ankle) {
        return {
          angle: calculateAngle(hip, knee, ankle),
          jointName: "Knee Angle",
        };
      }
      return null;
    }
    case "shoulder-abduction": {
      const elbow =
        keypoints.get("left_elbow") || keypoints.get("right_elbow");
      const shoulder =
        keypoints.get("left_shoulder") || keypoints.get("right_shoulder");
      const hip = keypoints.get("left_hip") || keypoints.get("right_hip");
      if (elbow && shoulder && hip) {
        return {
          angle: calculateAngle(elbow, shoulder, hip),
          jointName: "Shoulder Angle",
        };
      }
      return null;
    }
    case "hip-extension": {
      const shoulder =
        keypoints.get("left_shoulder") || keypoints.get("right_shoulder");
      const hip = keypoints.get("left_hip") || keypoints.get("right_hip");
      const knee = keypoints.get("left_knee") || keypoints.get("right_knee");
      if (shoulder && hip && knee) {
        return {
          angle: calculateAngle(shoulder, hip, knee),
          jointName: "Hip Angle",
        };
      }
      return null;
    }
    case "elbow-flexion": {
      const shoulder =
        keypoints.get("left_shoulder") || keypoints.get("right_shoulder");
      const elbow =
        keypoints.get("left_elbow") || keypoints.get("right_elbow");
      const wrist = keypoints.get("left_wrist") || keypoints.get("right_wrist");
      if (shoulder && elbow && wrist) {
        return {
          angle: calculateAngle(shoulder, elbow, wrist),
          jointName: "Elbow Angle",
        };
      }
      return null;
    }
    case "ankle-dorsiflexion": {
      const knee = keypoints.get("left_knee") || keypoints.get("right_knee");
      const ankle =
        keypoints.get("left_ankle") || keypoints.get("right_ankle");
      const foot = { x: ankle?.x ?? 0, y: (ankle?.y ?? 0) + 0.1 };
      if (knee && ankle) {
        return {
          angle: calculateAngle(knee, ankle, foot),
          jointName: "Ankle Angle",
        };
      }
      return null;
    }
    case "trunk-rotation": {
      const lShoulder = keypoints.get("left_shoulder");
      const rShoulder = keypoints.get("right_shoulder");
      const lHip = keypoints.get("left_hip");
      const rHip = keypoints.get("right_hip");
      if (lShoulder && rShoulder && lHip && rHip) {
        const shoulderAngle = Math.atan2(
          rShoulder.y - lShoulder.y,
          rShoulder.x - lShoulder.x
        );
        const hipAngle = Math.atan2(
          rHip.y - lHip.y,
          rHip.x - lHip.x
        );
        const rotation =
          Math.abs(((shoulderAngle - hipAngle) * 180) / Math.PI);
        return {
          angle: Math.min(rotation, 360 - rotation),
          jointName: "Rotation",
        };
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Analyze form and return a feedback message
 */
export function analyzeForm(
  angle: number,
  targetRange: { min: number; max: number }
): { message: string; type: "good" | "warning" | "error"; score: number } {
  const { min, max } = targetRange;
  const midpoint = (min + max) / 2;
  const tolerance = (max - min) / 2;

  const deviation = Math.abs(angle - midpoint);
  const normalizedDeviation = deviation / tolerance;

  if (angle >= min && angle <= max) {
    if (normalizedDeviation < 0.3) {
      return { message: "Great form! Keep going.", type: "good", score: 95 };
    }
    return { message: "Good form ✓", type: "good", score: 85 };
  }

  if (angle < min) {
    if (normalizedDeviation > 2) {
      return {
        message: "Move further to increase range of motion",
        type: "error",
        score: 40,
      };
    }
    return { message: "Increase your range of motion slightly", type: "warning", score: 65 };
  }

  if (normalizedDeviation > 2) {
    return {
      message: "Reduce your range — you're overextending",
      type: "error",
      score: 40,
    };
  }
  return { message: "Slightly overextended — ease back a bit", type: "warning", score: 65 };
}

/**
 * Detect common form issues from keypoint positions
 */
export function detectFormIssues(
  exerciseId: string,
  keypoints: Map<string, Point>
): string | null {
  const leftShoulder = keypoints.get("left_shoulder");
  const rightShoulder = keypoints.get("right_shoulder");
  const leftHip = keypoints.get("left_hip");
  const rightHip = keypoints.get("right_hip");

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;

  // Check if body is leaning significantly
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const hipMidX = (leftHip.x + rightHip.x) / 2;
  const lean = Math.abs(shoulderMidX - hipMidX);

  if (lean > 0.08) {
    return "Straighten your back";
  }

  if (exerciseId === "knee-flexion") {
    const knee = keypoints.get("left_knee") || keypoints.get("right_knee");
    const ankle =
      keypoints.get("left_ankle") || keypoints.get("right_ankle");
    if (knee && ankle && Math.abs(knee.x - ankle.x) > 0.1) {
      return "Keep your knee aligned";
    }
  }

  return null;
}

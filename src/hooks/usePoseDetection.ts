"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// MoveNet keypoint names (17 keypoints)
export const MOVENET_KEYPOINTS = [
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

export interface PoseKeypoint {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  score: number;
}

export interface PoseResult {
  keypoints: Map<string, PoseKeypoint>;
  score: number; // overall confidence
}

export interface UsePoseDetectionReturn {
  detectorRef: React.MutableRefObject<unknown>;
  currentPose: PoseResult | null;
  isModelLoading: boolean;
  isDetecting: boolean;
  modelError: string | null;
  loadModel: () => Promise<void>;
  detectPose: (video: HTMLVideoElement) => Promise<PoseResult | null>;
  startDetectionLoop: (
    video: HTMLVideoElement,
    onPose: (pose: PoseResult) => void
  ) => void;
  stopDetectionLoop: () => void;
}

// MoveNet keypoint index mapping
const KEYPOINT_INDICES: Record<string, number> = {};
MOVENET_KEYPOINTS.forEach((name, idx) => {
  KEYPOINT_INDICES[name] = idx;
});

export function usePoseDetection(): UsePoseDetectionReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const [currentPose, setCurrentPose] = useState<PoseResult | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const loadModel = useCallback(async () => {
    if (detectorRef.current) return; // already loaded

    setIsModelLoading(true);
    setModelError(null);

    try {
      // Dynamic imports to avoid SSR issues
      const [tf, poseDetection] = await Promise.all([
        import("@tensorflow/tfjs-core"),
        import("@tensorflow-models/pose-detection"),
      ]);

      // Import and set WebGL backend
      const backend = await import("@tensorflow/tfjs-backend-webgl");
      await tf.setBackend("webgl");
      await tf.ready();

      // Create MoveNet detector
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          multiPoseMaxDimension: 256,
          enableTracking: false,
        }
      );

      detectorRef.current = detector;
    } catch (err: unknown) {
      console.error("Failed to load pose detection model:", err);
      let message = "Failed to load AI model";
      if (err instanceof Error) {
        message = `AI model error: ${err.message}`;
      }
      setModelError(message);
    } finally {
      setIsModelLoading(false);
    }
  }, []);

  const detectPose = useCallback(
    async (video: HTMLVideoElement): Promise<PoseResult | null> => {
      if (!detectorRef.current) return null;
      if (video.readyState < 2) return null; // video not ready

      try {
        const poses = await detectorRef.current.estimatePoses(video, {
          maxPoses: 1,
          flipHorizontal: false,
        });

        if (!poses || poses.length === 0) return null;

        const pose = poses[0];
        const keypoints = new Map<string, PoseKeypoint>();

        for (const kp of pose.keypoints) {
          const name = MOVENET_KEYPOINTS[kp.index] || kp.name;
          if (name) {
            keypoints.set(name, {
              x: kp.x / video.videoWidth,  // normalize to 0-1
              y: kp.y / video.videoHeight, // normalize to 0-1
              score: kp.score ?? 0.5,
            });
          }
        }

        const result: PoseResult = {
          keypoints,
          score: pose.keypoints.reduce(
            (sum: number, kp: { score?: number }) => sum + (kp.score ?? 0),
            0
          ) / pose.keypoints.length,
        };

        setCurrentPose(result);
        return result;
      } catch (err) {
        console.warn("Pose detection error:", err);
        return null;
      }
    },
    []
  );

  const startDetectionLoop = useCallback(
    (video: HTMLVideoElement, onPose: (pose: PoseResult) => void) => {
      if (isDetecting) return;
      setIsDetecting(true);

      let running = true;

      const loop = async () => {
        if (!running) return;

        const pose = await detectPose(video);
        if (pose && running) {
          onPose(pose);
        }

        // ~15fps for performance
        if (running) {
          animFrameRef.current = setTimeout(loop, 66) as unknown as number;
        }
      };

      loop();

      // Store cleanup function
      return () => {
        running = false;
        if (animFrameRef.current) {
          clearTimeout(animFrameRef.current as unknown as number);
        }
        setIsDetecting(false);
      };
    },
    [detectPose, isDetecting]
  );

  const stopDetectionLoop = useCallback(() => {
    if (animFrameRef.current) {
      clearTimeout(animFrameRef.current as unknown as number);
    }
    setIsDetecting(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetectionLoop();
    };
  }, [stopDetectionLoop]);

  return {
    detectorRef,
    currentPose,
    isModelLoading,
    isDetecting,
    modelError,
    loadModel,
    detectPose,
    startDetectionLoop,
    stopDetectionLoop,
  };
}

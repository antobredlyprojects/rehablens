"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { EXERCISES, getEncouragingMessage } from "@/lib/exercises";
import { loadState, saveState, addSession } from "@/lib/storage";
import { FeedbackType, ExerciseDefinition } from "@/lib/types";
import { calculateAngle, analyzeForm, SKELETON_CONNECTIONS } from "@/lib/poseUtils";
import { useCamera } from "@/hooks/useCamera";
import { usePoseDetection, PoseResult, PoseKeypoint } from "@/hooks/usePoseDetection";

function getAngleForExercise(
  exerciseId: string,
  keypoints: Map<string, PoseKeypoint>
): { angle: number; jointName: string } | null {
  const get = (name: string) => keypoints.get(name);
  const minScore = 0.3;

  switch (exerciseId) {
    case "knee-flexion": {
      // Try right side first, then left
      for (const side of ["right", "left"]) {
        const hip = get(`${side}_hip`);
        const knee = get(`${side}_knee`);
        const ankle = get(`${side}_ankle`);
        if (hip && knee && ankle && hip.score > minScore && knee.score > minScore && ankle.score > minScore) {
          return { angle: Math.round(calculateAngle(hip, knee, ankle)), jointName: "Knee Angle" };
        }
      }
      break;
    }
    case "shoulder-abduction": {
      for (const side of ["right", "left"]) {
        const elbow = get(`${side}_elbow`);
        const shoulder = get(`${side}_shoulder`);
        const hip = get(`${side}_hip`);
        if (elbow && shoulder && hip && elbow.score > minScore && shoulder.score > minScore && hip.score > minScore) {
          return { angle: Math.round(calculateAngle(elbow, shoulder, hip)), jointName: "Shoulder Angle" };
        }
      }
      break;
    }
    case "hip-extension": {
      for (const side of ["right", "left"]) {
        const shoulder = get(`${side}_shoulder`);
        const hip = get(`${side}_hip`);
        const knee = get(`${side}_knee`);
        if (shoulder && hip && knee && shoulder.score > minScore && hip.score > minScore && knee.score > minScore) {
          return { angle: Math.round(calculateAngle(shoulder, hip, knee)), jointName: "Hip Angle" };
        }
      }
      break;
    }
    case "elbow-flexion": {
      for (const side of ["right", "left"]) {
        const shoulder = get(`${side}_shoulder`);
        const elbow = get(`${side}_elbow`);
        const wrist = get(`${side}_wrist`);
        if (shoulder && elbow && wrist && shoulder.score > minScore && elbow.score > minScore && wrist.score > minScore) {
          return { angle: Math.round(calculateAngle(shoulder, elbow, wrist)), jointName: "Elbow Angle" };
        }
      }
      break;
    }
    case "ankle-dorsiflexion": {
      for (const side of ["right", "left"]) {
        const knee = get(`${side}_knee`);
        const ankle = get(`${side}_ankle`);
        if (knee && ankle && knee.score > minScore && ankle.score > minScore) {
          const foot = { x: ankle.x, y: ankle.y + 0.1, score: 0.9 };
          return { angle: Math.round(calculateAngle(knee, ankle, foot)), jointName: "Ankle Angle" };
        }
      }
      break;
    }
    case "trunk-rotation": {
      const ls = get("left_shoulder");
      const rs = get("right_shoulder");
      const lh = get("left_hip");
      const rh = get("right_hip");
      if (ls && rs && lh && rh && ls.score > minScore && rs.score > minScore && lh.score > minScore && rh.score > minScore) {
        const sAngle = Math.atan2(rs.y - ls.y, rs.x - ls.x);
        const hAngle = Math.atan2(rh.y - lh.y, rh.x - lh.x);
        const rot = Math.abs(((sAngle - hAngle) * 180) / Math.PI);
        return { angle: Math.round(Math.min(rot, 360 - rot)), jointName: "Rotation" };
      }
      break;
    }
  }
  return null;
}

// Detect form issues from keypoints
function detectFormIssues(
  exerciseId: string,
  keypoints: Map<string, PoseKeypoint>
): string | null {
  const ls = keypoints.get("left_shoulder");
  const rs = keypoints.get("right_shoulder");
  const lh = keypoints.get("left_hip");
  const rh = keypoints.get("right_hip");

  if (ls && rs && lh && rh) {
    const shoulderMidX = (ls.x + rs.x) / 2;
    const hipMidX = (lh.x + rh.x) / 2;
    const lean = Math.abs(shoulderMidX - hipMidX);
    if (lean > 0.06) return "Straighten your back";
  }

  if (exerciseId === "knee-flexion") {
    for (const side of ["right", "left"]) {
      const knee = keypoints.get(`${side}_knee`);
      const ankle = keypoints.get(`${side}_ankle`);
      if (knee && ankle && knee.score > 0.3 && ankle.score > 0.3) {
        if (Math.abs(knee.x - ankle.x) > 0.08) return "Keep your knee aligned";
      }
    }
  }

  return null;
}

export default function SessionPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const detectionCleanupRef = useRef<(() => void) | null>(null);
  const prevAngleRef = useRef<number>(0);
  const repPhaseRef = useRef<"up" | "down">("down");
  const accumulatedScoreRef = useRef<number[]>([]);

  const [isPaused, setIsPaused] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reps, setReps] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [formScore, setFormScore] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("good");
  const [movementQuality, setMovementQuality] = useState("Waiting...");
  const [formIssues, setFormIssues] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition>(EXERCISES[0]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [encouragingMsg, setEncouragingMsg] = useState("");
  const [cameraRequested, setCameraRequested] = useState(false);

  const camera = useCamera();
  const poseDetection = usePoseDetection();

  // Timer
  useEffect(() => {
    if (!isStarted || isPaused || isFinished) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isStarted, isPaused, isFinished]);

  // Draw function: renders video frame + skeleton overlay
  const drawFrame = useCallback(
    (pose: PoseResult | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Draw video frame if active
      if (camera.videoRef.current && camera.isActive) {
        const video = camera.videoRef.current;
        // Mirror the video (selfie camera)
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -w, 0, w, h);
        ctx.restore();
      } else {
        // Dark background placeholder
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, w, h);

        if (!cameraRequested) {
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.font = "600 18px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Click 'Start AI Session' to enable your camera", w / 2, h / 2);
        } else if (camera.isLoading || poseDetection.isModelLoading) {
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.font = "600 18px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Loading AI model & camera...", w / 2, h / 2 - 10);
          ctx.font = "400 13px system-ui, sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillText("This may take a few seconds on first load", w / 2, h / 2 + 15);
        } else if (camera.error || poseDetection.modelError) {
          ctx.fillStyle = "rgba(239,68,68,0.8)";
          ctx.font = "600 16px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(camera.error || poseDetection.modelError || "Error", w / 2, h / 2);
        }
      }

      // Draw skeleton overlay on top of video
      if (pose && isStarted && !isFinished) {
        // Draw connections
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        for (const [from, to] of SKELETON_CONNECTIONS) {
          const p1 = pose.keypoints.get(from);
          const p2 = pose.keypoints.get(to);
          if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
            // Mirror x coordinates since we mirror the video
            const x1 = (1 - p1.x) * w;
            const y1 = p1.y * h;
            const x2 = (1 - p2.x) * w;
            const y2 = p2.y * h;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle =
              feedbackType === "good"
                ? "rgba(16,185,129,0.7)"
                : feedbackType === "warning"
                  ? "rgba(245,158,11,0.7)"
                  : "rgba(239,68,68,0.7)";
            ctx.stroke();
          }
        }

        // Draw joints
        for (const [, kp] of pose.keypoints) {
          if (kp.score < 0.3) continue;
          const x = (1 - kp.x) * w;
          const y = kp.y * h;

          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fillStyle =
            feedbackType === "good"
              ? "#10b981"
              : feedbackType === "warning"
                ? "#f59e0b"
                : "#ef4444";
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Draw angle label near the relevant joint
        const angleResult = getAngleForExercise(selectedExercise.id, pose.keypoints);
        if (angleResult) {
          // Find the primary joint to label
          let jointKp: PoseKeypoint | undefined;
          if (selectedExercise.id === "knee-flexion") {
            jointKp = pose.keypoints.get("right_knee") || pose.keypoints.get("left_knee");
          } else if (selectedExercise.id === "shoulder-abduction") {
            jointKp = pose.keypoints.get("right_shoulder") || pose.keypoints.get("left_shoulder");
          } else if (selectedExercise.id === "hip-extension") {
            jointKp = pose.keypoints.get("right_hip") || pose.keypoints.get("left_hip");
          } else if (selectedExercise.id === "elbow-flexion") {
            jointKp = pose.keypoints.get("right_elbow") || pose.keypoints.get("left_elbow");
          } else if (selectedExercise.id === "ankle-dorsiflexion") {
            jointKp = pose.keypoints.get("right_ankle") || pose.keypoints.get("left_ankle");
          } else if (selectedExercise.id === "trunk-rotation") {
            jointKp = pose.keypoints.get("left_shoulder") || pose.keypoints.get("right_shoulder");
          }

          if (jointKp && jointKp.score > 0.3) {
            const jx = (1 - jointKp.x) * w;
            const jy = jointKp.y * h;

            // Background pill
            const label = `${angleResult.angle}°`;
            ctx.font = "bold 15px system-ui, sans-serif";
            const metrics = ctx.measureText(label);
            const pillW = metrics.width + 16;
            const pillH = 26;
            const pillX = jx + 15;
            const pillY = jy - 35;

            ctx.fillStyle =
              feedbackType === "good"
                ? "rgba(16,185,129,0.9)"
                : feedbackType === "warning"
                  ? "rgba(245,158,11,0.9)"
                  : "rgba(239,68,68,0.9)";
            ctx.beginPath();
            ctx.roundRect(pillX - pillW / 2, pillY - pillH / 2, pillW, pillH, 6);
            ctx.fill();

            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, pillX, pillY);
          }
        }
      }
    },
    [camera, isStarted, isFinished, feedbackType, selectedExercise.id, cameraRequested, poseDetection.isModelLoading, poseDetection.modelError, camera.error]
  );

  // Process pose results — calculate angle, form, reps
  const processPose = useCallback(
    (pose: PoseResult) => {
      const angleResult = getAngleForExercise(selectedExercise.id, pose.keypoints);
      if (!angleResult) return;

      setCurrentAngle(angleResult.angle);

      const formResult = analyzeForm(angleResult.angle, selectedExercise.targetAngleRange);
      setFormScore(formResult.score);
      setFeedbackMessage(formResult.message);
      setFeedbackType(formResult.type);
      setMovementQuality(
        formResult.type === "good" ? "Good" : formResult.type === "warning" ? "Fair" : "Needs work"
      );

      accumulatedScoreRef.current.push(formResult.score);
      if (accumulatedScoreRef.current.length > 30) accumulatedScoreRef.current.shift();

      const issues = detectFormIssues(selectedExercise.id, pose.keypoints);
      setFormIssues(issues);

      // Rep counting: detect angle crossing the midpoint of the target range
      const midpoint = (selectedExercise.targetAngleRange.min + selectedExercise.targetAngleRange.max) / 2;
      const angle = angleResult.angle;

      if (prevAngleRef.current > 0) {
        if (repPhaseRef.current === "down" && angle > midpoint + 5) {
          repPhaseRef.current = "up";
        } else if (repPhaseRef.current === "up" && angle < midpoint - 5) {
          repPhaseRef.current = "down";
          setReps((prev) => {
            if (prev >= selectedExercise.targetReps) return prev;
            return prev + 1;
          });
        }
      }
      prevAngleRef.current = angle;
    },
    [selectedExercise]
  );

  // Animation loop — continuously draw frames
  useEffect(() => {
    if (!isStarted || isPaused) return;

    let running = true;
    const loop = () => {
      if (!running) return;
      // Draw the latest pose (pose detection runs separately at ~15fps)
      drawFrame(poseDetection.currentPose);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isStarted, isPaused, drawFrame, poseDetection.currentPose]);

  // Draw idle state
  useEffect(() => {
    if (isStarted && !isPaused) return;
    drawFrame(null);
  }, [isStarted, isPaused, isFinished, drawFrame]);

  const handleStart = async () => {
    setCameraRequested(true);
    setIsStarted(true);
    setIsPaused(false);
    setIsFinished(false);
    setElapsedSeconds(0);
    setReps(0);
    setFormScore(0);
    setCurrentAngle(0);
    setFeedbackMessage("");
    setFeedbackType("good");
    setMovementQuality("Analyzing...");
    setFormIssues(null);
    prevAngleRef.current = 0;
    repPhaseRef.current = "down";
    accumulatedScoreRef.current = [];

    // Load model if not loaded
    if (!poseDetection.detectorRef.current) {
      await poseDetection.loadModel();
    }

    // Start camera
    if (!camera.isActive) {
      await camera.startCamera();
    }

    // Start detection loop once camera is active
    // We need to wait a tick for the video to be ready
    setTimeout(() => {
      if (camera.videoRef.current && poseDetection.detectorRef.current) {
        detectionCleanupRef.current = poseDetection.startDetectionLoop(
          camera.videoRef.current,
          processPose
        ) as unknown as () => void;
      }
    }, 500);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleEnd = () => {
    setIsFinished(true);
    setIsPaused(false);

    // Stop detection
    if (detectionCleanupRef.current) {
      detectionCleanupRef.current();
      detectionCleanupRef.current = null;
    }
    poseDetection.stopDetectionLoop();

    // Stop camera
    camera.stopCamera();

    // Save session
    const avgScore =
      accumulatedScoreRef.current.length > 0
        ? Math.round(
            accumulatedScoreRef.current.reduce((a, b) => a + b, 0) /
              accumulatedScoreRef.current.length
          )
        : formScore || 85;

    const state = loadState();
    const session = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      exerciseId: selectedExercise.id,
      exerciseName: selectedExercise.name,
      repsCompleted: reps,
      targetReps: selectedExercise.targetReps,
      setsCompleted: 1,
      targetSets: selectedExercise.targetSets,
      duration: elapsedSeconds,
      averageFormScore: avgScore,
      peakAngle: currentAngle,
      minAngle: Math.max(0, currentAngle - 20),
      feedbackMessages: [],
      completed: reps >= selectedExercise.targetReps,
    };
    const newState = addSession(state, session);
    saveState(newState);

    setEncouragingMsg(getEncouragingMessage());
  };

  const handleExit = () => {
    if (detectionCleanupRef.current) {
      detectionCleanupRef.current();
      detectionCleanupRef.current = null;
    }
    poseDetection.stopDetectionLoop();
    camera.stopCamera();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = selectedExercise.targetReps
    ? Math.round((reps / selectedExercise.targetReps) * 100)
    : 0;

  const showSkeleton = camera.isActive && isStarted && !isFinished;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-card-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setShowExercisePicker(!showExercisePicker)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors"
            >
              <span>{selectedExercise.icon}</span>
              {selectedExercise.name}
              <span className="text-xs opacity-60">▼</span>
            </button>
            <div className="text-sm text-muted">
              Session: <span className="font-medium text-foreground">Day 12</span>
            </div>
            <div className="text-sm font-mono text-muted tabular-nums">
              ⏱ {formatTime(elapsedSeconds)}
            </div>
            {isStarted && !isFinished && (
              <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Live
              </div>
            )}
            {showSkeleton && poseDetection.currentPose && (
              <div className="text-[10px] text-success/60 font-mono">
                {Math.round((poseDetection.currentPose?.score ?? 0) * 100)}% conf
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isStarted || isFinished ? (
              <Link
                href="/"
                onClick={handleExit}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                Exit
              </Link>
            ) : (
              <button
                onClick={handleEnd}
                className="px-4 py-2 text-sm font-medium text-error hover:bg-error/10 rounded-lg transition-colors"
              >
                End Session
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Exercise Picker Dropdown */}
      {showExercisePicker && (
        <div className="border-b border-card-border bg-card animate-fade-in">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Select Exercise
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {EXERCISES.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    setSelectedExercise(ex);
                    setShowExercisePicker(false);
                    if (isStarted) {
                      // Restart with new exercise
                      prevAngleRef.current = 0;
                      repPhaseRef.current = "down";
                      accumulatedScoreRef.current = [];
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedExercise.id === ex.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-card-border hover:border-primary/30 hover:bg-primary/[0.02]"
                  }`}
                >
                  <span className="text-xl block mb-1">{ex.icon}</span>
                  <span className="text-sm font-semibold block">{ex.name}</span>
                  <span className="text-xs text-muted block">{ex.bodyPart}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          {/* Video / Canvas area */}
          <div className="relative">
            {/* Hidden video element for camera feed */}
            <video
              ref={camera.videoRef}
              playsInline
              muted
              autoPlay
              style={{ display: "none" }}
            />

            <div className="relative bg-card rounded-2xl border border-card-border overflow-hidden shadow-lg">
              <div className="relative aspect-video bg-slate-900">
                <canvas
                  ref={canvasRef}
                  width={960}
                  height={540}
                  className="w-full h-full"
                />

                {/* AI analyzing indicator */}
                {isStarted && !isPaused && !isFinished && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                    <div className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      {camera.isActive ? "AI analyzing movement..." : "Connecting camera..."}
                    </div>
                  </div>
                )}

                {/* Model loading indicator */}
                {isStarted && poseDetection.isModelLoading && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="px-3 py-1.5 rounded-lg bg-accent/80 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-2">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading AI model...
                    </div>
                  </div>
                )}

                {/* Camera permission prompt */}
                {isStarted && !camera.isActive && !camera.isLoading && !camera.error && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="text-center p-6 bg-black/40 backdrop-blur-sm rounded-2xl max-w-sm">
                      <div className="text-4xl mb-3">📷</div>
                      <p className="text-white font-semibold mb-2">Camera access needed</p>
                      <p className="text-white/60 text-sm mb-4">
                        Allow camera access when prompted by your browser
                      </p>
                      <button
                        onClick={camera.startCamera}
                        className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
                      >
                        Grant Camera Access
                      </button>
                    </div>
                  </div>
                )}

                {/* Camera error */}
                {camera.error && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="text-center p-6 bg-black/50 backdrop-blur-sm rounded-2xl max-w-sm">
                      <div className="text-4xl mb-3">⚠️</div>
                      <p className="text-white font-semibold mb-2">Camera Error</p>
                      <p className="text-white/60 text-sm mb-4">{camera.error}</p>
                      <button
                        onClick={camera.startCamera}
                        className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}

                {/* Pause overlay */}
                {isPaused && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-10">
                    <div className="text-white text-2xl font-bold">Paused</div>
                  </div>
                )}

                {/* Feedback badge */}
                {isStarted && !isFinished && feedbackMessage && (
                  <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-10">
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg backdrop-blur-sm transition-all duration-300 ${
                        feedbackType === "good"
                          ? "bg-success/90 text-white"
                          : feedbackType === "warning"
                            ? "bg-warning/90 text-white"
                            : "bg-error/90 text-white"
                      }`}
                    >
                      {feedbackType === "good" ? "✓" : feedbackType === "warning" ? "⚠" : "✕"}{" "}
                      {feedbackMessage}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Control buttons */}
            {!isStarted || isFinished ? (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleStart}
                  disabled={camera.isLoading || poseDetection.isModelLoading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {(camera.isLoading || poseDetection.isModelLoading) ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Setting up...
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-white/80 animate-pulse-soft" />
                      {isFinished ? "Start New Session" : "Start AI Session"}
                    </>
                  )}
                </button>
                {isFinished && (
                  <Link
                    href="/progress"
                    className="px-6 py-4 border border-card-border bg-card text-foreground font-semibold rounded-xl hover:bg-foreground/5 transition-all text-base"
                  >
                    View Progress
                  </Link>
                )}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handlePause}
                  className="flex-1 sm:flex-none px-6 py-3 border border-card-border bg-card text-foreground font-semibold rounded-xl hover:bg-foreground/5 transition-all text-sm"
                >
                  {isPaused ? "▶ Resume" : "⏸ Pause"}
                </button>
                <button
                  onClick={handleEnd}
                  className="px-6 py-3 bg-error/10 text-error font-semibold rounded-xl hover:bg-error/15 transition-all text-sm"
                >
                  End Session
                </button>
              </div>
            )}

            {/* Session finished summary */}
            {isFinished && (
              <div className="mt-4 p-5 bg-card rounded-2xl border border-card-border animate-slide-up">
                <h3 className="text-lg font-bold mb-3">Session Summary</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 rounded-xl bg-primary/5">
                    <p className="text-2xl font-bold text-primary">{reps}</p>
                    <p className="text-xs text-muted">Reps Completed</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-success/5">
                    <p className="text-2xl font-bold text-success">{formScore || 85}%</p>
                    <p className="text-xs text-muted">Avg Form Score</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-accent/5">
                    <p className="text-2xl font-bold text-accent">{formatTime(elapsedSeconds)}</p>
                    <p className="text-xs text-muted">Duration</p>
                  </div>
                </div>
                {encouragingMsg && (
                  <div className="p-3 rounded-xl bg-success/5 border border-success/20 text-sm text-success font-medium text-center">
                    {encouragingMsg}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar — AI Feedback Panel */}
          <div className="space-y-4">
            {/* Live Analysis Card */}
            <div className="bg-card rounded-2xl border border-card-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
                  Live Analysis
                </h3>
              </div>

              {/* Form Score Ring */}
              <div className="flex items-center justify-center mb-5">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke={formScore >= 80 ? "#10b981" : formScore >= 60 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      strokeDashoffset={`${2 * Math.PI * 52 * (1 - (isStarted ? formScore : 0) / 100)}`}
                      className="score-ring transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{isStarted && !isFinished ? formScore : "--"}</span>
                    <span className="text-xs text-muted">Form Score</span>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-card-border">
                  <span className="text-sm text-muted">Reps</span>
                  <span className="text-sm font-bold tabular-nums">
                    {reps} / {selectedExercise.targetReps}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-card-border">
                  <span className="text-sm text-muted">
                    {selectedExercise.id === "knee-flexion"
                      ? "Knee Angle"
                      : selectedExercise.id === "shoulder-abduction"
                        ? "Shoulder Angle"
                        : selectedExercise.id === "hip-extension"
                          ? "Hip Angle"
                          : selectedExercise.id === "elbow-flexion"
                            ? "Elbow Angle"
                            : selectedExercise.id === "ankle-dorsiflexion"
                              ? "Ankle Angle"
                              : "Angle"}
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {isStarted && !isFinished ? `${currentAngle}°` : "--°"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-card-border">
                  <span className="text-sm text-muted">Target Range</span>
                  <span className="text-sm font-bold tabular-nums">
                    {selectedExercise.targetAngleRange.min}°–{selectedExercise.targetAngleRange.max}°
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted">Movement Quality</span>
                  <span
                    className={`text-sm font-bold ${
                      movementQuality === "Good"
                        ? "text-success"
                        : movementQuality === "Fair"
                          ? "text-warning"
                          : "text-muted"
                    }`}
                  >
                    {isStarted && !isFinished ? movementQuality : "Waiting..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Feedback Card */}
            <div
              className={`rounded-2xl border-2 p-5 transition-all duration-300 ${
                feedbackType === "good"
                  ? "feedback-good border-success/30"
                  : feedbackType === "warning"
                    ? "feedback-warning border-warning/30"
                    : "feedback-error border-error/30"
              } bg-card`}
            >
              <div className="text-center">
                {isStarted && !isFinished ? (
                  <>
                    <div className="text-3xl mb-2">
                      {feedbackType === "good" ? "🟢" : feedbackType === "warning" ? "🟡" : "🔴"}
                    </div>
                    <p className="text-lg font-bold mb-1">{feedbackMessage || "Analyzing..."}</p>
                    {formIssues && (
                      <p className="text-sm text-warning font-medium">⚠ {formIssues}</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-3xl mb-2">💡</div>
                    <p className="text-sm text-muted">
                      {isFinished
                        ? "Session complete! Great work."
                        : "Start a session to see real-time feedback"}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Rep progress */}
            <div className="bg-card rounded-2xl border border-card-border p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                Rep Progress
              </h4>
              <div className="w-full bg-foreground/5 rounded-full h-3 mb-2">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-primary to-success transition-all duration-500"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted">
                <span>{reps} completed</span>
                <span>{selectedExercise.targetReps} target</span>
              </div>
            </div>

            {/* Exercise info */}
            <div className="bg-card rounded-2xl border border-card-border p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                About this exercise
              </h4>
              <p className="text-sm text-muted leading-relaxed">{selectedExercise.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                  {selectedExercise.category}
                </span>
                <span className="px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-medium capitalize">
                  {selectedExercise.difficulty}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

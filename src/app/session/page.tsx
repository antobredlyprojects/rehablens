"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  EXERCISES,
  getEncouragingMessage,
} from "@/lib/exercises";
import { loadState, saveState, addSession } from "@/lib/storage";
import {
  FeedbackMessage,
  FeedbackType,
  ExerciseDefinition,
} from "@/lib/types";
import {
  calculateAngle,
  analyzeForm,
  detectFormIssues,
  SKELETON_CONNECTIONS,
} from "@/lib/poseUtils";

// Simulated pose detection for hackathon demo
// In production, this would use TensorFlow.js MoveNet
function simulateKeypoints(
  frame: number,
  exercise: ExerciseDefinition
): Map<string, { x: number; y: number; score: number }> {
  const map = new Map<string, { x: number; y: number; score: number }>();
  const t = frame * 0.05;
  const base = Math.sin(t) * 0.5 + 0.5; // 0 to 1 oscillation

  // Head
  map.set("nose", { x: 0.5, y: 0.15, score: 0.98 });
  map.set("left_eye", { x: 0.48, y: 0.13, score: 0.97 });
  map.set("right_eye", { x: 0.52, y: 0.13, score: 0.97 });
  map.set("left_ear", { x: 0.46, y: 0.15, score: 0.95 });
  map.set("right_ear", { x: 0.54, y: 0.15, score: 0.95 });

  // Shoulders
  map.set("left_shoulder", { x: 0.42, y: 0.28, score: 0.96 });
  map.set("right_shoulder", { x: 0.58, y: 0.28, score: 0.96 });

  // Arms (slightly moving)
  map.set("left_elbow", {
    x: 0.35 + base * 0.05,
    y: 0.38 + base * 0.02,
    score: 0.94,
  });
  map.set("right_elbow", {
    x: 0.65 - base * 0.05,
    y: 0.38 + base * 0.02,
    score: 0.94,
  });
  map.set("left_wrist", {
    x: 0.32 + base * 0.03,
    y: 0.48 + base * 0.03,
    score: 0.9,
  });
  map.set("right_wrist", {
    x: 0.68 - base * 0.03,
    y: 0.48 + base * 0.03,
    score: 0.9,
  });

  // Hips
  map.set("left_hip", { x: 0.44, y: 0.52, score: 0.95 });
  map.set("right_hip", { x: 0.56, y: 0.52, score: 0.95 });

  // Legs — exercise-dependent movement
  if (
    exercise.id === "knee-flexion" ||
    exercise.id === "hip-extension"
  ) {
    // Right leg bending
    const bend = base * 0.12;
    map.set("left_knee", { x: 0.43, y: 0.68, score: 0.93 });
    map.set("right_knee", {
      x: 0.56 + bend,
      y: 0.66 - bend * 0.5,
      score: 0.93,
    });
    map.set("left_ankle", { x: 0.43, y: 0.85, score: 0.91 });
    map.set("right_ankle", {
      x: 0.56 + bend * 0.5,
      y: 0.85,
      score: 0.91,
    });
  } else if (exercise.id === "ankle-dorsiflexion") {
    map.set("left_knee", { x: 0.43, y: 0.68, score: 0.93 });
    map.set("right_knee", { x: 0.56, y: 0.68, score: 0.93 });
    map.set("left_ankle", { x: 0.43, y: 0.85, score: 0.91 });
    map.set("right_ankle", {
      x: 0.56,
      y: 0.85 - base * 0.03,
      score: 0.91,
    });
  } else {
    map.set("left_knee", { x: 0.43, y: 0.68, score: 0.93 });
    map.set("right_knee", { x: 0.56, y: 0.68, score: 0.93 });
    map.set("left_ankle", { x: 0.43, y: 0.85, score: 0.91 });
    map.set("right_ankle", { x: 0.56, y: 0.85, score: 0.91 });
  }

  return map;
}

function getAngleForExercise(
  exerciseId: string,
  keypoints: Map<string, { x: number; y: number; score: number }>
): { angle: number; jointName: string } | null {
  const get = (name: string) => keypoints.get(name);

  switch (exerciseId) {
    case "knee-flexion": {
      const hip = get("right_hip") || get("left_hip");
      const knee = get("right_knee") || get("left_knee");
      const ankle = get("right_ankle") || get("left_ankle");
      if (hip && knee && ankle)
        return {
          angle: Math.round(calculateAngle(hip, knee, ankle)),
          jointName: "Knee Angle",
        };
      break;
    }
    case "shoulder-abduction": {
      const elbow = get("right_elbow") || get("left_elbow");
      const shoulder = get("right_shoulder") || get("left_shoulder");
      const hip = get("right_hip") || get("left_hip");
      if (elbow && shoulder && hip)
        return {
          angle: Math.round(calculateAngle(elbow, shoulder, hip)),
          jointName: "Shoulder Angle",
        };
      break;
    }
    case "hip-extension": {
      const shoulder = get("right_shoulder") || get("left_shoulder");
      const hip = get("right_hip") || get("left_hip");
      const knee = get("right_knee") || get("left_knee");
      if (shoulder && hip && knee)
        return {
          angle: Math.round(calculateAngle(shoulder, hip, knee)),
          jointName: "Hip Angle",
        };
      break;
    }
    case "elbow-flexion": {
      const shoulder = get("right_shoulder") || get("left_shoulder");
      const elbow = get("right_elbow") || get("left_elbow");
      const wrist = get("right_wrist") || get("left_wrist");
      if (shoulder && elbow && wrist)
        return {
          angle: Math.round(calculateAngle(shoulder, elbow, wrist)),
          jointName: "Elbow Angle",
        };
      break;
    }
    case "ankle-dorsiflexion": {
      const knee = get("right_knee") || get("left_knee");
      const ankle = get("right_ankle") || get("left_ankle");
      if (knee && ankle) {
        const foot = { x: ankle.x, y: ankle.y + 0.1, score: 0.9 };
        return {
          angle: Math.round(calculateAngle(knee, ankle, foot)),
          jointName: "Ankle Angle",
        };
      }
      break;
    }
    case "trunk-rotation": {
      const ls = get("left_shoulder");
      const rs = get("right_shoulder");
      const lh = get("left_hip");
      const rh = get("right_hip");
      if (ls && rs && lh && rh) {
        const sAngle = Math.atan2(rs.y - ls.y, rs.x - ls.x);
        const hAngle = Math.atan2(rh.y - lh.y, rh.x - lh.x);
        const rot = Math.abs(((sAngle - hAngle) * 180) / Math.PI);
        return {
          angle: Math.round(Math.min(rot, 360 - rot)),
          jointName: "Rotation",
        };
      }
      break;
    }
  }
  return null;
}

export default function SessionPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const frameCountRef = useRef(0);

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
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackMessage[]>([]);
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseDefinition>(EXERCISES[0]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [encouragingMsg, setEncouragingMsg] = useState("");
  const [showCameraFeed, setShowCameraFeed] = useState(true);

  // Timer
  useEffect(() => {
    if (!isStarted || isPaused || isFinished) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isStarted, isPaused, isFinished]);

  // Simulate rep counting (every ~3 seconds)
  useEffect(() => {
    if (!isStarted || isPaused || isFinished) return;
    const id = setInterval(() => {
      setReps((prev) => {
        if (prev >= selectedExercise.targetReps) return prev;
        return prev + 1;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [isStarted, isPaused, isFinished, selectedExercise.targetReps]);

  // Canvas drawing loop
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark background (simulated camera)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, w, h);

    // Subtle gradient
    const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(8,145,178,0.05)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (!isStarted || isFinished) {
      // Show "Click Start" text
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        isFinished ? "Session Complete ✓" : "Press Start to begin AI analysis",
        w / 2,
        h / 2
      );
      return;
    }

    const frame = frameCountRef.current;
    const keypoints = simulateKeypoints(frame, selectedExercise);

    // Draw skeleton connections
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const [from, to] of SKELETON_CONNECTIONS) {
      const p1 = keypoints.get(from);
      const p2 = keypoints.get(to);
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.strokeStyle = "rgba(34,211,238,0.6)";
        ctx.stroke();
      }
    }

    // Draw joints
    for (const [, kp] of keypoints) {
      ctx.beginPath();
      ctx.arc(kp.x * w, kp.y * h, 5, 0, Math.PI * 2);
      ctx.fillStyle = feedbackType === "good" ? "#10b981" : feedbackType === "warning" ? "#f59e0b" : "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Angle calculation
    const angleResult = getAngleForExercise(selectedExercise.id, keypoints);
    if (angleResult) {
      setCurrentAngle(angleResult.angle);
      const formResult = analyzeForm(
        angleResult.angle,
        selectedExercise.targetAngleRange
      );
      setFormScore(formResult.score);
      setFeedbackMessage(formResult.message);
      setFeedbackType(formResult.type);
      setMovementQuality(
        formResult.type === "good"
          ? "Good"
          : formResult.type === "warning"
            ? "Fair"
            : "Needs work"
      );

      // Form issues
      const issues = detectFormIssues(selectedExercise.id, keypoints);
      setFormIssues(issues);
    }

    // Draw angle indicator on canvas
    if (angleResult) {
      const knee =
        keypoints.get("right_knee") || keypoints.get("left_knee");
      if (knee) {
        ctx.fillStyle =
          feedbackType === "good"
            ? "rgba(16,185,129,0.9)"
            : feedbackType === "warning"
              ? "rgba(245,158,11,0.9)"
              : "rgba(239,68,68,0.9)";
        ctx.font = "bold 16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `${angleResult.angle}°`,
          knee.x * w + 30,
          knee.y * h - 10
        );

        // Angle arc
        ctx.beginPath();
        ctx.arc(knee.x * w, knee.y * h, 20, 0, ((angleResult.angle / 180) * Math.PI));
        ctx.strokeStyle =
          feedbackType === "good"
            ? "rgba(16,185,129,0.5)"
            : "rgba(245,158,11,0.5)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }, [isStarted, isFinished, selectedExercise, feedbackType]);

  // Animation loop
  useEffect(() => {
    if (!isStarted || isPaused) return;

    let running = true;
    const loop = () => {
      if (!running) return;
      frameCountRef.current++;
      drawFrame();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isStarted, isPaused, drawFrame]);

  // Draw idle state
  useEffect(() => {
    if (isStarted && !isPaused) return;
    drawFrame();
  }, [isStarted, isPaused, isFinished, drawFrame]);

  const handleStart = () => {
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
    setFeedbackHistory([]);
    frameCountRef.current = 0;
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleEnd = () => {
    setIsFinished(true);
    setIsPaused(false);
    cancelAnimationFrame(animFrameRef.current);

    // Save session
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
      averageFormScore: formScore || 85,
      peakAngle: currentAngle,
      minAngle: Math.max(0, currentAngle - 20),
      feedbackMessages: feedbackHistory,
      completed: reps >= selectedExercise.targetReps,
    };
    const newState = addSession(state, session);
    saveState(newState);

    setEncouragingMsg(getEncouragingMessage());
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = selectedExercise.targetReps
    ? Math.round((reps / selectedExercise.targetReps) * 100)
    : 0;

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
              Session:{" "}
              <span className="font-medium text-foreground">Day 12</span>
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
          </div>
          <div className="flex items-center gap-2">
            {!isStarted || isFinished ? (
              <Link
                href="/"
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
                      handleStart();
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
            <div className="relative bg-card rounded-2xl border border-card-border overflow-hidden shadow-lg">
              {/* Camera canvas */}
              <div className="relative aspect-video">
                <canvas
                  ref={canvasRef}
                  width={960}
                  height={540}
                  className="w-full h-full"
                />

                {/* Camera feed background (simulated) */}
                {showCameraFeed && isStarted && !isFinished && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Subtle person silhouette hint */}
                    <svg
                      viewBox="0 0 960 540"
                      className="absolute inset-0 w-full h-full opacity-10"
                    >
                      <ellipse cx="480" cy="120" rx="30" ry="35" fill="#94a3b8" />
                      <rect x="460" y="155" width="40" height="100" rx="10" fill="#94a3b8" />
                      <rect x="430" y="255" width="25" height="120" rx="8" fill="#94a3b8" />
                      <rect x="505" y="255" width="25" height="120" rx="8" fill="#94a3b8" />
                    </svg>
                  </div>
                )}

                {/* AI analyzing indicator */}
                {isStarted && !isPaused && !isFinished && (
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      AI analyzing movement...
                    </div>
                  </div>
                )}

                {/* Pause overlay */}
                {isPaused && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-white text-2xl font-bold">Paused</div>
                  </div>
                )}

                {/* Feedback badge */}
                {isStarted && !isFinished && feedbackMessage && (
                  <div
                    className={`absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto`}
                  >
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg backdrop-blur-sm transition-all duration-300 ${
                        feedbackType === "good"
                          ? "bg-success/90 text-white"
                          : feedbackType === "warning"
                            ? "bg-warning/90 text-white"
                            : "bg-error/90 text-white"
                      }`}
                    >
                      {feedbackType === "good"
                        ? "✓"
                        : feedbackType === "warning"
                          ? "⚠"
                          : "✕"}{" "}
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
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] text-base"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white/80 animate-pulse-soft" />
                  {isFinished ? "Start New Session" : "Start AI Session"}
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
                    <p className="text-2xl font-bold text-accent">
                      {formatTime(elapsedSeconds)}
                    </p>
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
                  <svg
                    viewBox="0 0 120 120"
                    className="w-full h-full -rotate-90"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="8"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke={
                        formScore >= 80
                          ? "#10b981"
                          : formScore >= 60
                            ? "#f59e0b"
                            : "#ef4444"
                      }
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      strokeDashoffset={`${2 * Math.PI * 52 * (1 - (isStarted ? formScore : 0) / 100)}`}
                      className="score-ring transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">
                      {isStarted && !isFinished ? formScore : "--"}
                    </span>
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
                    {currentAngle > 0 ? "Knee Angle" : "Angle"}
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {isStarted && !isFinished ? `${currentAngle}°` : "--°"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-card-border">
                  <span className="text-sm text-muted">Target Range</span>
                  <span className="text-sm font-bold tabular-nums">
                    {selectedExercise.targetAngleRange.min}°–
                    {selectedExercise.targetAngleRange.max}°
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
                      {feedbackType === "good"
                        ? "🟢"
                        : feedbackType === "warning"
                          ? "🟡"
                          : "🔴"}
                    </div>
                    <p className="text-lg font-bold mb-1">
                      {feedbackMessage || "Analyzing..."}
                    </p>
                    {formIssues && (
                      <p className="text-sm text-warning font-medium">
                        ⚠ {formIssues}
                      </p>
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
              <p className="text-sm text-muted leading-relaxed">
                {selectedExercise.description}
              </p>
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

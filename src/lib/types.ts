export interface Point {
  x: number;
  y: number;
  z?: number;
  score?: number;
}

export interface Keypoint {
  name: string;
  point: Point;
}

export type FeedbackType = "good" | "warning" | "error";

export interface FeedbackMessage {
  text: string;
  type: FeedbackType;
  timestamp: number;
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  description: string;
  targetReps: number;
  targetSets: number;
  duration: number; // seconds
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  bodyPart: string;
  icon: string;
  targetAngleRange: { min: number; max: number };
  targetJoints: string[];
}

export interface SessionData {
  id: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  repsCompleted: number;
  targetReps: number;
  setsCompleted: number;
  targetSets: number;
  duration: number; // seconds
  averageFormScore: number;
  peakAngle: number;
  minAngle: number;
  feedbackMessages: FeedbackMessage[];
  completed: boolean;
}

export interface DailyProgress {
  date: string;
  sessionsCompleted: number;
  totalReps: number;
  averageFormScore: number;
  totalDuration: number;
  recoveryNote: string;
  recoveryScore: number; // 0-100
}

export interface WeeklyData {
  day: string;
  sessions: number;
  reps: number;
  formScore: number;
}

export interface AppState {
  sessions: SessionData[];
  dailyProgress: DailyProgress[];
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  overallRecoveryScore: number;
}

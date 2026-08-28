import { AppState, SessionData, DailyProgress } from "./types";

const STORAGE_KEY = "rehablens_state";

function getInitialState(): AppState {
  return {
    sessions: [],
    dailyProgress: [],
    currentStreak: 0,
    longestStreak: 0,
    totalSessions: 0,
    overallRecoveryScore: 0,
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return getInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialState();
    return JSON.parse(raw) as AppState;
  } catch {
    return getInitialState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silently fail
  }
}

export function addSession(state: AppState, session: SessionData): AppState {
  const sessions = [...state.sessions, session];
  const today = new Date().toISOString().split("T")[0];

  // Update daily progress
  const dailyProgress = [...state.dailyProgress];
  const todayIndex = dailyProgress.findIndex((d) => d.date === today);

  if (todayIndex >= 0) {
    const existing = dailyProgress[todayIndex];
    dailyProgress[todayIndex] = {
      ...existing,
      sessionsCompleted: existing.sessionsCompleted + 1,
      totalReps: existing.totalReps + session.repsCompleted,
      averageFormScore: Math.round(
        (existing.averageFormScore + session.averageFormScore) / 2
      ),
      totalDuration: existing.totalDuration + session.duration,
    };
  } else {
    dailyProgress.push({
      date: today,
      sessionsCompleted: 1,
      totalReps: session.repsCompleted,
      averageFormScore: session.averageFormScore,
      totalDuration: session.duration,
      recoveryNote: "",
      recoveryScore: Math.min(100, session.averageFormScore + 5),
    });
  }

  // Calculate streak
  const { currentStreak, longestStreak } = calculateStreak(dailyProgress);

  // Calculate overall recovery score (average of last 7 sessions)
  const recentSessions = sessions.slice(-7);
  const overallRecoveryScore =
    recentSessions.length > 0
      ? Math.round(
          recentSessions.reduce((s, ses) => s + ses.averageFormScore, 0) /
            recentSessions.length
        )
      : 0;

  return {
    sessions,
    dailyProgress,
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    totalSessions: sessions.length,
    overallRecoveryScore,
  };
}

export function updateDailyNote(
  state: AppState,
  date: string,
  note: string
): AppState {
  const dailyProgress = [...state.dailyProgress];
  const idx = dailyProgress.findIndex((d) => d.date === date);
  if (idx >= 0) {
    dailyProgress[idx] = { ...dailyProgress[idx], recoveryNote: note };
  }
  return { ...state, dailyProgress };
}

export function getWeeklyData(state: AppState): Array<{
  day: string;
  sessions: number;
  reps: number;
  formScore: number;
}> {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const result: Array<{
    day: string;
    sessions: number;
    reps: number;
    formScore: number;
  }> = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const progress = state.dailyProgress.find((p) => p.date === dateStr);
    result.push({
      day: days[d.getDay()],
      sessions: progress?.sessionsCompleted ?? 0,
      reps: progress?.totalReps ?? 0,
      formScore: progress?.averageFormScore ?? 0,
    });
  }

  return result;
}

function calculateStreak(dailyProgress: DailyProgress[]): {
  currentStreak: number;
  longestStreak: number;
} {
  const dates = dailyProgress
    .map((d) => d.date)
    .sort()
    .reverse();

  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate current streak
  const checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (dates.includes(dateStr)) {
      if (i === 0 || currentStreak > 0) {
        currentStreak++;
      } else {
        break;
      }
    } else if (i === 0) {
      // Today hasn't been completed yet, check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = checkDate.toISOString().split("T")[0];
      if (dates.includes(yesterdayStr)) {
        currentStreak++;
      } else {
        break;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    } else {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Calculate longest streak
  const sortedDates = [...dates].sort();
  tempStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays =
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadState, saveState, getWeeklyData, updateDailyNote } from "@/lib/storage";
import { getEncouragingMessage, getStreakMessage, ENCOURAGING_MESSAGES } from "@/lib/exercises";
import { AppState } from "@/lib/types";

function ScoreRing({
  score,
  size = 100,
  label,
}: {
  score: number;
  size?: number;
  label: string;
}) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const color =
    score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="6"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - score / 100)}
            className="score-ring"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold">{score}%</span>
        </div>
      </div>
      <span className="text-xs text-muted mt-2 font-medium">{label}</span>
    </div>
  );
}

function CalendarHeatmap({ state }: { state: AppState }) {
  const today = new Date();
  const weeks: Array<Array<{ date: string; count: number; isToday: boolean }>> =
    [];
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  // Build 12 weeks
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 83); // ~12 weeks

  let currentWeek: Array<{ date: string; count: number; isToday: boolean }> =
    [];

  for (let i = 0; i < 91; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const progress = state.dailyProgress.find((p) => p.date === dateStr);
    const count = progress?.sessionsCompleted ?? 0;
    const isToday = dateStr === today.toISOString().split("T")[0];

    currentWeek.push({ date: dateStr, count, isToday });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: "", count: -1, isToday: false });
    }
    weeks.push(currentWeek);
  }

  const getColor = (count: number) => {
    if (count < 0) return "bg-transparent";
    if (count === 0) return "bg-foreground/5";
    if (count === 1) return "bg-success/30";
    if (count === 2) return "bg-success/60";
    return "bg-success";
  };

  return (
    <div className="bg-card rounded-2xl border border-card-border p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">
        Session Activity
      </h3>
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 mr-1">
          {dayLabels.map((label, i) => (
            <div
              key={`label-${i}`}
              className="w-4 h-4 flex items-center justify-center text-[8px] text-muted font-medium"
            >
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={`${wi}-${di}`}
                className={`w-4 h-4 rounded-sm ${getColor(day.count)} ${
                  day.isToday ? "ring-2 ring-primary ring-offset-1" : ""
                } transition-colors`}
                title={
                  day.date
                    ? `${day.date}: ${day.count} session${day.count !== 1 ? "s" : ""}`
                    : ""
                }
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-foreground/5" />
        <div className="w-3 h-3 rounded-sm bg-success/30" />
        <div className="w-3 h-3 rounded-sm bg-success/60" />
        <div className="w-3 h-3 rounded-sm bg-success" />
        <span>More</span>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const [state, setState] = useState<AppState | null>(null);
  const [weeklyData, setWeeklyData] = useState<
    Array<{ day: string; sessions: number; reps: number; formScore: number }>
  >([]);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [encouragingMsg, setEncouragingMsg] = useState("");

  useEffect(() => {
    const s = loadState();
    setState(s);
    setWeeklyData(getWeeklyData(s));
    setEncouragingMsg(getEncouragingMessage());

    // Load today's note
    const today = new Date().toISOString().split("T")[0];
    const todayProgress = s.dailyProgress.find((d) => d.date === today);
    if (todayProgress) setNote(todayProgress.recoveryNote);
  }, []);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const todayProgress = state.dailyProgress.find((d) => d.date === today);
  const recentSessions = state.sessions.slice(-7);
  const avgFormScore =
    recentSessions.length > 0
      ? Math.round(
          recentSessions.reduce((s, ses) => s + ses.averageFormScore, 0) /
            recentSessions.length
        )
      : 0;
  const totalRepsThisWeek = weeklyData.reduce((s, d) => s + d.reps, 0);
  const totalSessionsThisWeek = weeklyData.reduce(
    (s, d) => s + d.sessions,
    0
  );

  const handleSaveNote = () => {
    const newState = updateDailyNote(state, today, note);
    setState(newState);
    saveState(newState);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const maxReps = Math.max(...weeklyData.map((d) => d.reps), 1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-card-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            Progress Dashboard
          </h1>
          <p className="text-muted">
            Track your recovery journey and celebrate your milestones.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Encouraging message */}
        {state.totalSessions > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
            <p className="text-sm font-medium text-primary">
              💬 {encouragingMsg}
            </p>
          </div>
        )}

        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-2xl border border-card-border p-5 text-center">
            <p className="text-3xl font-bold text-primary">
              {state.totalSessions}
            </p>
            <p className="text-sm text-muted mt-1">Total Sessions</p>
          </div>
          <div className="bg-card rounded-2xl border border-card-border p-5 text-center">
            <p className="text-3xl font-bold text-success">
              {state.currentStreak}
            </p>
            <p className="text-sm text-muted mt-1">Day Streak</p>
            <p className="text-xs text-success/70 mt-1">
              {getStreakMessage(state.currentStreak)}
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-card-border p-5 text-center">
            <p className="text-3xl font-bold text-accent">
              {totalRepsThisWeek}
            </p>
            <p className="text-sm text-muted mt-1">Reps This Week</p>
          </div>
          <div className="bg-card rounded-2xl border border-card-border p-5 text-center">
            <p className="text-3xl font-bold text-warning">
              {totalSessionsThisWeek}
            </p>
            <p className="text-sm text-muted mt-1">Sessions This Week</p>
          </div>
        </div>

        {/* Recovery Progress */}
        <div className="mb-8 bg-card rounded-2xl border border-card-border p-6">
          <h2 className="text-lg font-bold mb-4">
            🩺 Recovery Progress
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <ScoreRing score={state.overallRecoveryScore} size={140} label="Overall Score" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-full bg-foreground/5 rounded-full h-3 flex-1">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-primary to-success transition-all duration-700"
                    style={{
                      width: `${state.overallRecoveryScore}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums w-12 text-right">
                  {state.overallRecoveryScore}%
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed">
                Based on your last 7 sessions. This reflects your exercise
                progress and movement quality — not a medical diagnosis.
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="text-center p-2 rounded-lg bg-success/5">
                  <p className="text-sm font-bold text-success">
                    {avgFormScore || state.overallRecoveryScore}%
                  </p>
                  <p className="text-[10px] text-muted">Avg Form</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-primary/5">
                  <p className="text-sm font-bold text-primary">
                    {state.longestStreak}d
                  </p>
                  <p className="text-[10px] text-muted">Best Streak</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-accent/5">
                  <p className="text-sm font-bold text-accent">
                    {totalRepsThisWeek}
                  </p>
                  <p className="text-[10px] text-muted">Week Reps</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Chart */}
          <div className="bg-card rounded-2xl border border-card-border p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">
              Weekly Progress
            </h3>
            <div className="space-y-2">
              {weeklyData.map((day, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted w-7 text-right">
                    {day.day}
                  </span>
                  <div className="flex-1 bg-foreground/5 rounded-full h-6 overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
                      style={{
                        width: `${maxReps > 0 ? (day.reps / maxReps) * 100 : 0}%`,
                        minWidth: day.reps > 0 ? "24px" : "0",
                      }}
                    />
                    {day.reps > 0 && (
                      <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-white">
                        {day.reps} reps
                      </span>
                    )}
                  </div>
                  <span className="text-xs tabular-nums text-muted w-12 text-right">
                    {day.formScore > 0 ? `${day.formScore}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted mt-3 px-10">
              <span>← Reps</span>
              <span>Form Score →</span>
            </div>
          </div>

          {/* Calendar Heatmap */}
          <CalendarHeatmap state={state} />
        </div>

        {/* Daily Recovery Note */}
        <div className="bg-card rounded-2xl border border-card-border p-6 mb-8">
          <h3 className="text-lg font-bold mb-1">📝 Today&apos;s Recovery Note</h3>
          <p className="text-sm text-muted mb-4">
            How are you feeling? Record your daily recovery observations.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Knee felt better today, movement was easier..."
              className="flex-1 px-4 py-3 rounded-xl border border-card-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button
              onClick={handleSaveNote}
              className="px-5 py-3 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary-dark transition-colors whitespace-nowrap"
            >
              {noteSaved ? "✓ Saved" : "Save Note"}
            </button>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-card rounded-2xl border border-card-border p-6">
          <h3 className="text-lg font-bold mb-4">Recent Sessions</h3>
          {state.sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted mb-4">
                No sessions yet. Start your first AI session to see your progress
                here.
              </p>
              <Link
                href="/session"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors text-sm"
              >
                Start AI Session
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {state.sessions
                .slice()
                .reverse()
                .slice(0, 10)
                .map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-background border border-card-border"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                      {session.completed ? "✅" : "🔄"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">
                          {session.exerciseName}
                        </p>
                        {session.completed && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted">
                        {new Date(session.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">
                        {session.repsCompleted}/{session.targetReps} reps
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          session.averageFormScore >= 80
                            ? "text-success"
                            : session.averageFormScore >= 60
                              ? "text-warning"
                              : "text-error"
                        }`}
                      >
                        {session.averageFormScore}% form
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

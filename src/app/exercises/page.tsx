"use client";

import { useState } from "react";
import Link from "next/link";
import { EXERCISES } from "@/lib/exercises";
import { ExerciseDefinition } from "@/lib/types";

const CATEGORIES = ["All", "Lower Body", "Upper Body", "Core"];
const DIFFICULTIES = ["All", "beginner", "intermediate", "advanced"];

export default function ExercisesPage() {
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = EXERCISES.filter((ex) => {
    if (category !== "All" && ex.category !== category) return false;
    if (difficulty !== "All" && ex.difficulty !== difficulty) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-card-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            Exercise Library
          </h1>
          <p className="text-muted">
            Browse rehabilitation exercises and start an AI-guided session.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-6 mb-8">
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Body Area
            </p>
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    category === cat
                      ? "bg-primary text-white shadow-sm"
                      : "bg-card border border-card-border text-muted hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Difficulty
            </p>
            <div className="flex gap-2">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    difficulty === diff
                      ? "bg-accent text-white shadow-sm"
                      : "bg-card border border-card-border text-muted hover:text-foreground hover:border-accent/30"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Exercise Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              isExpanded={expanded === exercise.id}
              onToggle={() =>
                setExpanded(expanded === exercise.id ? null : exercise.id)
              }
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted text-lg">
              No exercises match your filters. Try adjusting them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  isExpanded,
  onToggle,
}: {
  exercise: ExerciseDefinition;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`bg-card rounded-2xl border border-card-border overflow-hidden transition-all duration-200 ${
        isExpanded ? "shadow-lg ring-1 ring-primary/20" : "hover:shadow-md"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-5 text-left flex items-start gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
          {exercise.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground mb-0.5">
            {exercise.name}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted">{exercise.bodyPart}</span>
            <span className="text-xs text-muted">·</span>
            <span className="text-xs text-muted capitalize">
              {exercise.difficulty}
            </span>
            <span className="text-xs text-muted">·</span>
            <span className="text-xs text-muted">
              {exercise.targetReps} reps × {exercise.targetSets} sets
            </span>
          </div>
        </div>
        <span
          className={`text-muted text-lg transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-card-border pt-4 animate-fade-in">
          <p className="text-sm text-muted leading-relaxed mb-4">
            {exercise.description}
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
              {exercise.category}
            </span>
            <span className="px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-medium capitalize">
              {exercise.difficulty}
            </span>
            <span className="px-2 py-1 rounded-md bg-success/10 text-success text-xs font-medium">
              Target: {exercise.targetAngleRange.min}°–
              {exercise.targetAngleRange.max}°
            </span>
          </div>
          <Link
            href="/session"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            Start Session →
          </Link>
        </div>
      )}
    </div>
  );
}

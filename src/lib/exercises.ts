import { ExerciseDefinition } from "./types";

export const EXERCISES: ExerciseDefinition[] = [
  {
    id: "knee-flexion",
    name: "Knee Flexion",
    description:
      "Bend your knee to improve range of motion and strengthen the quadriceps. Slowly bend and straighten your leg while keeping your back straight.",
    targetReps: 15,
    targetSets: 3,
    duration: 180,
    category: "Lower Body",
    difficulty: "beginner",
    bodyPart: "Knee",
    icon: "🦵",
    targetAngleRange: { min: 80, max: 100 },
    targetJoints: ["left_knee", "right_knee", "left_hip", "right_hip"],
  },
  {
    id: "shoulder-abduction",
    name: "Shoulder Abduction",
    description:
      "Raise your arm sideways to strengthen the shoulder and improve lateral range of motion. Keep movements slow and controlled.",
    targetReps: 12,
    targetSets: 3,
    duration: 150,
    category: "Upper Body",
    difficulty: "beginner",
    bodyPart: "Shoulder",
    icon: "💪",
    targetAngleRange: { min: 80, max: 120 },
    targetJoints: [
      "left_shoulder",
      "right_shoulder",
      "left_elbow",
      "right_elbow",
    ],
  },
  {
    id: "hip-extension",
    name: "Hip Extension",
    description:
      "Extend your leg backward to strengthen the hip extensors and glutes. Stand tall and move through a controlled range.",
    targetReps: 10,
    targetSets: 3,
    duration: 120,
    category: "Lower Body",
    difficulty: "intermediate",
    bodyPart: "Hip",
    icon: "🏃",
    targetAngleRange: { min: 160, max: 180 },
    targetJoints: ["left_hip", "right_hip", "left_knee", "right_knee"],
  },
  {
    id: "elbow-flexion",
    name: "Elbow Flexion",
    description:
      "Bend your elbow to strengthen the biceps and improve joint flexibility. Keep your upper arm still while bending.",
    targetReps: 15,
    targetSets: 2,
    duration: 120,
    category: "Upper Body",
    difficulty: "beginner",
    bodyPart: "Elbow",
    icon: "🦾",
    targetAngleRange: { min: 30, max: 60 },
    targetJoints: ["left_elbow", "right_elbow"],
  },
  {
    id: "ankle-dorsiflexion",
    name: "Ankle Dorsiflexion",
    description:
      "Pull your toes upward to strengthen the shin muscles and improve ankle mobility. Sit or stand with foot flat on the floor.",
    targetReps: 20,
    targetSets: 2,
    duration: 120,
    category: "Lower Body",
    difficulty: "beginner",
    bodyPart: "Ankle",
    icon: "🦶",
    targetAngleRange: { min: 10, max: 30 },
    targetJoints: ["left_ankle", "right_ankle"],
  },
  {
    id: "trunk-rotation",
    name: "Trunk Rotation",
    description:
      "Rotate your torso side to side to improve spinal mobility and core stability. Keep your hips facing forward.",
    targetReps: 12,
    targetSets: 2,
    duration: 120,
    category: "Core",
    difficulty: "intermediate",
    bodyPart: "Spine",
    icon: "🔄",
    targetAngleRange: { min: 30, max: 45 },
    targetJoints: ["left_shoulder", "right_shoulder", "left_hip", "right_hip"],
  },
];

export const ENCOURAGING_MESSAGES = [
  "You're making great progress! Keep it up! 🌟",
  "Consistency is key — you're doing amazing! 💪",
  "Every rep brings you closer to full recovery! 🎯",
  "Your dedication is paying off! Stay strong! 🏆",
  "Movement is medicine — and you're taking yours! 💊",
  "One step at a time, one day at a time! 🌈",
  "Your body is getting stronger every day! 🔥",
  "Proud of you for showing up today! ⭐",
];

export const STREAK_MESSAGES = [
  "Get started! Complete your first session today.",
  "Nice! You've started a streak. Keep it going!",
  "3 days strong! You're building a healthy habit.",
  "A whole week! Your consistency is inspiring.",
  "14 days! You're a recovery champion! 🏆",
  "30+ days! Unstoppable! Your body thanks you. 🌟",
];

export function getEncouragingMessage(): string {
  return ENCOURAGING_MESSAGES[
    Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)
  ];
}

export function getStreakMessage(streak: number): string {
  if (streak >= 30) return STREAK_MESSAGES[5];
  if (streak >= 14) return STREAK_MESSAGES[4];
  if (streak >= 7) return STREAK_MESSAGES[3];
  if (streak >= 3) return STREAK_MESSAGES[2];
  if (streak >= 1) return STREAK_MESSAGES[1];
  return STREAK_MESSAGES[0];
}

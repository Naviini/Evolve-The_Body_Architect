/**
 * Reward Engine
 *
 * XP points, levelling system, and achievement badges.
 * All logic is pure (no side effects) — DB writes happen separately.
 */

import { UserRewards, Achievement } from '@/src/types';

// ════════════════════════════════════════════════════════════
// Level Definitions
// ════════════════════════════════════════════════════════════

export const LEVELS = [
  { level: 1, name: 'Beginner 🌱',   minXP: 0,    maxXP: 199  },
  { level: 2, name: 'Mover 🚶',      minXP: 200,  maxXP: 499  },
  { level: 3, name: 'Athlete 🏃',    minXP: 500,  maxXP: 999  },
  { level: 4, name: 'Warrior ⚔️',   minXP: 1000, maxXP: 1999 },
  { level: 5, name: 'Champion 🏆',   minXP: 2000, maxXP: 3999 },
  { level: 6, name: 'Legend 🌟',     minXP: 4000, maxXP: 99999 },
] as const;

export function getLevelForXP(xp: number): { level: number; name: string; xpToNext: number } {
  const lvl = [...LEVELS].reverse().find(l => xp >= l.minXP) ?? LEVELS[0];
  const nextLvl = LEVELS.find(l => l.level === lvl.level + 1);
  return {
    level: lvl.level,
    name: lvl.name,
    xpToNext: nextLvl ? nextLvl.minXP - xp : 0,
  };
}

// ════════════════════════════════════════════════════════════
// XP Values
// ════════════════════════════════════════════════════════════

export const XP = {
  EXERCISE_COMPLETED:     10,   // per exercise done (not skipped)
  WORKOUT_COMPLETED:      50,   // session finished
  ALL_EXERCISES_BONUS:    25,   // no skips bonus
  FIRST_WORKOUT_BONUS:    100,  // one-time first ever
  STREAK_3_DAY_BONUS:     30,
  STREAK_7_DAY_BONUS:     100,
  STREAK_30_DAY_BONUS:    300,
  EARLY_BIRD_BONUS:       20,   // before 8am
  NIGHT_OWL_BONUS:        20,   // after 9pm
  PERFECT_EFFORT_BONUS:   15,   // all efforts rated ≥ 4
};

// ════════════════════════════════════════════════════════════
// Achievement Definitions
// ════════════════════════════════════════════════════════════

export const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  {
    id: 'first_sweat',
    name: 'First Sweat',
    emoji: '💦',
    description: 'Complete your very first workout session.',
  },
  {
    id: 'no_excuses',
    name: 'Zero Excuses',
    emoji: '⚡',
    description: 'Complete 5 workouts without skipping any exercises.',
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    emoji: '🗓️',
    description: 'Maintain a 7-day workout streak.',
  },
  {
    id: 'month_machine',
    name: 'Month Machine',
    emoji: '📅',
    description: 'Maintain a 30-day workout streak.',
  },
  {
    id: 'century',
    name: 'Century',
    emoji: '💯',
    description: 'Complete 100 individual exercises in total.',
  },
  {
    id: 'calorie_crusher',
    name: 'Calorie Crusher',
    emoji: '🔥',
    description: 'Burn 500 total kcal across all workout sessions.',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    emoji: '🌅',
    description: 'Complete a workout before 8:00 AM.',
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    emoji: '🦉',
    description: 'Complete a workout after 9:00 PM.',
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    emoji: '✨',
    description: 'Rate all exercises at effort level 4 or 5 in a session.',
  },
  {
    id: 'level_3',
    name: 'Athlete Status',
    emoji: '🏃',
    description: 'Reach Level 3 (Athlete) — 500 XP earned.',
  },
  {
    id: 'level_5',
    name: 'Champion',
    emoji: '🏆',
    description: 'Reach Level 5 (Champion) — 2000 XP earned.',
  },
  {
    id: 'diversity',
    name: 'Mix Master',
    emoji: '🎨',
    description: 'Complete 5 different workout categories (strength, cardio, HIIT, yoga, recovery).',
  },
];

// ════════════════════════════════════════════════════════════
// XP Calculation
// ════════════════════════════════════════════════════════════

export interface SessionXPParams {
  exercisesCompleted: number;
  exercisesSkipped: number;
  totalExercises: number;
  isFirstWorkout: boolean;
  streak: number;
  startedAt: string;  // ISO timestamp
  allEfforts: number[]; // effort ratings (1-5)
}

export function calculateSessionXP(params: SessionXPParams): {
  total: number;
  breakdown: { label: string; xp: number }[];
} {
  const breakdown: { label: string; xp: number }[] = [];

  // Base: per exercise
  const exXP = params.exercisesCompleted * XP.EXERCISE_COMPLETED;
  if (exXP > 0) breakdown.push({ label: `${params.exercisesCompleted} exercises`, xp: exXP });

  // Workout completion
  if (params.exercisesCompleted > 0) {
    breakdown.push({ label: 'Session completed', xp: XP.WORKOUT_COMPLETED });
  }

  // No-skip bonus
  if (params.exercisesSkipped === 0 && params.exercisesCompleted === params.totalExercises) {
    breakdown.push({ label: 'Zero skips bonus!', xp: XP.ALL_EXERCISES_BONUS });
  }

  // First workout
  if (params.isFirstWorkout) {
    breakdown.push({ label: 'First workout ever! 🎉', xp: XP.FIRST_WORKOUT_BONUS });
  }

  // Streak bonus
  if (params.streak >= 30) {
    breakdown.push({ label: '30-day streak 🔥🔥🔥', xp: XP.STREAK_30_DAY_BONUS });
  } else if (params.streak >= 7) {
    breakdown.push({ label: '7-day streak 🔥', xp: XP.STREAK_7_DAY_BONUS });
  } else if (params.streak >= 3) {
    breakdown.push({ label: '3-day streak', xp: XP.STREAK_3_DAY_BONUS });
  }

  // Time-of-day
  const hour = new Date(params.startedAt).getHours();
  if (hour < 8) breakdown.push({ label: 'Early bird 🌅', xp: XP.EARLY_BIRD_BONUS });
  if (hour >= 21) breakdown.push({ label: 'Night owl 🦉', xp: XP.NIGHT_OWL_BONUS });

  // Perfect effort
  if (params.allEfforts.length > 0 && params.allEfforts.every(e => e >= 4)) {
    breakdown.push({ label: 'Perfectionist effort ✨', xp: XP.PERFECT_EFFORT_BONUS });
  }

  const total = breakdown.reduce((sum, b) => sum + b.xp, 0);
  return { total, breakdown };
}

// ════════════════════════════════════════════════════════════
// Achievement Checking
// ════════════════════════════════════════════════════════════

export interface AchievementCheckParams {
  isFirstWorkout: boolean;
  streak: number;
  totalWorkouts: number;
  totalExercises: number;
  totalCaloriesBurned: number;
  newTotalXP: number;
  exercisesSkippedInSession: number;
  allEffortsInSession: number[];
  startedAt: string;
  categoriesCompleted: string[]; // historical list of workout categories done
  existingAchievementIds: string[];
}

/** Returns IDs of newly unlocked achievements */
export function checkNewAchievements(params: AchievementCheckParams): string[] {
  const unlocked: string[] = [];
  const already = new Set(params.existingAchievementIds);

  const check = (id: string, condition: boolean) => {
    if (condition && !already.has(id)) unlocked.push(id);
  };

  check('first_sweat', params.isFirstWorkout);
  check('week_warrior', params.streak >= 7);
  check('month_machine', params.streak >= 30);
  check('century', params.totalExercises >= 100);
  check('calorie_crusher', params.totalCaloriesBurned >= 500);
  check('level_3', params.newTotalXP >= 500);
  check('level_5', params.newTotalXP >= 2000);

  const hour = new Date(params.startedAt).getHours();
  check('early_bird', hour < 8);
  check('night_owl', hour >= 21);
  check('perfectionist', params.allEffortsInSession.length > 0 && params.allEffortsInSession.every(e => e >= 4));
  check('no_excuses', params.exercisesSkippedInSession === 0 && params.totalWorkouts >= 5);

  const uniqueCategories = new Set(params.categoriesCompleted);
  check('diversity', uniqueCategories.size >= 5);

  return unlocked;
}

/** Get a full Achievement object by ID (with locked state) */
export function getAchievement(id: string, unlockedAt?: string): Achievement {
  const def = ALL_ACHIEVEMENTS.find(a => a.id === id);
  if (!def) return { id, name: 'Unknown', emoji: '❓', description: '', unlockedAt };
  return { ...def, unlockedAt };
}

/** Get all achievements with lock state for a user */
export function getAllAchievementsForUser(unlockedIds: string[]): Achievement[] {
  const unlockedSet = new Set(unlockedIds);
  return ALL_ACHIEVEMENTS.map(def => ({
    ...def,
    unlockedAt: unlockedSet.has(def.id) ? new Date().toISOString() : undefined,
  }));
}

// ════════════════════════════════════════════════════════════
// Profile Hash (for change detection)
// ════════════════════════════════════════════════════════════

/** Lightweight hash of key profile fields to detect changes */
export function hashProfile(profile: {
  weight_kg?: number | null;
  health_conditions?: string[];
  dream_fitness_level?: string | null;
  dream_weight_kg?: number | null;
  activity_level?: string | null;
  fitness_level?: string | null;
}): string {
  const str = [
    profile.weight_kg ?? '',
    (profile.health_conditions ?? []).sort().join(','),
    profile.dream_fitness_level ?? '',
    profile.dream_weight_kg ?? '',
    profile.activity_level ?? '',
  ].join('|');
  // Simple djb2 hash
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // 32-bit int
  }
  return Math.abs(hash).toString(36);
}

/**
 * Workout Engine — Local Personalised Plan Generator
 *
 * Pure, deterministic rule engine. No external API required.
 * Generates daily and weekly workout plans tailored to the user's
 * OnboardingProfile, body type, calorie data, and goals.
 */

import {
  OnboardingProfile,
  WorkoutPlan,
  WorkoutDay,
  WorkoutExercise,
  WorkoutCategory,
  DifficultyLevel,
  MuscleGroup,
  Equipment,
} from '@/src/types';

// ════════════════════════════════════════════════════════════
// Exercise Library (~80 exercises)
// ════════════════════════════════════════════════════════════

const LIBRARY: WorkoutExercise[] = [
  // ── STRENGTH / CHEST ──────────────────────────────────────
  {
    id: 'push-up', name: 'Push-Up', category: 'strength',
    muscleGroups: ['chest', 'shoulders', 'arms'], sets: 3, reps: 15, restSec: 60,
    estimatedCaloriesBurned: 8, difficulty: 'easy', equipment: 'none',
    description: 'Classic bodyweight push-up. Keep core tight throughout.',
    modification: 'Knee push-up for reduced intensity.',
    tags: ['beginner', 'no-jump', 'prenatal-safe'],
  },
  {
    id: 'incline-push-up', name: 'Incline Push-Up', category: 'strength',
    muscleGroups: ['chest', 'shoulders'], sets: 3, reps: 12, restSec: 60,
    estimatedCaloriesBurned: 6, difficulty: 'easy', equipment: 'none',
    description: 'Hands elevated on a chair or bench. Easier on the joints.',
    tags: ['beginner', 'knee-friendly', 'joint-friendly'],
  },
  {
    id: 'dumbbell-press', name: 'Dumbbell Chest Press', category: 'strength',
    muscleGroups: ['chest', 'shoulders', 'arms'], sets: 3, reps: 12, restSec: 90,
    estimatedCaloriesBurned: 12, difficulty: 'moderate', equipment: 'dumbbells',
    description: 'Lie flat, lower dumbbells to chest, press up powerfully.',
    tags: ['intermediate'],
  },
  {
    id: 'dips', name: 'Tricep Dips', category: 'strength',
    muscleGroups: ['arms', 'chest'], sets: 3, reps: 12, restSec: 60,
    estimatedCaloriesBurned: 10, difficulty: 'moderate', equipment: 'none',
    description: 'Use a chair or bench. Lower yourself slowly, press back up.',
    modification: 'Assisted dips with feet on floor.',
    tags: ['no-jump', 'knee-friendly'],
  },

  // ── STRENGTH / BACK ───────────────────────────────────────
  {
    id: 'superman', name: 'Superman Hold', category: 'strength',
    muscleGroups: ['back', 'core'], sets: 3, reps: 15, restSec: 45,
    estimatedCaloriesBurned: 5, difficulty: 'easy', equipment: 'none',
    description: 'Lie face down, lift arms and legs. Hold 2 sec. Great for lower back.',
    tags: ['beginner', 'back-friendly', 'no-jump', 'knee-friendly', 'prenatal-safe'],
  },
  {
    id: 'dumbbell-row', name: 'Dumbbell Row', category: 'strength',
    muscleGroups: ['back', 'arms'], sets: 3, reps: 12, restSec: 75,
    estimatedCaloriesBurned: 11, difficulty: 'moderate', equipment: 'dumbbells',
    description: 'Brace one hand on bench, row dumbbell to hip. Squeeze back.',
    modification: 'Use resistance band anchored to a door.',
    tags: ['intermediate'],
  },
  {
    id: 'band-pull-apart', name: 'Band Pull-Apart', category: 'strength',
    muscleGroups: ['back', 'shoulders'], sets: 3, reps: 20, restSec: 45,
    estimatedCaloriesBurned: 5, difficulty: 'easy', equipment: 'resistance_band',
    description: 'Hold band at shoulder height, pull apart until arms are wide.',
    tags: ['beginner', 'back-friendly', 'shoulder-friendly', 'no-jump'],
  },
  {
    id: 'lat-pulldown', name: 'Lat Pulldown', category: 'strength',
    muscleGroups: ['back', 'arms'], sets: 3, reps: 10, restSec: 90,
    estimatedCaloriesBurned: 14, difficulty: 'hard', equipment: 'gym',
    description: 'Pull bar to upper chest. Lean back slightly. V-taper builder.',
    tags: ['advanced', 'gym-required'],
  },

  // ── STRENGTH / SHOULDERS ──────────────────────────────────
  {
    id: 'shoulder-press', name: 'Dumbbell Shoulder Press', category: 'strength',
    muscleGroups: ['shoulders', 'arms'], sets: 3, reps: 12, restSec: 75,
    estimatedCaloriesBurned: 10, difficulty: 'moderate', equipment: 'dumbbells',
    description: 'Seated or standing. Press dumbbells overhead from ear height.',
    tags: ['intermediate'],
  },
  {
    id: 'lateral-raise', name: 'Lateral Raise', category: 'strength',
    muscleGroups: ['shoulders'], sets: 3, reps: 15, restSec: 60,
    estimatedCaloriesBurned: 7, difficulty: 'easy', equipment: 'dumbbells',
    description: 'Raise arms to shoulder height with a slight elbow bend.',
    tags: ['beginner', 'no-jump'],
  },
  {
    id: 'band-shoulder-press', name: 'Band Overhead Press', category: 'strength',
    muscleGroups: ['shoulders', 'arms'], sets: 3, reps: 15, restSec: 60,
    estimatedCaloriesBurned: 8, difficulty: 'easy', equipment: 'resistance_band',
    description: 'Stand on band, press handles overhead.',
    tags: ['beginner', 'no-jump', 'prenatal-safe'],
  },

  // ── STRENGTH / ARMS ───────────────────────────────────────
  {
    id: 'bicep-curl', name: 'Dumbbell Bicep Curl', category: 'strength',
    muscleGroups: ['arms'], sets: 3, reps: 12, restSec: 60,
    estimatedCaloriesBurned: 8, difficulty: 'easy', equipment: 'dumbbells',
    description: 'Stand tall, curl dumbbells to shoulders. Control the descent.',
    tags: ['beginner', 'no-jump'],
  },
  {
    id: 'hammer-curl', name: 'Hammer Curl', category: 'strength',
    muscleGroups: ['arms'], sets: 3, reps: 12, restSec: 60,
    estimatedCaloriesBurned: 8, difficulty: 'easy', equipment: 'dumbbells',
    description: 'Palms face in. Builds the brachialis and forearms.',
    tags: ['beginner', 'no-jump'],
  },
  {
    id: 'tricep-extension', name: 'Overhead Tricep Extension', category: 'strength',
    muscleGroups: ['arms'], sets: 3, reps: 12, restSec: 60,
    estimatedCaloriesBurned: 7, difficulty: 'easy', equipment: 'dumbbells',
    description: 'Hold one dumbbell overhead, lower behind head, extend up.',
    tags: ['beginner', 'no-jump'],
  },

  // ── STRENGTH / CORE ───────────────────────────────────────
  {
    id: 'plank', name: 'Plank Hold', category: 'strength',
    muscleGroups: ['core'], durationSec: 45, restSec: 45,
    estimatedCaloriesBurned: 5, difficulty: 'easy', equipment: 'none',
    description: 'Forearm plank. Keep hips level. Breathe steadily.',
    modification: 'Drop to knees if needed.',
    tags: ['beginner', 'back-friendly', 'no-jump', 'prenatal-safe'],
  },
  {
    id: 'dead-bug', name: 'Dead Bug', category: 'strength',
    muscleGroups: ['core'], sets: 3, reps: 10, restSec: 45,
    estimatedCaloriesBurned: 5, difficulty: 'easy', equipment: 'none',
    description: 'On back, extend opposite arm and leg while keeping lower back flat.',
    tags: ['beginner', 'back-friendly', 'no-jump', 'prenatal-safe'],
  },
  {
    id: 'bicycle-crunch', name: 'Bicycle Crunch', category: 'strength',
    muscleGroups: ['core'], sets: 3, reps: 20, restSec: 45,
    estimatedCaloriesBurned: 8, difficulty: 'moderate', equipment: 'none',
    description: 'Alternate elbow to opposite knee. Control the rotation.',
    tags: ['intermediate', 'no-jump'],
  },
  {
    id: 'leg-raise', name: 'Leg Raise', category: 'strength',
    muscleGroups: ['core'], sets: 3, reps: 12, restSec: 45,
    estimatedCaloriesBurned: 6, difficulty: 'moderate', equipment: 'none',
    description: 'Lie flat, raise legs to 90° while pressing lower back into floor.',
    modification: 'Bend knees for less intensity.',
    tags: ['intermediate', 'no-jump'],
  },
  {
    id: 'russian-twist', name: 'Russian Twist', category: 'strength',
    muscleGroups: ['core'], sets: 3, reps: 20, restSec: 45,
    estimatedCaloriesBurned: 7, difficulty: 'moderate', equipment: 'none',
    description: 'Seated, feet off floor, rotate torso side to side.',
    modification: 'Keep feet grounded to reduce difficulty.',
    tags: ['intermediate', 'no-jump'],
  },

  // ── STRENGTH / LEGS ───────────────────────────────────────
  {
    id: 'bodyweight-squat', name: 'Bodyweight Squat', category: 'strength',
    muscleGroups: ['legs', 'glutes'], sets: 3, reps: 20, restSec: 60,
    estimatedCaloriesBurned: 10, difficulty: 'easy', equipment: 'none',
    description: 'Feet shoulder-width, lower until thighs are parallel. Drive through heels.',
    modification: 'Sit to a chair for assistance.',
    tags: ['beginner', 'no-jump'],
  },
  {
    id: 'wall-sit', name: 'Wall Sit', category: 'strength',
    muscleGroups: ['legs', 'glutes'], durationSec: 45, restSec: 45,
    estimatedCaloriesBurned: 6, difficulty: 'easy', equipment: 'none',
    description: 'Back against wall, thighs parallel to floor. Hold.',
    tags: ['beginner', 'no-jump', 'knee-friendly', 'prenatal-safe'],
  },
  {
    id: 'glute-bridge', name: 'Glute Bridge', category: 'strength',
    muscleGroups: ['glutes', 'legs', 'core'], sets: 3, reps: 20, restSec: 45,
    estimatedCaloriesBurned: 7, difficulty: 'easy', equipment: 'none',
    description: 'Lie on back, drive hips to ceiling. Squeeze glutes at top.',
    tags: ['beginner', 'back-friendly', 'knee-friendly', 'prenatal-safe'],
  },
  {
    id: 'reverse-lunge', name: 'Reverse Lunge', category: 'strength',
    muscleGroups: ['legs', 'glutes'], sets: 3, reps: 10, restSec: 60,
    estimatedCaloriesBurned: 10, difficulty: 'moderate', equipment: 'none',
    description: 'Step backward into a lunge. Easier on the knees than forward lunge.',
    modification: 'Hold a wall for balance.',
    tags: ['intermediate', 'no-jump', 'knee-friendly'],
  },
  {
    id: 'forward-lunge', name: 'Forward Lunge', category: 'strength',
    muscleGroups: ['legs', 'glutes'], sets: 3, reps: 10, restSec: 60,
    estimatedCaloriesBurned: 11, difficulty: 'moderate', equipment: 'none',
    description: 'Step forward, lower back knee toward floor. Keep chest upright.',
    tags: ['intermediate', 'no-jump'],
  },
  {
    id: 'goblet-squat', name: 'Goblet Squat', category: 'strength',
    muscleGroups: ['legs', 'glutes', 'core'], sets: 3, reps: 12, restSec: 75,
    estimatedCaloriesBurned: 12, difficulty: 'moderate', equipment: 'dumbbells',
    description: 'Hold dumbbell at chest, squat deep. Great for posture.',
    tags: ['intermediate', 'no-jump'],
  },
  {
    id: 'romanian-deadlift', name: 'Romanian Deadlift', category: 'strength',
    muscleGroups: ['legs', 'glutes', 'back'], sets: 3, reps: 12, restSec: 90,
    estimatedCaloriesBurned: 14, difficulty: 'hard', equipment: 'dumbbells',
    description: 'Hinge at hips, push them back, lower weights along legs. No rounding.',
    tags: ['advanced', 'no-jump'],
  },
  {
    id: 'calf-raise', name: 'Calf Raise', category: 'strength',
    muscleGroups: ['legs'], sets: 3, reps: 20, restSec: 45,
    estimatedCaloriesBurned: 5, difficulty: 'easy', equipment: 'none',
    description: 'Rise onto toes, lower slowly. Stand near wall for balance.',
    tags: ['beginner', 'no-jump', 'knee-friendly', 'prenatal-safe'],
  },

  // ── HIIT / CARDIO (bodyweight) ────────────────────────────
  {
    id: 'jumping-jack', name: 'Jumping Jacks', category: 'hiit',
    muscleGroups: ['full_body', 'cardio'], durationSec: 45, restSec: 15,
    estimatedCaloriesBurned: 12, difficulty: 'easy', equipment: 'none',
    description: 'Classic cardio warm-up. Keep a light bounce.',
    modification: 'Step jacks — step side to side instead of jumping.',
    tags: ['beginner'],
  },
  {
    id: 'high-knees', name: 'High Knees', category: 'hiit',
    muscleGroups: ['legs', 'core', 'cardio'], durationSec: 40, restSec: 20,
    estimatedCaloriesBurned: 14, difficulty: 'moderate', equipment: 'none',
    description: 'Run in place lifting knees to hip height. Pump arms.',
    modification: 'March in place for low-impact.',
    tags: ['intermediate'],
  },
  {
    id: 'burpee', name: 'Burpee', category: 'hiit',
    muscleGroups: ['full_body', 'cardio'], sets: 3, reps: 10, restSec: 60,
    estimatedCaloriesBurned: 18, difficulty: 'hard', equipment: 'none',
    description: 'Squat down, jump feet back, press up, jump up. Full body power.',
    modification: 'Half burpee — skip the jump, step feet back instead.',
    tags: ['advanced'],
  },
  {
    id: 'mountain-climber', name: 'Mountain Climbers', category: 'hiit',
    muscleGroups: ['core', 'legs', 'cardio'], durationSec: 40, restSec: 20,
    estimatedCaloriesBurned: 13, difficulty: 'moderate', equipment: 'none',
    description: 'Plank position — drive knees to chest alternately at speed.',
    modification: 'Slow it down to just a core move.',
    tags: ['intermediate', 'no-jump'],
  },
  {
    id: 'squat-jump', name: 'Jump Squat', category: 'hiit',
    muscleGroups: ['legs', 'glutes', 'cardio'], sets: 3, reps: 15, restSec: 60,
    estimatedCaloriesBurned: 16, difficulty: 'hard', equipment: 'none',
    description: 'Squat deep, explode upward, land softly. Plyometric power.',
    modification: 'Bodyweight squat without jump.',
    tags: ['advanced'],
  },
  {
    id: 'box-step', name: 'Step-Up (Chair)', category: 'cardio',
    muscleGroups: ['legs', 'glutes', 'cardio'], sets: 3, reps: 15, restSec: 45,
    estimatedCaloriesBurned: 10, difficulty: 'easy', equipment: 'none',
    description: 'Step up and down on a sturdy chair or step. Alternate legs.',
    tags: ['beginner', 'no-jump', 'knee-friendly', 'prenatal-safe'],
  },

  // ── CARDIO ────────────────────────────────────────────────
  {
    id: 'brisk-walk', name: 'Brisk Walk', category: 'cardio',
    muscleGroups: ['legs', 'cardio'], durationSec: 1800, restSec: 0,
    estimatedCaloriesBurned: 120, difficulty: 'easy', equipment: 'none',
    description: '30-minute brisk walk outdoors or on a treadmill.',
    tags: ['beginner', 'prenatal-safe', 'no-jump', 'heart-friendly', 'joint-friendly'],
  },
  {
    id: 'jog', name: 'Easy Jog', category: 'cardio',
    muscleGroups: ['legs', 'cardio'], durationSec: 1200, restSec: 0,
    estimatedCaloriesBurned: 180, difficulty: 'moderate', equipment: 'none',
    description: '20-min easy-paced jog. Keep a conversational pace.',
    tags: ['intermediate'],
  },
  {
    id: 'cycling', name: 'Cycling (Stationary/Outdoor)', category: 'cardio',
    muscleGroups: ['legs', 'cardio'], durationSec: 1800, restSec: 0,
    estimatedCaloriesBurned: 200, difficulty: 'moderate', equipment: 'gym',
    description: '30-min moderate cycling. Low impact on joints.',
    tags: ['intermediate', 'knee-friendly', 'joint-friendly'],
  },
  {
    id: 'jump-rope', name: 'Jump Rope', category: 'hiit',
    muscleGroups: ['legs', 'cardio', 'full_body'], durationSec: 300, restSec: 60,
    estimatedCaloriesBurned: 80, difficulty: 'hard', equipment: 'none',
    description: '5-min jump rope blast. Excellent calorie burner.',
    tags: ['advanced'],
  },
  {
    id: 'swim', name: 'Swimming', category: 'cardio',
    muscleGroups: ['full_body', 'cardio'], durationSec: 1800, restSec: 0,
    estimatedCaloriesBurned: 250, difficulty: 'moderate', equipment: 'gym',
    description: '30-min swim. Zero impact. Ideal for joint issues.',
    tags: ['intermediate', 'knee-friendly', 'joint-friendly', 'back-friendly', 'prenatal-safe'],
  },

  // ── FLEXIBILITY / MOBILITY ────────────────────────────────
  {
    id: 'cat-cow', name: 'Cat-Cow Stretch', category: 'mobility',
    muscleGroups: ['back', 'core'], durationSec: 60, restSec: 0,
    estimatedCaloriesBurned: 2, difficulty: 'easy', equipment: 'none',
    description: 'On hands and knees, alternate arching and rounding the spine.',
    tags: ['beginner', 'back-friendly', 'prenatal-safe', 'no-jump'],
  },
  {
    id: 'childs-pose', name: "Child's Pose", category: 'flexibility',
    muscleGroups: ['back', 'legs'], durationSec: 60, restSec: 0,
    estimatedCaloriesBurned: 2, difficulty: 'easy', equipment: 'none',
    description: 'Kneel, sit back on heels, arms extended forward. Deep stretch.',
    tags: ['beginner', 'back-friendly', 'no-jump', 'prenatal-safe'],
  },
  {
    id: 'hip-flexor-stretch', name: 'Hip Flexor Stretch', category: 'flexibility',
    muscleGroups: ['legs', 'core'], durationSec: 90, restSec: 0,
    estimatedCaloriesBurned: 3, difficulty: 'easy', equipment: 'none',
    description: 'Lunge position, lower back knee, push hips forward gently.',
    modification: 'Hold a wall for balance.',
    tags: ['beginner', 'back-friendly', 'no-jump', 'knee-friendly'],
  },
  {
    id: 'hamstring-stretch', name: 'Seated Hamstring Stretch', category: 'flexibility',
    muscleGroups: ['legs'], durationSec: 60, restSec: 0,
    estimatedCaloriesBurned: 2, difficulty: 'easy', equipment: 'none',
    description: 'Sit on floor, legs extended, reach toward toes.',
    tags: ['beginner', 'back-friendly', 'no-jump', 'knee-friendly', 'prenatal-safe'],
  },
  {
    id: 'thoracic-rotation', name: 'Thoracic Rotation', category: 'mobility',
    muscleGroups: ['back', 'shoulders'], durationSec: 60, restSec: 0,
    estimatedCaloriesBurned: 2, difficulty: 'easy', equipment: 'none',
    description: 'Side-lying, stack knees, rotate upper back open. Desk worker gold.',
    tags: ['beginner', 'back-friendly', 'no-jump', 'joint-friendly'],
  },
  {
    id: 'ankle-circles', name: 'Ankle & Wrist Circles', category: 'mobility',
    muscleGroups: ['legs'], durationSec: 60, restSec: 0,
    estimatedCaloriesBurned: 1, difficulty: 'easy', equipment: 'none',
    description: 'Rotate ankles and wrists in both directions. Joint health.',
    tags: ['beginner', 'prenatal-safe', 'no-jump', 'joint-friendly'],
  },
  {
    id: 'pigeon-pose', name: 'Pigeon Pose', category: 'flexibility',
    muscleGroups: ['glutes', 'legs'], durationSec: 90, restSec: 0,
    estimatedCaloriesBurned: 3, difficulty: 'moderate', equipment: 'none',
    description: 'Hip opener. From plank, bring one knee forward behind wrist.',
    modification: 'Figure-four stretch lying on back.',
    tags: ['intermediate', 'no-jump', 'knee-friendly'],
  },

  // ── YOGA / RECOVERY ──────────────────────────────────────
  {
    id: 'sun-salutation', name: 'Sun Salutation (3 rounds)', category: 'yoga',
    muscleGroups: ['full_body'], durationSec: 600, restSec: 0,
    estimatedCaloriesBurned: 40, difficulty: 'moderate', equipment: 'none',
    description: 'Flowing sequence: mountain, forward fold, plank, cobra, down dog.',
    modification: 'Cobra instead of upward dog. Skip jump backs.',
    tags: ['intermediate', 'no-jump'],
  },
  {
    id: 'yoga-deep-stretch', name: 'Yoga Deep Stretch Flow', category: 'yoga',
    muscleGroups: ['full_body'], durationSec: 1200, restSec: 0,
    estimatedCaloriesBurned: 35, difficulty: 'easy', equipment: 'none',
    description: '20-min complete stretch flow. Ideal as rest day movement.',
    tags: ['beginner', 'back-friendly', 'knee-friendly', 'heart-friendly', 'prenatal-safe'],
  },
  {
    id: 'breathing-meditation', name: 'Breathing & Meditation', category: 'recovery',
    muscleGroups: ['full_body'], durationSec: 600, restSec: 0,
    estimatedCaloriesBurned: 15, difficulty: 'easy', equipment: 'none',
    description: '10-min box breathing. Reduces cortisol and supports recovery.',
    tags: ['beginner', 'heart-friendly', 'prenatal-safe'],
  },
  {
    id: 'foam-roll', name: 'Foam Rolling Session', category: 'recovery',
    muscleGroups: ['full_body'], durationSec: 900, restSec: 0,
    estimatedCaloriesBurned: 20, difficulty: 'easy', equipment: 'none',
    description: '15-min foam rolling: quads, hamstrings, calves, upper back.',
    tags: ['beginner', 'back-friendly', 'knee-friendly', 'joint-friendly'],
  },
  {
    id: 'light-walk', name: 'Easy Walk (20 min)', category: 'recovery',
    muscleGroups: ['legs', 'cardio'], durationSec: 1200, restSec: 0,
    estimatedCaloriesBurned: 75, difficulty: 'easy', equipment: 'none',
    description: 'Gentle recover walk. Boosts blood flow without stress.',
    tags: ['beginner', 'heart-friendly', 'joint-friendly', 'prenatal-safe', 'no-jump'],
  },

  // ── FULL BODY CIRCUITS ────────────────────────────────────
  {
    id: 'circuit-beginner', name: 'Beginner Full-Body Circuit', category: 'strength',
    muscleGroups: ['full_body'], sets: 2, reps: 12, restSec: 90,
    estimatedCaloriesBurned: 80, difficulty: 'easy', equipment: 'none',
    description: '2 rounds: push-up, squat, glute bridge, plank (30s), march. Rest 90s.',
    tags: ['beginner', 'no-jump'],
  },
  {
    id: 'circuit-intermediate', name: 'Intermediate Full-Body Circuit', category: 'strength',
    muscleGroups: ['full_body'], sets: 3, reps: 15, restSec: 75,
    estimatedCaloriesBurned: 130, difficulty: 'moderate', equipment: 'none',
    description: '3 rounds: push-up, reverse lunge, mountain climber, plank, bicycle crunch.',
    tags: ['intermediate'],
  },
  {
    id: 'hiit-tabata', name: 'Tabata HIIT (20/10)', category: 'hiit',
    muscleGroups: ['full_body', 'cardio'], sets: 8, durationSec: 20, restSec: 10,
    estimatedCaloriesBurned: 150, difficulty: 'intense', equipment: 'none',
    description: '8 rounds of 20s max effort / 10s rest. Choose: burpees, squat jumps, high knees.',
    tags: ['advanced'],
  },
];

// ════════════════════════════════════════════════════════════
// Helper utilities
// ════════════════════════════════════════════════════════════

/** Return true if a tag is present in the exercise */
const hasTag = (e: WorkoutExercise, tag: string) => e.tags.includes(tag);

/**
 * Filter exercises by required tags (must have ALL) and excluded categories.
 */
function filterExercises(
  exercises: WorkoutExercise[],
  opts: {
    requiredTags?: string[];
    excludeTags?: string[];
    categories?: WorkoutCategory[];
    difficulty?: DifficultyLevel[];
    excludeIds?: string[];
  }
): WorkoutExercise[] {
  return exercises.filter(e => {
    if (opts.excludeIds?.includes(e.id)) return false;
    if (opts.categories && !opts.categories.includes(e.category)) return false;
    if (opts.difficulty && !opts.difficulty.includes(e.difficulty)) return false;
    if (opts.requiredTags && !opts.requiredTags.every(t => hasTag(e, t))) return false;
    if (opts.excludeTags && opts.excludeTags.some(t => hasTag(e, t))) return false;
    return true;
  });
}

/** Pick n random exercises from an array (seeded by a number for reproducibility) */
function pick(arr: WorkoutExercise[], n: number, seed: number): WorkoutExercise[] {
  if (arr.length === 0) return [];
  const shuffled = [...arr].sort(
    (a, b) => (((seed * 9301 + 49297) % 233280) / 233280) - 0.5 + a.id.length - b.id.length
  );
  return shuffled.slice(0, Math.min(n, arr.length));
}

/** Monday of the week containing `date` */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

// ════════════════════════════════════════════════════════════
// Plan derivation from profile
// ════════════════════════════════════════════════════════════

interface PlanParams {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'athlete';
  bodyType: 'ectomorph' | 'mesomorph' | 'endomorph' | 'unknown';
  goal: 'cut' | 'bulk' | 'maintain' | 'tone';
  calorieDeficit: number;        // negative = deficit, positive = surplus
  activityLevel: string;
  tags: string[];                // e.g. ['knee-friendly', 'back-friendly']
  isPrenatal: boolean;
  highStress: boolean;
  poorSleep: boolean;
  heartCondition: boolean;
  restDaysPerWeek: number;
  primaryFocus: WorkoutCategory;
  reasoning: string;
}

function derivePlanParams(
  profile: OnboardingProfile,
  weeklyCalorieDeficit: number
): PlanParams {
  const reasons: string[] = [];
  const tags: string[] = [];

  // ── Fitness level ────────────────────────────────────────
  const fitnessLevel = (profile.dream_fitness_level ?? profile.activity_level === 'very_active'
    ? 'advanced'
    : profile.activity_level === 'active' ? 'intermediate' : 'beginner') as PlanParams['fitnessLevel'];

  // ── Goal (cut / bulk / maintain) ────────────────────────
  const dreamWeight = profile.dream_weight_kg;
  const currentWeight = profile.weight_kg;
  let goal: PlanParams['goal'] = 'maintain';
  if (dreamWeight && currentWeight) {
    if (dreamWeight < currentWeight - 2) { goal = 'cut'; reasons.push('Weight loss goal detected → cardio priority 🔥'); }
    else if (dreamWeight > currentWeight + 2) { goal = 'bulk'; reasons.push('Muscle gain goal → strength focus 💪'); }
    else { goal = 'tone'; reasons.push('Body recomposition goal → balanced plan ⚡'); }
  }

  // ── Calorie context ─────────────────────────────────────
  const avgDailyDeficit = weeklyCalorieDeficit / 7;
  if (avgDailyDeficit < -400) {
    reasons.push('Calorie deficit detected → lower intensity today to preserve muscle 🎯');
  } else if (avgDailyDeficit > 300) {
    reasons.push('Calorie surplus → great day for heavy lifting 💥');
  }

  // ── Body type ────────────────────────────────────────────
  let bodyType: PlanParams['bodyType'] = 'unknown';
  // (We don't have BodyTypeResult directly, but we can infer from BMI + activity)
  if (profile.height_cm && profile.weight_kg) {
    const bmi = profile.weight_kg / Math.pow(profile.height_cm / 100, 2);
    if (bmi < 20) { bodyType = 'ectomorph'; reasons.push('Lean build → strength focus, minimal cardio 🏋️'); }
    else if (bmi > 27) { bodyType = 'endomorph'; reasons.push('Robust build → cardio + strength hybrid 🏃'); }
    else { bodyType = 'mesomorph'; reasons.push('Athletic build → balanced Push/Pull/Legs split 💪'); }
  }

  // ── Health conditions → safe tags ───────────────────────
  const conditions = (profile.health_conditions ?? []).join(' ').toLowerCase();
  let heartCondition = false;
  if (conditions.match(/knee|acl|meniscus/)) {
    tags.push('knee-friendly'); reasons.push('Knee condition → low-impact alternatives 🦵');
  }
  if (conditions.match(/back|spine|disc|lumbar/)) {
    tags.push('back-friendly'); reasons.push('Back condition → spine-safe exercises only 🛡️');
  }
  if (conditions.match(/heart|cardiac|hypertension|blood.pressure/)) {
    tags.push('heart-friendly'); heartCondition = true;
    reasons.push('Cardiovascular condition → steady-state cardio, no HIIT ❤️');
  }
  if (conditions.match(/shoulder|rotator/)) {
    tags.push('shoulder-friendly'); reasons.push('Shoulder condition → modified pressing movements 🫙');
  }
  if (conditions.match(/joint|arthritis|fibromyalgia/)) {
    tags.push('joint-friendly'); reasons.push('Joint condition → gentle, low-impact movements 🌿');
  }

  // ── Pregnancy ────────────────────────────────────────────
  const isPrenatal = profile.pregnancy_status === 'pregnant' || profile.pregnancy_status === 'trying';
  if (isPrenatal) {
    tags.push('prenatal-safe', 'no-jump');
    reasons.push('Prenatal-safe programme → gentle, approved exercises 🤰');
  }

  // ── Stress / sleep ───────────────────────────────────────
  const highStress = (profile.stress_level ?? 0) >= 4;
  const poorSleep = (profile.sleep_hours ?? 8) < 6;
  if (highStress) reasons.push('High stress → recovery and yoga sessions added 🧘');
  if (poorSleep) reasons.push('Low sleep → intensity reduced, recovery priority 😴');

  // ── Activity level ─────────────────────────────────────
  if (profile.activity_level === 'sedentary' || profile.work_type === 'desk') {
    reasons.push('Sedentary lifestyle → daily mobility + light walks added 🚶');
  }

  // ── Rest day count ───────────────────────────────────────
  let restDaysPerWeek = 2;
  if (fitnessLevel === 'beginner' || isPrenatal || highStress || poorSleep) restDaysPerWeek = 3;
  if (fitnessLevel === 'athlete' && !heartCondition) restDaysPerWeek = 1;

  // ── Primary focus ────────────────────────────────────────
  let primaryFocus: WorkoutCategory = 'strength';
  if (heartCondition || isPrenatal) primaryFocus = 'cardio';
  else if (goal === 'cut' || bodyType === 'endomorph') primaryFocus = 'hiit';
  else if (goal === 'bulk' || bodyType === 'ectomorph') primaryFocus = 'strength';
  else if (highStress) primaryFocus = 'yoga';

  return {
    fitnessLevel, bodyType, goal, calorieDeficit: avgDailyDeficit,
    activityLevel: profile.activity_level ?? 'sedentary',
    tags, isPrenatal, highStress, poorSleep, heartCondition,
    restDaysPerWeek, primaryFocus,
    reasoning: reasons.slice(0, 4).join(' • ') || 'Balanced plan tailored to your profile ✨',
  };
}

// ════════════════════════════════════════════════════════════
// Day builder
// ════════════════════════════════════════════════════════════

interface DayTheme {
  theme: string;
  emoji: string;
  categories: WorkoutCategory[];
  exerciseCount: number;
}

const WEEKLY_TEMPLATES: Record<PlanParams['fitnessLevel'], DayTheme[]> = {
  beginner: [
    { theme: 'Full Body Flow', emoji: '💫', categories: ['strength', 'mobility'], exerciseCount: 4 },
    { theme: 'Active Recovery', emoji: '🌿', categories: ['recovery', 'flexibility'], exerciseCount: 3 },
    { theme: 'Cardio & Core', emoji: '🔥', categories: ['cardio', 'strength'], exerciseCount: 4 },
    { theme: 'Rest Day', emoji: '😴', categories: [], exerciseCount: 0 },
    { theme: 'Lower Body', emoji: '🦵', categories: ['strength', 'flexibility'], exerciseCount: 4 },
    { theme: 'Upper Body', emoji: '💪', categories: ['strength'], exerciseCount: 4 },
    { theme: 'Rest Day', emoji: '😴', categories: [], exerciseCount: 0 },
  ],
  intermediate: [
    { theme: 'Push Day', emoji: '🏋️', categories: ['strength'], exerciseCount: 5 },
    { theme: 'Cardio Blast', emoji: '🔥', categories: ['cardio', 'hiit'], exerciseCount: 4 },
    { theme: 'Pull Day', emoji: '💪', categories: ['strength'], exerciseCount: 5 },
    { theme: 'Active Recovery', emoji: '🌿', categories: ['yoga', 'mobility'], exerciseCount: 4 },
    { theme: 'Legs & Glutes', emoji: '🦵', categories: ['strength'], exerciseCount: 5 },
    { theme: 'HIIT Full Body', emoji: '⚡', categories: ['hiit', 'cardio'], exerciseCount: 5 },
    { theme: 'Rest Day', emoji: '😴', categories: [], exerciseCount: 0 },
  ],
  advanced: [
    { theme: 'Push Strength', emoji: '🏋️', categories: ['strength'], exerciseCount: 6 },
    { theme: 'HIIT & Cardio', emoji: '⚡', categories: ['hiit', 'cardio'], exerciseCount: 5 },
    { theme: 'Pull & Back', emoji: '💪', categories: ['strength'], exerciseCount: 6 },
    { theme: 'Legs Power', emoji: '🦵', categories: ['strength'], exerciseCount: 6 },
    { theme: 'Core & Mobility', emoji: '🔮', categories: ['strength', 'mobility'], exerciseCount: 5 },
    { theme: 'Cardio Endurance', emoji: '🏃', categories: ['cardio'], exerciseCount: 4 },
    { theme: 'Active Recovery', emoji: '🌿', categories: ['recovery', 'yoga'], exerciseCount: 3 },
  ],
  athlete: [
    { theme: 'Max Strength', emoji: '🏋️', categories: ['strength'], exerciseCount: 7 },
    { theme: 'Explosive HIIT', emoji: '💥', categories: ['hiit'], exerciseCount: 6 },
    { theme: 'Hypertrophy Pull', emoji: '💪', categories: ['strength'], exerciseCount: 7 },
    { theme: 'Power Legs', emoji: '🦵', categories: ['strength'], exerciseCount: 6 },
    { theme: 'Conditioning', emoji: '🏃', categories: ['cardio', 'hiit'], exerciseCount: 5 },
    { theme: 'Full Body Power', emoji: '⚡', categories: ['strength', 'hiit'], exerciseCount: 6 },
    { theme: 'Active Rest', emoji: '🌿', categories: ['recovery', 'flexibility'], exerciseCount: 3 },
  ],
};

function buildDay(
  dayIndex: number,
  weekSeed: number,
  params: PlanParams
): WorkoutDay {
  const template = WEEKLY_TEMPLATES[params.fitnessLevel][dayIndex % 7];
  const dayOfWeek = dayIndex % 7; // 0=Mon offset to match ISO week

  // Force rest day
  let isRestDay = template.exerciseCount === 0;
  // Add extra rest days for recovery needs
  if (!isRestDay && dayIndex < params.restDaysPerWeek && dayIndex % 3 === 2) {
    isRestDay = true;
  }

  if (isRestDay) {
    return {
      dayOfWeek,
      isRestDay: true,
      theme: 'Rest Day',
      emoji: '😴',
      exercises: params.highStress || params.poorSleep
        ? [LIBRARY.find(e => e.id === 'breathing-meditation')!]
        : [],
      estimatedDurationMin: params.highStress ? 10 : 0,
      estimatedCaloriesBurned: params.highStress ? 15 : 0,
    };
  }

  // Difficulty selection based on calorie state and params
  let allowed: DifficultyLevel[] = ['easy', 'moderate'];
  if (params.fitnessLevel === 'advanced' || params.fitnessLevel === 'athlete') {
    allowed = ['moderate', 'hard', 'intense'];
  }
  if (params.calorieDeficit < -400 || params.poorSleep || params.heartCondition) {
    allowed = ['easy', 'moderate'];
  }
  if (params.isPrenatal) allowed = ['easy'];

  // Filter pool
  let pool = filterExercises(LIBRARY, {
    categories: template.categories.length > 0 ? template.categories : undefined,
    difficulty: allowed,
    requiredTags: params.tags.length > 0 ? params.tags : undefined,
    excludeTags: params.isPrenatal ? [] : undefined,
  });

  // For heart condition: no HIIT
  if (params.heartCondition) {
    pool = pool.filter(e => e.category !== 'hiit');
  }

  // Prenatal: only prenatal-safe
  if (params.isPrenatal) {
    pool = filterExercises(LIBRARY, {
      requiredTags: ['prenatal-safe'],
      difficulty: ['easy'],
    });
  }

  // Fallback if filtered pool is empty
  if (pool.length === 0) {
    pool = filterExercises(LIBRARY, { difficulty: ['easy'] });
  }

  const exercises = pick(pool, template.exerciseCount, weekSeed + dayIndex * 17);

  const duration = exercises.reduce((sum, e) => {
    const exerciseTime = e.durationSec ? e.durationSec / 60 : (e.sets ?? 1) * ((e.reps ?? 10) * 3) / 60;
    return sum + exerciseTime + e.restSec / 60;
  }, 0);

  const calories = exercises.reduce((sum, e) => sum + e.estimatedCaloriesBurned * (e.sets ?? 1), 0);

  return {
    dayOfWeek,
    isRestDay: false,
    theme: template.theme,
    emoji: template.emoji,
    exercises,
    estimatedDurationMin: Math.round(duration),
    estimatedCaloriesBurned: Math.round(calories),
  };
}

// ════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════

/**
 * Generate a full 7-day workout plan for the current week.
 *
 * @param profile     The user's OnboardingProfile
 * @param weeklyCalorieDeficit  Sum of (goal − eaten) over the last 7 days.
 *                              Negative = deficit, positive = surplus.
 */
export function generateWeeklyPlan(
  profile: OnboardingProfile,
  weeklyCalorieDeficit: number = 0
): WorkoutPlan {
  const params = derivePlanParams(profile, weeklyCalorieDeficit);
  const now = new Date();
  const weekStart = getWeekStart(now);
  // Seed based on user ID + week for reproducible but changing plans
  const seed = (profile.user_id?.charCodeAt(0) ?? 42) + parseInt(weekStart.replace(/-/g, ''), 10) % 9999;

  const days: WorkoutDay[] = Array.from({ length: 7 }, (_, i) =>
    buildDay(i, seed, params)
  );

  return {
    userId: profile.user_id,
    weekStartDate: weekStart,
    generatedAt: now.toISOString(),
    days,
    reasoning: params.reasoning,
  };
}

/**
 * Generate just today's workout day based on today's calorie data.
 */
export function generateDailyWorkout(
  profile: OnboardingProfile,
  todayCalorieDeficit: number = 0
): WorkoutDay {
  const plan = generateWeeklyPlan(profile, todayCalorieDeficit * 7);
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // Mon=0
  return plan.days[todayIndex];
}

/** Convenience export for the Monday-of-week helper */
export { getWeekStart };

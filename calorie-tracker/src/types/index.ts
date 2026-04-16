// ============================================================
// Calorie Tracker — Type Definitions
// ============================================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type SyncStatus = 'synced' | 'pending' | 'conflict';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Gender = 'male' | 'female' | 'other';

// ---- User Profile ----
export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  daily_calorie_goal: number;
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
  gender: Gender | null;
  activity_level: ActivityLevel | null;
  created_at: string;
  updated_at: string;
}

// ---- Food Item ----
export interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  image_url: string | null;
  barcode: string | null;
  is_verified: boolean;
  created_at: string;
}

// ---- Meal Entry ----
export interface MealEntry {
  id: string;
  user_id: string;
  food_item_id: string | null;
  food_name: string; // denormalized for offline display
  meal_type: MealType;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string; // ISO date string YYYY-MM-DD
  notes: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  // Sync metadata (local only)
  sync_status?: SyncStatus;
  local_updated_at?: string;
}

// ---- Daily Log ----
export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string; // YYYY-MM-DD
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  water_ml: number;
  created_at: string;
  updated_at: string;
}

// ---- Scan Result ----
export interface ScanResult {
  id: string;
  user_id: string;
  image_url: string;
  recognized_food: string | null;
  confidence: number | null;
  estimated_calories: number | null;
  was_accepted: boolean;
  created_at: string;
}

// ---- Food Recognition API Response ----
export interface FoodRecognitionResponse {
  food_name: string;
  confidence: number;
  calories_per_serving: number;
  serving_size: number;
  serving_unit: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  alternatives: Array<{
    food_name: string;
    confidence: number;
    calories_per_serving: number;
  }>;
}

// ---- Nutrition Summary ----
export interface NutritionSummary {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  goal: number;
  remaining: number;
  percentage: number;
}

// ---- Meal Group (for diary view) ----
export interface MealGroup {
  type: MealType;
  label: string;
  icon: string;
  entries: MealEntry[];
  totalCalories: number;
}

// ---- Weekly Stats ----
export interface WeeklyStats {
  dates: string[];
  calories: number[];
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
}

// ---- Onboarding Profile ----
export type BiologicalGender = 'male' | 'female' | 'intersex';
export type GenderIdentity =
  | 'man'
  | 'woman'
  | 'non_binary'
  | 'agender'
  | 'genderfluid'
  | 'genderqueer'
  | 'trans_man'
  | 'trans_woman'
  | 'bigender'
  | 'demiboy'
  | 'demigirl'
  | 'questioning'
  | 'prefer_not_to_say'
  | 'other';
export type WorkType = 'desk' | 'standing' | 'physical' | 'student' | 'retired' | 'other';
export type DietType = 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto' | 'paleo' | 'mediterranean' | 'other';
export type SnackingHabit = 'never' | 'sometimes' | 'often' | 'always';
export type HealthLevel = 'normal' | 'borderline' | 'high' | 'low' | 'unknown';
export type SmokingStatus = 'never' | 'former' | 'occasionally' | 'daily';
export type AlcoholFrequency = 'never' | 'rarely' | 'weekly' | 'daily';
export type StressLevel = 1 | 2 | 3 | 4 | 5;
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'other';
export type PregnancyStatus = 'not_applicable' | 'trying' | 'pregnant' | 'have_kids';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | 'athlete';

// ---- Body Type Detection ----
export type BodyType = 'ectomorph' | 'mesomorph' | 'endomorph';
export type FrameSize = 'small' | 'medium' | 'large';

export interface BodyTypeResult {
  dominant: BodyType;
  blend: string | null;          // e.g. 'Meso-Ectomorph' or null
  scores: { ecto: number; meso: number; endo: number }; // sum = 100
  estimatedBF: number | null;    // US Navy body fat %
  frameSize: FrameSize | null;   // wrist-derived
  confidence: 'low' | 'medium' | 'high'; // low = BMI only, high = circumferences
  insights: string[];            // personalised tips
}

export interface OnboardingProfile {
  id?: string;
  user_id: string;

  // Step 1: Basics
  biological_gender: BiologicalGender | null;
  gender_identity: GenderIdentity | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  nationality_or_race: string | null;
  activity_level: ActivityLevel | null;

  // Step 2: Routine
  work_type: WorkType | null;
  wake_time: string | null;       // HH:MM
  sleep_time: string | null;      // HH:MM
  commute_type: string | null;
  exercise_frequency: string | null;

  // Step 3: Diet
  diet_type: DietType | null;
  meals_per_day: number | null;
  snacking_habit: SnackingHabit | null;
  water_intake_glasses: number | null;
  food_allergies: string[];       // JSON array stored as TEXT
  cuisine_preferences: string[];  // JSON array stored as TEXT

  // Step 4: Health
  blood_sugar_level: HealthLevel | null;
  cholesterol_level: HealthLevel | null;
  health_conditions: string[];    // JSON array stored as TEXT
  medications: string | null;
  family_history: string[];       // JSON array stored as TEXT

  // Step 5: Lifestyle
  smoking_status: SmokingStatus | null;
  alcohol_frequency: AlcoholFrequency | null;
  sleep_hours: number | null;
  stress_level: StressLevel | null;
  marital_status: MaritalStatus | null;
  pregnancy_status: PregnancyStatus | null;
  num_children: number | null;
  children_notes: string | null;

  // Step 6: Thoughts
  personal_notes: string | null;

  // Step 7: Goals
  dream_weight_kg: number | null;
  dream_fitness_level: FitnessLevel | null;
  dream_food_habits: string[];    // JSON array stored as TEXT
  dream_daily_routine: string | null;
  dream_special_habits: string[]; // JSON array stored as TEXT

  // Step 8 (new): Body Measurements
  waist_cm: number | null;
  hip_cm: number | null;          // females primarily
  neck_cm: number | null;
  wrist_cm: number | null;

  created_at?: string;
  updated_at?: string;
}

// ============================================================
// Workout Types
// ============================================================

export type WorkoutCategory =
  | 'strength'
  | 'cardio'
  | 'flexibility'
  | 'hiit'
  | 'recovery'
  | 'mobility'
  | 'yoga';

export type DifficultyLevel = 'easy' | 'moderate' | 'hard' | 'intense';
export type Equipment = 'none' | 'dumbbells' | 'resistance_band' | 'gym';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'legs'
  | 'glutes'
  | 'full_body'
  | 'cardio';

export interface WorkoutExercise {
  id: string;
  name: string;
  category: WorkoutCategory;
  muscleGroups: MuscleGroup[];
  sets?: number;
  reps?: number;
  durationSec?: number;
  restSec: number;
  estimatedCaloriesBurned: number; // per set or per duration
  difficulty: DifficultyLevel;
  equipment: Equipment;
  description: string;
  modification?: string; // low-impact alternative
  tags: string[];        // e.g. ['no-jump', 'prenatal-safe', 'knee-friendly']
}

export interface WorkoutDay {
  dayOfWeek: number; // 0=Sun, 1=Mon … 6=Sat
  isRestDay: boolean;
  theme: string; // e.g. 'Upper Body Strength', 'Active Recovery'
  emoji: string;
  exercises: WorkoutExercise[];
  estimatedDurationMin: number;
  estimatedCaloriesBurned: number;
}

export interface WorkoutPlan {
  id?: string;
  userId: string;
  weekStartDate: string; // YYYY-MM-DD (Monday)
  generatedAt: string;
  days: WorkoutDay[];    // 7 entries
  reasoning: string;     // human-readable personalisation explanation
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  setsCompleted: number;
  repsPerSet?: number;
  durationSec?: number;
  wasSkipped: boolean;
  effort: 1 | 2 | 3 | 4 | 5; // perceived exertion
}

export interface WorkoutSession {
  id?: string;
  userId: string;
  planId?: string;
  dayDate: string; // YYYY-MM-DD
  startedAt: string;
  completedAt?: string;
  exerciseLogs: ExerciseLog[];
  totalCaloriesBurned: number;
  notes?: string;
}

// ============================================================
// Tutorial & Coaching Types
// ============================================================

export interface TutorialPhase {
  label: string;   // e.g. 'Starting Position'
  cue: string;     // coaching instruction
  emoji: string;   // visual marker
}

export interface ExerciseBiology {
  musclesWorked: string;
  mechanism: string;
  benefits: string;
}

export interface ExerciseTutorial {
  exerciseId: string;
  phases: TutorialPhase[];
  safetyTips: string[];
  commonMistakes: string[];
  breathingCue: string;
  coachingCues: string[];   // rotated during live exercise phase
  biology?: ExerciseBiology;
}

// ============================================================
// Reward System Types
// ============================================================

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  description: string;
  unlockedAt?: string; // ISO timestamp — undefined means locked
}

export interface UserRewards {
  userId: string;
  totalXP: number;
  level: number;
  levelName: string;
  xpToNextLevel: number;
  achievements: Achievement[];
  totalWorkoutsCompleted: number;
  totalExercisesCompleted: number;
  totalCaloriesBurned: number;
  profileHash?: string; // change-detection for plan refresh
  lastUpdated: string;
}

// ============================================================
// Body Simulation Types
// ============================================================

export type DreamBodyStyle =
  | 'lean_athletic'
  | 'muscular'
  | 'toned'
  | 'slim'
  | 'powerlifter'
  | 'swimmer'
  | 'runner'
  | 'custom';

/** Normalised 0–1 body proportion parameters used by the SVG renderer */
export interface BodySimulationParams {
  shoulderWidth: number;  // 0 = very narrow, 1 = very broad
  chestWidth: number;
  waistWidth: number;
  hipWidth: number;
  armSize: number;        // 0 = thin, 1 = very muscular
  legSize: number;
  muscleTone: number;     // 0 = no definition, 1 = very defined
  bodyFatOverlay: number; // 0 = very lean, 1 = high body fat
}

/** One phase in the transformation timeline */
export interface MilestonePhase {
  phase: number;               // 0 = current, 1–4 = milestones, 5 = dream
  label: string;               // e.g. "Current", "Month 1", "Month 3", …, "Dream"
  monthsFromNow: number;
  estimatedWeightKg: number;
  estimatedBFPercent: number;
  bodyParams: BodySimulationParams;
  dietFocus: string;           // brief diet recommendation for this phase
  workoutFocus: string;        // brief workout recommendation
  motivationalMessage: string;
  macroSplit: { protein: number; carbs: number; fat: number }; // percentages
  dailyCalories: number;
}

/** Stored body photo record */
export interface BodyPhotoRecord {
  id: string;
  userId: string;
  localUri: string;            // local file path
  dateTaken: string;           // ISO date
  phase: number;               // which milestone phase this corresponds to (-1 = ad-hoc)
  notes: string | null;
  createdAt: string;
}

/** Complete simulation result stored in DB */
export interface BodySimulationResult {
  id: string;
  userId: string;
  phases: MilestonePhase[];
  dreamBodyStyle: DreamBodyStyle | null;
  dreamBodyDescription: string | null;
  targetBFPercent: number | null;
  generatedAt: string;
}

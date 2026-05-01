import { OnboardingProfile } from '@/src/types';

/** Safely coerce a value that may be a JSON string or an array into a string[]. */
function safeArray(value: any): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export interface CalorieRecommendation {
  dailyCalories: number;
  bmr: number;
  tdee: number;
  activityMultiplier: number;
  goalAdjustmentPct: number;
  reasons: string[];
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getActivityMultiplier(profile: Partial<OnboardingProfile>): number {
  const baseByActivity: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  let multiplier = baseByActivity[profile.activity_level ?? ''] ?? 1.35;

  const workTypeBoost: Record<string, number> = {
    desk: -0.03,
    standing: 0.03,
    physical: 0.08,
    student: -0.01,
    retired: -0.02,
    other: 0,
  };

  multiplier += workTypeBoost[profile.work_type ?? ''] ?? 0;

  const exerciseBoost: Record<string, number> = {
    Never: -0.04,
    '1-2x/week': 0,
    '3-4x/week': 0.04,
    '5+/week': 0.08,
    Daily: 0.1,
  };

  multiplier += exerciseBoost[profile.exercise_frequency ?? ''] ?? 0;

  if ((profile.sleep_hours ?? 7) < 6) multiplier -= 0.03;
  if ((profile.sleep_hours ?? 7) > 8) multiplier += 0.01;
  if ((profile.stress_level ?? 3) >= 4) multiplier -= 0.03;

  return clamp(multiplier, 1.15, 2.05);
}

function getGoalAdjustment(profile: Partial<OnboardingProfile>, reasons: string[]): number {
  const currentWeight = profile.weight_kg;
  const dreamWeight = profile.dream_weight_kg;

  let adjustment = 0;

  if (typeof currentWeight === 'number' && typeof dreamWeight === 'number') {
    const delta = dreamWeight - currentWeight;

    if (delta <= -10) adjustment -= 0.22;
    else if (delta <= -5) adjustment -= 0.18;
    else if (delta <= -2) adjustment -= 0.12;
    else if (delta >= 10) adjustment += 0.15;
    else if (delta >= 5) adjustment += 0.12;
    else if (delta >= 2) adjustment += 0.08;

    if (adjustment < 0) reasons.push('Weight-loss target detected from onboarding goals.');
    if (adjustment > 0) reasons.push('Weight-gain target detected from onboarding goals.');
  }

  if (profile.dream_fitness_level === 'athlete' || profile.dream_fitness_level === 'advanced') {
    adjustment += 0.05;
    reasons.push('High performance goal increases energy target.');
  }

  if (profile.pregnancy_status === 'pregnant') {
    adjustment += 0.15;
    reasons.push('Pregnancy status increases calorie recommendation.');
  }

  if (safeArray(profile.health_conditions).some((c) => /thyroid|hypothyroid/i.test(c))) {
    adjustment -= 0.05;
    reasons.push('Metabolic health condition detected, applying conservative adjustment.');
  }

  // Dream body style adjustments (if available via extended profile fields)
  const profileAny = profile as any;
  if (profileAny.dream_body_style) {
    const styleAdjust: Record<string, number> = {
      muscular: 0.08,
      powerlifter: 0.10,
      lean_athletic: -0.03,
      swimmer: 0.02,
      runner: -0.05,
      slim: -0.08,
      toned: -0.02,
      custom: 0,
    };
    const adj = styleAdjust[profileAny.dream_body_style] ?? 0;
    if (adj !== 0) {
      adjustment += adj;
      reasons.push(`Dream body style "${profileAny.dream_body_style}" applied to calorie target.`);
    }
  }

  return clamp(adjustment, -0.3, 0.25);
}

export function calculatePersonalizedCalorieRecommendation(
  profile: Partial<OnboardingProfile>
): CalorieRecommendation {
  const reasons: string[] = [];

  const cuisinePrefs = safeArray(profile.cuisine_preferences);
  const hasFlexibleCuisinePreference = cuisinePrefs.some((pref) => /^(other|others|no preference|no preferences)$/i.test(String(pref).trim()));
  if (hasFlexibleCuisinePreference) {
    reasons.push('Flexible cuisine preference detected: recommendations may include additional cuisines while respecting diet type and allergies.');
  }

  const weight = profile.weight_kg ?? 70;
  const height = profile.height_cm ?? 170;
  const age = profile.age ?? 30;

  // Mifflin-St Jeor base constants.
  let sexFactor = -78;
  if (profile.biological_gender === 'male') sexFactor = 5;
  if (profile.biological_gender === 'female') sexFactor = -161;

  const bmr = 10 * weight + 6.25 * height - 5 * age + sexFactor;
  const activityMultiplier = getActivityMultiplier(profile);
  const tdee = bmr * activityMultiplier;
  const goalAdjustmentPct = getGoalAdjustment(profile, reasons);

  let dailyCalories = tdee * (1 + goalAdjustmentPct);

  const minCalories = profile.biological_gender === 'male' ? 1400 : 1200;
  const maxCalories = 4500;
  dailyCalories = clamp(dailyCalories, minCalories, maxCalories);
  dailyCalories = roundToNearest(dailyCalories, 25);

  if (!profile.weight_kg || !profile.height_cm || !profile.age) {
    reasons.push('Used partial fallback values because some core biometrics are missing.');
  }

  return {
    dailyCalories,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    activityMultiplier: Math.round(activityMultiplier * 1000) / 1000,
    goalAdjustmentPct,
    reasons,
  };
}

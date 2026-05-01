import { StoreProduct } from '../../components/store/products';
import { OnboardingProfile } from '@/src/types';
import { detectBodyType } from '@/src/lib/bodyTypeEngine';
import { calculatePersonalizedCalorieRecommendation } from '@/src/lib/calorieEngine';

type DailyUpdate = {
  consumedFoods: string[];
  recentWorkouts: string[];
  todayCalories?: number;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

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

function buildSignals(profile: OnboardingProfile) {
  const allergies = safeArray(profile.food_allergies).map(normalize);
  const conditions = safeArray(profile.health_conditions).map(normalize);
  const goals = [
    ...safeArray(profile.dream_food_habits),
    ...safeArray(profile.dream_special_habits),
    profile.dream_fitness_level ?? '',
    (profile as any).dream_body_style ?? '',
  ]
    .map(v => String(v))
    .map(normalize)
    .filter(Boolean);

  const dietType = normalize(profile.diet_type ?? '');
  const activity = normalize(profile.activity_level ?? '');

  const bodyType = detectBodyType(profile)?.dominant ?? null;
  const calRec = calculatePersonalizedCalorieRecommendation(profile);

  return { allergies, conditions, goals, dietType, activity, bodyType, calRec };
}

function tagScore(tags: string[], wanted: string[], weight: number) {
  const set = new Set(tags);
  return wanted.reduce((s, w) => (set.has(normalize(w)) ? s + weight : s), 0);
}

export function getPersonalizedRecommendations(
  profile: OnboardingProfile,
  daily: DailyUpdate,
  catalog: StoreProduct[]
): StoreProduct[] {
  const sig = buildSignals(profile);

  // 1) Hard filter by allergens if the product declares them.
  const filtered = catalog.filter(product => {
    const allergens = (product.nutrition?.allergens ?? []).map(normalize);
    if (allergens.length === 0) return true;
    if (sig.allergies.length === 0) return true;
    return !sig.allergies.some(a => allergens.includes(a));
  });

  // 2) Score.
  const scored = filtered.map(product => {
    const tags = (product.tags ?? []).map(normalize);
    let score = 0;

    // Goal alignment (muscle/strength/fat-loss/hydration/recovery)
    score += tagScore(tags, sig.goals, 2);

    // Diet type alignment (soft)
    if (sig.dietType === 'keto' && tags.includes('carbs')) score -= 1;
    if ((sig.dietType === 'vegan' || sig.dietType === 'vegetarian') && tags.includes('protein') && product.nutrition?.allergens?.includes('milk')) score -= 1;

    // Health conditions
    const condBlob = sig.conditions.join(' ');
    if (condBlob.includes('joint') || condBlob.includes('arthritis')) {
      if (tags.includes('recovery') || tags.includes('health') || tags.includes('joints')) score += 2;
    }
    if (condBlob.includes('heart') || condBlob.includes('hypertension')) {
      if (tags.includes('health') || tags.includes('heart')) score += 2;
    }

    // Activity/workout context
    if (sig.activity.includes('active') || sig.activity.includes('very_active')) {
      if (tags.includes('hydration') || tags.includes('recovery')) score += 1;
    }
    if (daily.recentWorkouts?.length) {
      if (tags.includes('recovery') || tags.includes('protein') || tags.includes('hydration')) score += 1;
    }

    // Body type nudges
    if (sig.bodyType === 'ectomorph' && tags.includes('energy')) score += 1;
    if (sig.bodyType === 'endomorph' && tags.includes('fiber')) score += 1;

    // Calorie state (today) if provided
    if (typeof daily.todayCalories === 'number') {
      const diff = sig.calRec.dailyCalories - daily.todayCalories;
      if (diff < -250 && tags.includes('snack')) score -= 1; // already over target
      if (diff > 250 && (tags.includes('energy') || tags.includes('protein'))) score += 1;
    }

    // Deprioritize products "already consumed" by matching tags
    const consumed = (daily.consumedFoods ?? []).map(normalize);
    if (consumed.some(c => tags.includes(c))) score -= 1;

    // Sale / New small boosts
    if (product.onSale) score += 0.3;
    if (product.isNew) score += 0.15;

    return { product, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return top items with positive score; if none, fall back to top-rated.
  const positive = scored.filter(s => s.score > 0).map(s => s.product);
  if (positive.length > 0) return positive.slice(0, 12);

  return [...filtered]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 12);
}

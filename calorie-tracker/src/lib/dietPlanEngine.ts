import { OnboardingProfile, MealType } from '@/src/types';
import { calculatePersonalizedCalorieRecommendation } from '@/src/lib/calorieEngine';

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DietPlanMeal {
  type: MealType;
  title: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  tags: string[];
}

export interface DailyDietPlan {
  date: string; // YYYY-MM-DD
  calorieTarget: number;
  macros: MacroTargets;
  meals: DietPlanMeal[];
  notes: string[];
}

export interface DailyDietContext {
  todayCalories?: number;
  todayProteinG?: number;
  todayCarbsG?: number;
  todayFatG?: number;
  recentWorkouts?: string[];
}

interface MealTemplate {
  title: string;
  description: string;
  tags: string[];
  cuisines: string[]; // canonical cuisine keys
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

function normalizeText(s: string) {
  return s.trim().toLowerCase();
}

function hasAny(haystack: string, needles: string[]) {
  const h = normalizeText(haystack);
  return needles.some(n => h.includes(normalizeText(n)));
}

function normalizeCuisineKey(value: string): string {
  const v = normalizeText(value);
  if (!v) return '';
  if (v.includes('sri lankan') || v.includes('srilankan')) return 'sri_lankan';
  if (v.includes('indian')) return 'indian';
  if (v.includes('japanese')) return 'japanese';
  if (v.includes('mediterranean')) return 'mediterranean';
  if (v.includes('middle eastern')) return 'middle_eastern';
  if (v.includes('asian')) return 'asian';
  if (v.includes('western')) return 'western';
  if (v.includes('latin')) return 'latin';
  if (v.includes('african')) return 'african';
  return v.replace(/\s+/g, '_');
}

function deriveCuisineAffinity(profile: Partial<OnboardingProfile>) {
  const pref = safeArray(profile.cuisine_preferences).map(normalizeCuisineKey).filter(Boolean);
  const nationality = normalizeText(String(profile.nationality_or_race ?? ''));
  const fromNationality: string[] = [];
  if (nationality.includes('sri lanka')) fromNationality.push('sri_lankan');
  else if (nationality.includes('india')) fromNationality.push('indian');
  else if (nationality.includes('japan')) fromNationality.push('japanese');
  else if (nationality.includes('mediterranean')) fromNationality.push('mediterranean');

  const preferred = Array.from(new Set([...pref, ...fromNationality]));
  const hasSpecificPreference = preferred.length > 0;
  const configuredRatio = typeof profile.local_cuisine_ratio === 'number'
    ? clamp(Math.round(profile.local_cuisine_ratio), 0, 100)
    : null;
  const localCuisineRatio = configuredRatio ?? (hasSpecificPreference ? 70 : 50);
  return { preferred, hasSpecificPreference, localCuisineRatio };
}

function macroSplitForProfile(profile: Partial<OnboardingProfile>): { proteinPct: number; carbsPct: number; fatPct: number; notes: string[] } {
  const notes: string[] = [];

  // Default (balanced, sustainable)
  let proteinPct = 30;
  let carbsPct = 40;
  let fatPct = 30;

  const diet = profile.diet_type ?? 'omnivore';
  if (diet === 'keto') {
    proteinPct = 30; carbsPct = 10; fatPct = 60;
    notes.push('Keto preference detected: low carb, higher fat macro split.');
  } else if (diet === 'paleo') {
    proteinPct = 30; carbsPct = 35; fatPct = 35;
    notes.push('Paleo preference detected: whole-food bias in the plan.');
  } else if (diet === 'vegan' || diet === 'vegetarian') {
    proteinPct = 28; carbsPct = 45; fatPct = 27;
    notes.push('Plant-based preference detected: higher carbs with protein emphasis.');
  } else if (diet === 'mediterranean') {
    proteinPct = 28; carbsPct = 42; fatPct = 30;
    notes.push('Mediterranean preference detected: balanced macros with healthy fats.');
  }

  // Goal nudges (weight delta)
  const w = profile.weight_kg ?? null;
  const dw = profile.dream_weight_kg ?? null;
  if (typeof w === 'number' && typeof dw === 'number') {
    if (dw < w - 2) {
      proteinPct = clamp(proteinPct + 5, 25, 40);
      carbsPct = clamp(carbsPct - 3, 10, 55);
      fatPct = clamp(100 - proteinPct - carbsPct, 15, 45);
      notes.push('Weight-loss target detected: higher protein to protect muscle.');
    } else if (dw > w + 2) {
      carbsPct = clamp(carbsPct + 5, 20, 60);
      proteinPct = clamp(proteinPct + 2, 25, 40);
      fatPct = clamp(100 - proteinPct - carbsPct, 15, 40);
      notes.push('Weight-gain target detected: higher carbs to support training volume.');
    }
  }

  return { proteinPct, carbsPct, fatPct, notes };
}

function applyHealthRiskAdjustments(
  profile: Partial<OnboardingProfile>,
  split: { proteinPct: number; carbsPct: number; fatPct: number; notes: string[] }
) {
  const conditions = safeArray(profile.health_conditions).map(normalizeText);
  const familyHistory = safeArray(profile.family_history).map(normalizeText);
  const bloodSugar = normalizeText(String(profile.blood_sugar_level ?? ''));
  const cholesterol = normalizeText(String(profile.cholesterol_level ?? ''));

  const hasDiabetesRisk =
    bloodSugar === 'high' ||
    conditions.some(c => c.includes('diabet')) ||
    familyHistory.some(c => c.includes('diabet'));

  const hasCardioRisk =
    cholesterol === 'high' ||
    conditions.some(c => c.includes('heart') || c.includes('hypertension') || c.includes('pressure')) ||
    familyHistory.some(c => c.includes('heart') || c.includes('hypertension') || c.includes('stroke'));

  if (hasDiabetesRisk) {
    split.carbsPct = clamp(split.carbsPct - 6, 20, 50);
    split.proteinPct = clamp(split.proteinPct + 4, 25, 42);
    split.fatPct = clamp(100 - split.proteinPct - split.carbsPct, 20, 40);
    split.notes.push('Blood sugar risk-aware adjustment: lower glycemic carbs and higher protein.');
  }

  if (hasCardioRisk) {
    split.fatPct = clamp(split.fatPct - 4, 20, 35);
    split.carbsPct = clamp(split.carbsPct + 2, 20, 55);
    split.proteinPct = clamp(100 - split.carbsPct - split.fatPct, 22, 40);
    split.notes.push('Cardiovascular risk-aware adjustment: reduced saturated-fat load and fiber-forward meals.');
  }
}

function toMacros(calories: number, proteinPct: number, carbsPct: number, fatPct: number): MacroTargets {
  const proteinCalories = calories * (proteinPct / 100);
  const carbsCalories = calories * (carbsPct / 100);
  const fatCalories = calories * (fatPct / 100);
  return {
    calories,
    protein_g: Math.round(proteinCalories / 4),
    carbs_g: Math.round(carbsCalories / 4),
    fat_g: Math.round(fatCalories / 9),
  };
}

function mealDistribution(profile: Partial<OnboardingProfile>): Record<MealType, number> {
  // Percent of daily calories per meal.
  const mealsPerDay = profile.meals_per_day ?? 3;
  if (mealsPerDay >= 5) return { breakfast: 0.22, lunch: 0.28, dinner: 0.28, snack: 0.22 };
  if (mealsPerDay === 4) return { breakfast: 0.25, lunch: 0.30, dinner: 0.30, snack: 0.15 };
  return { breakfast: 0.28, lunch: 0.36, dinner: 0.32, snack: 0.04 };
}

function buildMealTemplates(profile: Partial<OnboardingProfile>): Record<MealType, MealTemplate[]> {
  const allergies = safeArray(profile.food_allergies).map(normalizeText);
  const diet = profile.diet_type ?? 'omnivore';
  const cuisineAffinity = deriveCuisineAffinity(profile);

  const avoid: string[] = [];
  if (allergies.some(a => a.includes('nuts') || a.includes('almond') || a.includes('peanut'))) avoid.push('nuts');
  if (allergies.some(a => a.includes('milk') || a.includes('dairy') || a.includes('lactose'))) avoid.push('dairy');
  if (allergies.some(a => a.includes('fish') || a.includes('seafood') || a.includes('shellfish'))) avoid.push('seafood');
  if (allergies.some(a => a.includes('gluten') || a.includes('wheat'))) avoid.push('gluten');
  if (diet === 'vegan') { avoid.push('meat', 'dairy', 'egg'); }
  if (diet === 'vegetarian') { avoid.push('meat'); }

  const sriLankanPreferred = cuisineAffinity.preferred.includes('sri_lankan');

  const healthConditions = safeArray(profile.health_conditions).map(normalizeText).join(' ');
  const bloodSugar = normalizeText(String(profile.blood_sugar_level ?? ''));
  const cholesterol = normalizeText(String(profile.cholesterol_level ?? ''));
  const diabetesFriendly = bloodSugar === 'high' || healthConditions.includes('diabet');
  const cardioFriendly = cholesterol === 'high' || healthConditions.includes('heart') || healthConditions.includes('hypertension');

  const breakfast: MealTemplate[] = [
    { title: 'Protein Oats Bowl', description: 'Oats + milk/alt milk + banana + cinnamon + (optional) whey/plant protein.', tags: ['breakfast', 'high-protein', 'high-fiber'], cuisines: ['western'] },
    { title: 'Eggs + Wholegrain Toast', description: '2–3 eggs + toast + veggies. Add fruit on the side.', tags: ['breakfast', 'high-protein'], cuisines: ['western'] },
    { title: 'Greek Yogurt Parfait', description: 'Yogurt + berries + granola. Swap to soy/coconut yogurt if needed.', tags: ['breakfast', 'probiotic'], cuisines: ['western'] },
    { title: 'Savory Lentil Pancakes', description: 'Lentil-based pancakes with tomato chutney and greens.', tags: ['breakfast', 'plant-based', 'high-fiber'], cuisines: ['indian', 'sri_lankan'] },
    { title: 'Chia Overnight Jar', description: 'Chia + oats + berries + seeds for slow-release energy.', tags: ['breakfast', 'high-fiber', 'heart-friendly'], cuisines: ['western', 'mediterranean'] },
    { title: 'Kiribath + Lunu Miris + Egg', description: 'Portion-controlled milk rice with sambol and protein side.', tags: ['breakfast', 'sri-lankan', 'high-protein'], cuisines: ['sri_lankan'] },
    { title: 'String Hoppers + Dhal Curry', description: 'Whole-grain style string hoppers with lentil curry and greens.', tags: ['breakfast', 'sri-lankan', 'high-fiber'], cuisines: ['sri_lankan'] },
  ];

  const lunch: MealTemplate[] = [
    { title: sriLankanPreferred ? 'Red Rice + Chicken + Gotukola Sambol' : 'Lean Protein + Rice + Salad', description: 'Balanced plate: protein + complex carbs + big veggies.', tags: ['lunch', 'balanced'], cuisines: sriLankanPreferred ? ['sri_lankan'] : ['western'] },
    { title: 'Tuna/Chickpea Salad Wrap', description: 'Wrap with high-protein filling + crunchy veggies.', tags: ['lunch', 'portable'], cuisines: ['western'] },
    { title: 'Lentil Bowl', description: 'Lentils + roasted veg + olive oil dressing (plant-based friendly).', tags: ['lunch', 'plant-based', 'high-fiber'], cuisines: ['mediterranean', 'asian'] },
    { title: 'Grilled Fish Grain Bowl', description: 'Fish/tofu + brown rice + cucumber + yogurt-herb dressing.', tags: ['lunch', 'heart-friendly', 'high-protein'], cuisines: ['mediterranean', 'asian'] },
    { title: 'Bean & Veg Curry Plate', description: 'Mixed beans curry + red rice + sauteed greens.', tags: ['lunch', 'high-fiber', 'diabetes-friendly'], cuisines: ['sri_lankan', 'indian'] },
    { title: 'Brown Rice + Fish Ambul Thiyal + Mallung', description: 'Traditional Sri Lankan balanced plate with high-fiber greens.', tags: ['lunch', 'sri-lankan', 'recovery'], cuisines: ['sri_lankan'] },
    { title: 'Polos Curry + Red Rice + Cucumber Salad', description: 'Young jackfruit curry with fiber-rich sides.', tags: ['lunch', 'sri-lankan', 'high-fiber', 'plant-based'], cuisines: ['sri_lankan'] },
  ];

  const dinner: MealTemplate[] = [
    { title: 'Protein + Veg + Carbs', description: 'Chicken/fish/tofu + veggies + potatoes/rice. Keep it simple.', tags: ['dinner', 'balanced'], cuisines: ['western'] },
    { title: sriLankanPreferred ? 'Red Rice + Fish Curry + Greens' : 'Salmon + Veg + Quinoa', description: 'Omega-3 rich option; swap to legumes if vegetarian.', tags: ['dinner', 'recovery'], cuisines: sriLankanPreferred ? ['sri_lankan'] : ['mediterranean'] },
    { title: 'Stir-fry Bowl', description: 'High-veg stir-fry + protein + rice/noodles.', tags: ['dinner', 'high-micronutrient'], cuisines: ['asian'] },
    { title: 'Baked Chicken/Tofu Tray', description: 'One-tray protein + pumpkin + broccoli + herbs.', tags: ['dinner', 'simple', 'high-protein'], cuisines: ['western'] },
    { title: 'Soup + Side Plate', description: 'Vegetable-protein soup with a side of wholegrain and salad.', tags: ['dinner', 'high-fiber', 'heart-friendly'], cuisines: ['mediterranean'] },
    { title: 'Kottu-Style Veg + Egg (Light Oil)', description: 'Balanced homemade kottu variation with vegetables and controlled oil.', tags: ['dinner', 'sri-lankan', 'creative'], cuisines: ['sri_lankan'] },
    { title: 'Parippu + Stir-fried Greens + Red Rice', description: 'Classic high-fiber Sri Lankan vegetarian dinner.', tags: ['dinner', 'sri-lankan', 'diabetes-friendly', 'high-fiber'], cuisines: ['sri_lankan'] },
  ];

  const snack: MealTemplate[] = [
    { title: 'Fruit + Protein', description: 'Fruit + yogurt/soy yogurt or a protein shake.', tags: ['snack', 'high-protein'], cuisines: ['western'] },
    { title: 'Hydration + Electrolytes', description: 'If you trained today or sweat a lot, add electrolytes.', tags: ['snack', 'hydration'], cuisines: ['global'] },
    { title: 'Nuts/Seeds Mix', description: 'Small handful (skip if nut allergy).', tags: ['snack', 'healthy-fats'], cuisines: ['global'] },
    { title: 'Roasted Chickpea Crunch', description: 'Spiced roasted chickpeas for high-fiber snacking.', tags: ['snack', 'high-fiber', 'diabetes-friendly'], cuisines: ['indian', 'sri_lankan'] },
    { title: 'Cucumber + Hummus Cup', description: 'Hydrating and light with good satiety.', tags: ['snack', 'heart-friendly'], cuisines: ['mediterranean'] },
    { title: 'Boiled Chickpeas + Coconut + Lime', description: 'Light Sri Lankan-style legume snack.', tags: ['snack', 'sri-lankan', 'high-fiber'], cuisines: ['sri_lankan'] },
  ];

  const filterOut = (items: MealTemplate[]) =>
    items.filter(i => {
      const blob = `${i.title} ${i.description}`.toLowerCase();
      if (avoid.includes('nuts') && hasAny(blob, ['nut', 'almond', 'peanut'])) return false;
      if (avoid.includes('dairy') && hasAny(blob, ['milk', 'yogurt', 'whey', 'cheese'])) return false;
      if (avoid.includes('meat') && hasAny(blob, ['chicken', 'fish', 'tuna', 'salmon', 'meat'])) return false;
      if (avoid.includes('egg') && hasAny(blob, ['egg'])) return false;
      if (avoid.includes('seafood') && hasAny(blob, ['fish', 'tuna', 'salmon', 'prawn', 'shrimp', 'seafood'])) return false;
      if (avoid.includes('gluten') && hasAny(blob, ['wheat', 'bread', 'noodle', 'kottu'])) return false;
      return true;
    });

  const base = {
    breakfast: filterOut(breakfast),
    lunch: filterOut(lunch),
    dinner: filterOut(dinner),
    snack: filterOut(snack),
  };

  // Risk-aware narrowing (still keeps variety).
  const maybeFilterByTag = (
    list: MealTemplate[],
    tag: string
  ) => {
    const tagged = list.filter(i => i.tags.includes(tag));
    return tagged.length >= 2 ? tagged : list;
  };

  if (diabetesFriendly) {
    base.breakfast = maybeFilterByTag(base.breakfast, 'high-fiber');
    base.lunch = maybeFilterByTag(base.lunch, 'diabetes-friendly');
    base.snack = maybeFilterByTag(base.snack, 'diabetes-friendly');
  }
  if (cardioFriendly) {
    base.breakfast = maybeFilterByTag(base.breakfast, 'heart-friendly');
    base.lunch = maybeFilterByTag(base.lunch, 'heart-friendly');
    base.dinner = maybeFilterByTag(base.dinner, 'heart-friendly');
  }

  return base;
}

function scoreCuisineFit(
  template: MealTemplate,
  preferredCuisineKeys: string[],
  localCuisineRatio: number
) {
  if (preferredCuisineKeys.length === 0) return 0;
  const t = new Set(template.cuisines.map(normalizeCuisineKey));
  const localWeight = clamp(localCuisineRatio / 70, 0, 1.6);
  const globalWeight = clamp((100 - localCuisineRatio) / 35, 0, 1.6);
  let score = 0;
  let hasPreferredMatch = false;
  for (const c of preferredCuisineKeys) {
    if (t.has(c)) {
      hasPreferredMatch = true;
      score += (c === 'sri_lankan' ? 5 : 3) * localWeight;
    }
  }
  // When user requests more global variety, reward safe non-local options too.
  if (!hasPreferredMatch) score += globalWeight;
  return score;
}

function pickTemplate(
  list: MealTemplate[],
  seed: number,
  preferredCuisineKeys: string[],
  localCuisineRatio: number,
  usedTitles: Set<string>
) {
  if (list.length === 0) {
    return { title: 'Balanced Meal', description: 'Protein + carbs + vegetables.', tags: ['balanced'], cuisines: ['global'] };
  }

  const scored = list.map((item, idx) => {
    const cuisineScore = scoreCuisineFit(item, preferredCuisineKeys, localCuisineRatio);
    const diversityPenalty = usedTitles.has(item.title) ? 4 : 0;
    // deterministic tiny jitter avoids always selecting first in ties
    const jitter = ((seed + idx * 31) % 100) / 1000;
    return { item, score: cuisineScore - diversityPenalty + jitter };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored[0].item;
  usedTitles.add(selected.title);
  return selected;
}

export function generateDailyDietPlan(
  profile: OnboardingProfile,
  date: string = new Date().toISOString().split('T')[0],
  context: DailyDietContext = {}
): DailyDietPlan {
  const rec = calculatePersonalizedCalorieRecommendation(profile);
  const split = macroSplitForProfile(profile);
  applyHealthRiskAdjustments(profile, split);
  const macros = toMacros(rec.dailyCalories, split.proteinPct, split.carbsPct, split.fatPct);
  const dist = mealDistribution(profile);
  const templates = buildMealTemplates(profile);
  const cuisineAffinity = deriveCuisineAffinity(profile);
  const usedTitles = new Set<string>();

  const makeMeal = (type: MealType, seed: number): DietPlanMeal => {
    const cal = Math.round(macros.calories * dist[type]);
    const p = Math.round(macros.protein_g * dist[type]);
    const c = Math.round(macros.carbs_g * dist[type]);
    const f = Math.round(macros.fat_g * dist[type]);
    const t = pickTemplate(
      templates[type],
      seed,
      cuisineAffinity.preferred,
      cuisineAffinity.localCuisineRatio,
      usedTitles
    );
    return {
      type,
      title: t.title,
      description: t.description,
      calories: cal,
      protein_g: p,
      carbs_g: c,
      fat_g: f,
      tags: t.tags,
    };
  };

  // Stable daily seed so plan is reproducible for that date & user.
  const seedBase = (profile.user_id?.charCodeAt(0) ?? 17) + parseInt(date.replace(/-/g, ''), 10) % 997;

  const notes: string[] = [
    ...split.notes,
    ...rec.reasons.slice(0, 2),
  ];

  const todayCalories = context.todayCalories ?? 0;
  if (todayCalories > 0) {
    const delta = macros.calories - todayCalories;
    if (delta > 250) notes.push('Today you are below target calories; add nutrient-dense meals in later slots.');
    if (delta < -250) notes.push('Today you are above target calories; prioritize lighter, fiber-rich options now.');
  }
  if ((context.recentWorkouts ?? []).length > 0) {
    notes.push('Recent workouts detected: recovery-friendly protein and hydration are prioritized.');
  }
  if (cuisineAffinity.preferred.includes('sri_lankan')) {
    notes.push('Sri Lankan cuisine prioritization is active for your daily plan.');
  }
  if (cuisineAffinity.hasSpecificPreference) {
    notes.push(`Cuisine mix setting: ${cuisineAffinity.localCuisineRatio}% local and ${100 - cuisineAffinity.localCuisineRatio}% global variety.`);
  }

  // Hydration advice from profile
  const water = profile.water_intake_glasses ?? null;
  if (typeof water === 'number' && water < 6) {
    notes.push('Hydration seems low — aim for 6–10 glasses water today.');
  }
  if ((profile.stress_level ?? 0) >= 4) notes.push('High stress: prioritize simple meals + consistent meal timing.');
  if ((profile.sleep_hours ?? 8) < 6) notes.push('Low sleep: reduce ultra-processed foods and focus on protein + fiber.');

  return {
    date,
    calorieTarget: macros.calories,
    macros,
    meals: [
      makeMeal('breakfast', seedBase + 1),
      makeMeal('lunch', seedBase + 3),
      makeMeal('dinner', seedBase + 5),
      makeMeal('snack', seedBase + 7),
    ],
    notes,
  };
}


/**
 * Matches AI diet-plan slots to FitStore delivery SKUs (Healthy Meals partner kitchens).
 */

import type { DietPlanMeal } from '@/src/lib/dietPlanEngine';
import type { StoreProduct } from '@/components/store/products';

export const FITSTORE_RESTAURANT_LABEL = 'Fitstore Restaurant';

const PARTNER_ETA: Record<string, string> = {
  'Green Fork Kitchen': '20–35 min',
  'Ceylon Balance': '25–40 min',
  'Metro Protein Bar': '30–45 min',
  'Plant & Flow': '20–30 min',
  'Sunrise Deli': '15–28 min',
  'Spice Route Lean': '22–38 min',
  'Fresh Stack': '18–32 min',
  'Pacific Lean Co': '28–42 min',
};

export function partnerDeliveryEta(partnerName: string | undefined): string {
  const n = partnerName?.trim();
  if (!n) return '25–40 min';
  return PARTNER_ETA[n] ?? '25–40 min';
}

/** Strong title/description cues → meal SKU ids (prioritized). */
const MEAL_RULES: { re: RegExp; id: string; weight: number }[] = [
  { re: /parfait|greek\s*yogurt|yogurt.*berries|chia.*overnight/i, id: 'p035', weight: 110 },
  { re: /lentil|dhal|dahl|sambar|parippu|bean\s*&\s*veg|grain\s*&\s*bean/i, id: 'p034', weight: 105 },
  { re: /polos|young\s*jackfruit|jackfruit\s*curry/i, id: 'p030', weight: 100 },
  {
    re: /fish\s*curry|grilled\s*fish|ambul|Sri\s*Lankan\s*fish|fish.*rice|coconut\s*milk\s*fish/i,
    id: 'p030',
    weight: 95,
  },
  { re: /salmon|omega|quinoa\s*veg|\bpoke\b/i, id: 'p036', weight: 105 },
  { re: /stir.?fry|noodle|kottu|high.?veg\s*stir/i, id: 'p031', weight: 90 },
  { re: /chicken\s*curry|chicken\s*rice|macro\s*bowl|protein\s*\+\s*rice/i, id: 'p029', weight: 95 },
  { re: /beef|steakhouse|metro/i, id: 'p031', weight: 85 },
  { re: /tofu|vegan\s*prep|veg\s*&\s*legume/i, id: 'p032', weight: 90 },
  {
    re: /egg\b|english\s*muffin|breakfast\s*wrap|savory\s*lentil\s*pancake|string\s*hoppers|dosa\b|kiribath/i,
    id: 'p033',
    weight: 88,
  },
  { re: /baked\s*chicken|tray|soup\b/i, id: 'p029', weight: 70 },
  {
    re: /protein\s*oats|overnight\s*oats|^oats\b/i,
    id: 'p035',
    weight: 75,
  },
];

const MEAL_SLOT_WEIGHT: Partial<Record<DietPlanMeal['type'], Record<string, number>>> = {
  breakfast: {
    p033: 12,
    p035: 12,
    p034: 4,
    p029: 4,
  },
  lunch: {
    p029: 14,
    p030: 14,
    p034: 14,
    p032: 8,
    p036: 6,
    p031: 6,
  },
  dinner: {
    p036: 14,
    p031: 12,
    p029: 10,
    p034: 10,
    p032: 8,
    p030: 8,
    p035: -4,
    p033: -4,
  },
  snack: {
    p035: 8,
    p032: 8,
    p033: 6,
    p034: -2,
    p036: -2,
    p031: -4,
  },
};

function skuCalorie(p: StoreProduct): number {
  const c = p.nutrition?.calories;
  return typeof c === 'number' && c > 0 ? c : 500;
}

/**
 * Hydration-centric snacks map to electrolyte SKU; others map to the closest Healthy Meal.
 */
export function suggestFitstoreProductForMeal(
  meal: DietPlanMeal,
  catalog: StoreProduct[],
): { primary: StoreProduct | null; isDrinkAddon: boolean; hint?: string } {
  const haystack = `${meal.title} ${meal.description} ${meal.tags.join(' ')}`.toLowerCase();

  if (meal.type === 'snack' && /hydration|electrolyte|sweat|trained\s*today/i.test(haystack)) {
    const drink = catalog.find(p => p.id === 'p004');
    return {
      primary: drink ?? null,
      isDrinkAddon: true,
      hint: drink
        ? 'Matches your hydration snack slot — delivered cold with FitStore groceries.'
        : undefined,
    };
  }

  const healthyMeals = catalog.filter(p => p.category === 'Healthy Meals');
  if (healthyMeals.length === 0) return { primary: null, isDrinkAddon: false };

  const weights: Record<string, number> = {};
  for (const rule of MEAL_RULES) {
    if (rule.re.test(haystack)) weights[rule.id] = (weights[rule.id] ?? 0) + rule.weight;
  }

  const slotNudge = MEAL_SLOT_WEIGHT[meal.type] ?? {};
  for (const p of healthyMeals) {
    const nudge = slotNudge[p.id] ?? 0;
    if (nudge !== 0) weights[p.id] = (weights[p.id] ?? 0) + nudge;
  }

  const targetCal = meal.calories;
  let best: StoreProduct = healthyMeals[0];
  let bestScore = -Infinity;

  for (const p of healthyMeals) {
    const rulePart = weights[p.id] ?? 0;
    const calPenalty = Math.min(80, Math.abs(skuCalorie(p) - targetCal) / 8);
    const score = rulePart - calPenalty + (p.rating ?? 4.4) * 2;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  if (Object.values(weights).every(w => !w || w <= 0)) {
    healthyMeals.sort(
      (a, b) => Math.abs(skuCalorie(a) - targetCal) - Math.abs(skuCalorie(b) - targetCal),
    );
    best = healthyMeals[0];
  }

  return {
    primary: best,
    isDrinkAddon: false,
    hint:
      skuCalorie(best) > targetCal + 140
        ? 'Portion size may be larger than your plan slot — consider saving half for later.'
        : skuCalorie(best) < targetCal - 140
          ? 'Add a side salad or fruit from FitStore to bump calories closer to plan.'
          : undefined,
  };
}

export interface FitstoreDietSuggestion {
  meal: DietPlanMeal;
  product: StoreProduct;
  eta: string;
  isDrinkAddon: boolean;
  hint?: string;
}

/** One delivered SKU suggestion per planned meal (breakfast → snack order). */
export function buildFitstoreSuggestionsForPlan(
  meals: DietPlanMeal[],
  catalog: StoreProduct[],
): FitstoreDietSuggestion[] {
  const out: FitstoreDietSuggestion[] = [];
  const order: DietPlanMeal['type'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const sorted = [...meals].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  for (const meal of sorted) {
    const { primary, hint, isDrinkAddon } = suggestFitstoreProductForMeal(meal, catalog);
    if (!primary) continue;
    out.push({
      meal,
      product: primary,
      eta: isDrinkAddon ? 'Same-day delivery slots' : partnerDeliveryEta(primary.partnerName),
      isDrinkAddon,
      hint,
    });
  }
  return out;
}

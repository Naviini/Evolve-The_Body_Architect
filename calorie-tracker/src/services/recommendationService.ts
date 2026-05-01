// Recommendation logic for the store, based on user profile and daily updates
// This is a placeholder for the real logic, which should use onboarding and daily data

import { StoreProduct, products } from '../../components/store/products';

interface UserProfile {
  deficiencies: string[];
  allergies: string[];
  goals: string[];
}

interface DailyUpdate {
  consumedFoods: string[];
  recentWorkouts: string[];
}

export function getPersonalizedRecommendations(
  user: UserProfile,
  daily: DailyUpdate
): StoreProduct[] {
  // Exclude products with allergens
  const filtered = products.filter(product => {
    if (product.nutrition?.allergens) {
      if (user.allergies.some(allergy => product.nutrition!.allergens!.includes(allergy))) {
        return false;
      }
    }
    return true;
  });

  // Score products based on deficiencies and goals
  const scored = filtered.map(product => {
    let score = 0;
    if (user.deficiencies && product.tags) {
      score += user.deficiencies.filter(def => product.tags!.includes(def)).length * 2;
    }
    if (user.goals && product.tags) {
      score += user.goals.filter(goal => product.tags!.includes(goal)).length * 2;
    }
    // Optionally, deprioritize products already consumed today
    if (daily.consumedFoods && product.tags) {
      if (daily.consumedFoods.some(food => product.tags!.includes(food))) {
        score -= 1;
      }
    }
    return { ...product, _score: score };
  });

  // Sort by score descending, then by name
  scored.sort((a, b) => b._score - a._score || a.name.localeCompare(b.name));
  // Only return products with score > 0 as recommendations
  return scored.filter(p => p._score > 0);
}

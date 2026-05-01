// This file contains the initial product data for the store.
// In a real app, this would come from a backend or database.

export interface StoreProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  image?: string;
  tags?: string[];
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    allergens?: string[];
  };
}

export const products: StoreProduct[] = [
  {
    id: '1',
    name: 'Protein Powder',
    category: 'Supplements',
    price: 29.99,
    description: 'Whey protein for muscle recovery.',
    tags: ['protein', 'muscle', 'supplement'],
    nutrition: { protein: 24, allergens: ['milk'] },
  },
  {
    id: '2',
    name: 'Yoga Mat',
    category: 'Workout Gear',
    price: 19.99,
    description: 'Non-slip mat for yoga and stretching.',
    tags: ['yoga', 'gear'],
  },
  {
    id: '3',
    name: 'Almond Butter',
    category: 'Healthy Food',
    price: 9.99,
    description: 'Natural almond butter, no added sugar.',
    tags: ['almond', 'healthy', 'food'],
    nutrition: { protein: 7, fat: 16, allergens: ['nuts'] },
  },
];

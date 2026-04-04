/**
 * Calorie Tracker — Premium Design System
 * Modern, vibrant color palette with glassmorphism-inspired design
 */

import { Platform } from 'react-native';

// ============================================================
// Color Palette
// ============================================================
export const Colors = {
  // Primary gradient pair
  primary: '#6C63FF',
  primaryLight: '#8B83FF',
  primaryDark: '#4A42DB',

  // Accent / Success / Warning / Error
  accent: '#00D2FF',
  success: '#00E676',
  warning: '#FFB74D',
  error: '#FF5252',

  // Meal type colors
  breakfast: '#FF9F43',
  lunch: '#00D2FF',
  dinner: '#6C63FF',
  snack: '#FF6B81',

  // Macro colors
  protein: '#FF6B81',
  carbs: '#FFD93D',
  fat: '#6C63FF',

  // Neutrals (Dark theme focused)
  dark: {
    background: '#0A0A1A',
    surface: '#13132B',
    surfaceLight: '#1E1E3F',
    card: '#1A1A35',
    cardElevated: '#222250',
    border: '#2A2A55',
    text: '#FFFFFF',
    textSecondary: '#A0A0C0',
    textTertiary: '#6B6B8D',
    tabBar: '#0F0F25',
    overlay: 'rgba(10, 10, 26, 0.85)',
  },

  light: {
    background: '#F5F5FF',
    surface: '#FFFFFF',
    surfaceLight: '#F0F0FF',
    card: '#FFFFFF',
    cardElevated: '#F5F5FF',
    border: '#E0E0F0',
    text: '#1A1A2E',
    textSecondary: '#6B6B8D',
    textTertiary: '#A0A0C0',
    tabBar: '#FFFFFF',
    overlay: 'rgba(245, 245, 255, 0.85)',
  },

  // Gradients (used as array for LinearGradient)
  gradients: {
    primary: ['#6C63FF', '#00D2FF'] as const,
    warm: ['#FF6B6B', '#FFD93D'] as const,
    cool: ['#6C63FF', '#8B83FF'] as const,
    dark: ['#13132B', '#0A0A1A'] as const,
    card: ['rgba(30, 30, 63, 0.8)', 'rgba(26, 26, 53, 0.6)'] as const,
    success: ['#00E676', '#00D2FF'] as const,
  },
};

// ============================================================
// Spacing
// ============================================================
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// ============================================================
// Border Radius
// ============================================================
export const BorderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  round: 9999,
} as const;

// ============================================================
// Typography
// ============================================================
export const Typography = {
  // Font families
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    web: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    default: 'System',
  }),

  // Sizes
  sizes: {
    caption: 12,
    body: 14,
    bodyLarge: 16,
    subtitle: 18,
    title: 22,
    heading: 28,
    hero: 36,
    display: 48,
  },

  // Weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

// ============================================================
// Shadows
// ============================================================
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
};

// ============================================================
// Animation Config
// ============================================================
export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
};

// ============================================================
// Icon mapping for meal types
// ============================================================
export const MealIcons: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍿',
};

export const MealLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

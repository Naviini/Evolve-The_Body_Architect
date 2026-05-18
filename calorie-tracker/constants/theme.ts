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
    background: '#09091A',
    surface: '#12122A',
    surfaceLight: '#1A1B36',
    card: '#181934',
    cardElevated: '#202045',
    border: '#303054',
    text: '#FFFFFF',
    textSecondary: '#A0A0C0',
    textTertiary: '#6B6B8D',
    tabBar: '#0E0E22',
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
    /** Modal / CTA accent — violet → cyan (matches Cloud Refresh-style dialogs) */
    alertPrimary: ['#7B61FF', '#00D1FF'] as const,
    warm: ['#FF6B6B', '#FFD93D'] as const,
    cool: ['#6C63FF', '#8B83FF'] as const,
    dark: ['#13132B', '#0A0A1A'] as const,
    card: ['rgba(30, 30, 63, 0.8)', 'rgba(26, 26, 53, 0.6)'] as const,
    success: ['#00E676', '#00D2FF'] as const,
    /** Home meal rows — muted (low-chroma) variants of warm / sage / dusk / lavender */
    mealBreakfast: ['#4f4542', '#5d534e'] as const,
    mealLunch: ['#3e4a48', '#4b5956'] as const,
    mealDinner: ['#3d3a4f', '#494564'] as const,
    mealSnack: ['#454051', '#524c60'] as const,
    /** Body journey — deep indigo / primary-adjacent → steel blue (matches app violet–cyan theme) */
    bodyTransform: ['#252447', '#1a3352', '#141c34'] as const,
    /** Transformation compare orb — muted primary → accent */
    journeyBridge: ['#5b52b8', '#2a9cbd'] as const,
    /** Vertical hairline behind orb — transparent primary ↔ accent */
    journeyBridgeHairline: ['rgba(108,99,255,0)', 'rgba(0,210,255,0.36)', 'rgba(108,99,255,0)'] as const,
  },

  /** Transformation preview — cool blue-gray panels; mint green only on goal silhouette + goal copy */
  journeyDreamAccent: '#72d8ac',
  /** Unused accent wash — neutral (green only on goal silhouette + text via journeyDreamAccent) */
  journeyDreamGlow: 'rgba(108, 140, 210, 0.08)',
  /** Goal panel chrome matches “Now” — no green fill */
  journeyGoalPanel: 'rgba(108, 140, 210, 0.07)',
  journeyGlassFill: 'rgba(255,255,255,0.055)',
  journeyGlassBorder: 'rgba(255,255,255,0.11)',
  journeyNowAccent: '#94a8c4',
  journeyNowPanel: 'rgba(108, 140, 210, 0.07)',
  journeyLinkChevron: '#9eb8e8',
  /** Outer card rim — very light tint; applies only around Body Transformation on Home */
  journeyTransformCardBorder: 'rgba(120, 188, 224, 0.10)',
  journeyPanelBorderNow: 'rgba(130, 158, 205, 0.38)',
  journeyPanelBorderGoal: 'rgba(130, 158, 205, 0.38)',
  journeyDeltaChipBg: 'rgba(72, 88, 132, 0.42)',
  journeyDeltaChipBorder: 'rgba(148, 158, 198, 0.18)',
  mealPromoChevron: {
    breakfast: '#8f8078',
    lunch: '#7f928c',
    dinner: '#918daa',
    snack: '#9d96ae',
  } as const,
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

/** Tab/stack screens: horizontal gutter; header rhythm uses Spacing.lg; clearance above bottom nav + home indicator. */
export const TAB_SCROLL_GUTTER = Spacing.md;
export const TAB_SCROLL_BOTTOM_GAP = Spacing.xxxl + Spacing.xxl;

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
  /** Default depth for bordered cards — softer than legacy `medium`. */
  card: {
    shadowColor: '#050510',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
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
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
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
  /** Home Body Transformation outer chrome only — faint shadow so the box stays airy */
  bodyTransformCard: {
    shadowColor: '#050814',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
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

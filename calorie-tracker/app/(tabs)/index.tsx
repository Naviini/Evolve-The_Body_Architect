/**
 * Home Screen — Dashboard
 *
 * Shows:
 * - Calorie progress ring
 * - Macro breakdown bars (protein, carbs, fat)
 * - Today's meals summary
 * - Log meal chip (Today's Meals header — avoids overlap with dashboard cards when scrolling)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StoreDrawer from '@/components/store/StoreDrawer';
import { HeaderIconButton } from '@/components/ui/header-icon-button';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
  TAB_SCROLL_GUTTER,
  TAB_SCROLL_BOTTOM_GAP,
} from '@/constants/theme';
import {
  getMealEntriesByDate,
  getDailyLog,
  getWorkoutPlan,
  saveWorkoutPlan,
  getUserHealthProfileForProcessing,
  getDailyCalorieGoalForUser,
  getDailyDietPlanForUser,
} from '@/src/lib/database';
import { useAuth } from '@/src/contexts/AuthContext';
import { MealEntry, MealType, WorkoutDay, MilestonePhase } from '@/src/types';
import { generateWeeklyPlan, getWeekStart } from '@/src/lib/workoutEngine';
import { generateBodySimulation, inferDreamBodyStyle } from '@/src/lib/bodySimulationEngine';
import type { DailyDietPlan } from '@/src/lib/dietPlanEngine';
import { BodySilhouetteMini } from '@/components/BodySilhouette';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTabEntranceAnimation } from '@/hooks/useTabEntranceAnimation';
import { FitBotCharacter } from '@/components/fitbot/FitBotCharacter';
import { pickFitBotMotivationLine } from '@/src/lib/fitBotMotivation';

const RING_SIZE = 200;
const RING_STROKE = 14;

const MEAL_PROMO_META: Record<
  MealType,
  { icon: keyof typeof Ionicons.glyphMap; gradient: readonly [string, string]; chevron: string }
> = {
  breakfast: {
    icon: 'sunny-outline',
    gradient: Colors.gradients.mealBreakfast,
    chevron: Colors.mealPromoChevron.breakfast,
  },
  lunch: {
    icon: 'partly-sunny-outline',
    gradient: Colors.gradients.mealLunch,
    chevron: Colors.mealPromoChevron.lunch,
  },
  dinner: {
    icon: 'moon-outline',
    gradient: Colors.gradients.mealDinner,
    chevron: Colors.mealPromoChevron.dinner,
  },
  snack: {
    icon: 'nutrition-outline',
    gradient: Colors.gradients.mealSnack,
    chevron: Colors.mealPromoChevron.snack,
  },
};

/** Diet vs workout home promos — distinct from purple “Talk to your coach” */
const HOME_DIET_PROMO_GRADIENT = ['#047857', '#059669', '#34D399'] as const;
const HOME_DIET_PROMO_CHEVRON = '#047857';
const HOME_WORKOUT_PROMO_GRADIENT = ['#C2410C', '#EA580C', '#FB923C'] as const;
const HOME_WORKOUT_PROMO_CHEVRON = '#C2410C';

/** Body Transformation CTA — label + arrow share the same tone on dark gradient */
const TRANSFORM_JOURNEY_CTA_TEXT = 'rgba(255,255,255,0.92)';

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const { entranceStyle } = useTabEntranceAnimation();
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [macros, setMacros] = useState({ protein: 0, carbs: 0, fat: 0 });
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [refreshing, setRefreshing] = useState(false);
  const [todayWorkout, setTodayWorkout] = useState<WorkoutDay | null>(null);
  const [simPhases, setSimPhases] = useState<MilestonePhase[]>([]);
  const [dietPlan, setDietPlan] = useState<DailyDietPlan | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    try {
      const userId = user?.id || 'demo-user';
      const personalizedGoal = await getDailyCalorieGoalForUser(userId);
      setCalorieGoal(personalizedGoal);

      const meals = await getMealEntriesByDate(userId, today);
      setTodayMeals(meals);

      const log = await getDailyLog(userId, today);
      if (log) {
        setTotalCalories(log.total_calories || 0);
        setMacros({
          protein: log.total_protein_g || 0,
          carbs: log.total_carbs_g || 0,
          fat: log.total_fat_g || 0,
        });
      } else {
        const cals = meals.reduce((sum: number, m: MealEntry) => sum + (m.calories * m.servings), 0);
        const prot = meals.reduce((sum: number, m: MealEntry) => sum + (m.protein_g * m.servings), 0);
        const carb = meals.reduce((sum: number, m: MealEntry) => sum + (m.carbs_g * m.servings), 0);
        const fat = meals.reduce((sum: number, m: MealEntry) => sum + (m.fat_g * m.servings), 0);
        setTotalCalories(cals);
        setMacros({ protein: prot, carbs: carb, fat: fat });
      }

      // Load today's workout preview
      try {
        const weekStart = getWeekStart(new Date());
        let plan = await getWorkoutPlan(userId, weekStart);
        if (!plan) {
          const profile = await getUserHealthProfileForProcessing(userId);
          if (profile) {
            plan = generateWeeklyPlan(profile, 0);
            await saveWorkoutPlan(userId, plan).catch(() => {});
          }
        }
        if (plan) {
          const dayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
          setTodayWorkout(plan.days[dayIdx] ?? null);
        }
      } catch { }

      // Load body simulation preview
      try {
        const simProfile = await getUserHealthProfileForProcessing(userId);
        if (simProfile) {
          const dreamStyle = inferDreamBodyStyle(simProfile.dream_daily_routine);
          const phases = generateBodySimulation({ profile: simProfile, dreamBodyStyle: dreamStyle });
          setSimPhases(phases);
        }
      } catch { }

      // Load daily diet plan preview
      try {
        const plan = await getDailyDietPlanForUser(userId, today);
        setDietPlan(plan);
      } catch {
        setDietPlan(null);
      }
    } catch (e) {
      console.error('Failed to load home data:', e);
    }
  }, [user, today]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const calorieProgress = Math.min(totalCalories / calorieGoal, 1);
  const remaining = Math.max(calorieGoal - totalCalories, 0);

  const journeyStartKg =
    simPhases.length >= 2 ? simPhases[0].estimatedWeightKg : null;
  const journeyEndKg =
    simPhases.length >= 2
      ? simPhases[simPhases.length - 1].estimatedWeightKg
      : null;
  const journeyDeltaKg =
    journeyStartKg != null && journeyEndKg != null
      ? Math.round((journeyStartKg - journeyEndKg) * 10) / 10
      : null;

  const getMealCalories = (type: MealType) =>
    todayMeals
      .filter((m) => m.meal_type === type)
      .reduce((sum, m) => sum + m.calories * m.servings, 0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const hasWorkoutToday = Boolean(
    todayWorkout && !todayWorkout.isRestDay && (todayWorkout.exercises?.length ?? 0) > 0
  );

  const fitBotCaption = useMemo(
    () =>
      pickFitBotMotivationLine({
        calorieProgress,
        hasWorkoutToday,
      }),
    [calorieProgress, hasWorkoutToday]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + TAB_SCROLL_BOTTOM_GAP,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <Animated.View style={entranceStyle}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.greetingEmoji} accessibilityLabel="Waving hand">
                👋
              </Text>
            </View>
            <Text style={styles.headerTitle}>
              {user?.user_metadata?.display_name || 'Foodie'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <HeaderIconButton icon="notifications-outline" iconSize={24} accessibilityLabel="Notifications" />
            <HeaderIconButton
              icon="menu"
              iconSize={22}
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="Open navigation menu"
            />
          </View>
        </View>

        <View style={styles.fitBotWrap}>
          <FitBotCharacter caption={fitBotCaption} />
        </View>

        {/* Calorie Ring Card */}
        <LinearGradient
          colors={[colors.surfaceLight, colors.card]}
          style={styles.calorieCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.ringContainer}>
            {/* SVG-like ring using Views */}
            <View style={styles.ringOuter}>
              <View style={styles.ringTrack} />
              <View
                style={[
                  styles.ringProgress,
                  {
                    borderColor: calorieProgress >= 1 ? Colors.error : Colors.primary,
                    transform: [
                      { rotate: `-90deg` },
                    ],
                  },
                ]}
              />
              <View style={styles.ringInner}>
                <Text style={styles.ringCalories}>{Math.round(totalCalories)}</Text>
                <Text style={styles.ringLabel}>kcal eaten</Text>
                <View style={styles.ringDivider} />
                <Text style={styles.ringRemaining}>{Math.round(remaining)}</Text>
                <Text style={styles.ringRemainingLabel}>remaining</Text>
              </View>
            </View>
          </View>

          {/* Calorie progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarTrack}>
              <LinearGradient
                colors={calorieProgress >= 1 ? ['#FF5252', '#FF8A80'] : [Colors.primary, Colors.accent]}
                style={[styles.progressBarFill, { width: `${calorieProgress * 100}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(calorieProgress * 100)}% of {calorieGoal} kcal goal
            </Text>
          </View>
        </LinearGradient>

        {/* Macros Row */}
        <View style={styles.macrosRow}>
          <MacroCard
            label="Protein"
            value={macros.protein}
            goal={150}
            color={Colors.protein}
            unit="g"
          />
          <MacroCard
            label="Carbs"
            value={macros.carbs}
            goal={250}
            color={Colors.carbs}
            unit="g"
          />
          <MacroCard
            label="Fat"
            value={macros.fat}
            goal={65}
            color={Colors.fat}
            unit="g"
          />
        </View>

        {/* Body Transformation Preview */}
        {simPhases.length >= 2 && (
          <TouchableOpacity
            onPress={() => router.push('/body-simulation' as any)}
            activeOpacity={0.82}
            style={styles.transformCard}
          >
            <LinearGradient
              colors={[...Colors.gradients.bodyTransform]}
              style={styles.transformGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.transformOuterHeader}>
                <Text style={styles.transformTitleOuter} numberOfLines={1}>
                  Body Transformation
                </Text>
                {journeyDeltaKg != null && Math.abs(journeyDeltaKg) > 0.05 ? (
                  <View style={styles.transformDeltaChip}>
                    <Text style={styles.transformDeltaChipText}>
                      {journeyDeltaKg > 0
                        ? `−${journeyDeltaKg} kg`
                        : `+${Math.abs(journeyDeltaKg)} kg`}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.transformCompareRow}>
                <View style={[styles.transformInnerPanel, styles.transformInnerNow]}>
                  <Text style={styles.transformPhaseNow}>Now</Text>
                  <BodySilhouetteMini
                    params={simPhases[0].bodyParams}
                    gender={(user?.user_metadata?.gender === 'female' ? 'female' : 'male') as any}
                    size={118}
                    accentColor={Colors.journeyNowAccent}
                  />
                  <Text style={[styles.transformKg, styles.transformKgNow]}>
                    {simPhases[0].estimatedWeightKg} kg
                  </Text>
                </View>

                <View style={[styles.transformInnerPanel, styles.transformInnerGoal]}>
                  <Text style={styles.transformPhaseGoal}>Goal</Text>
                  <BodySilhouetteMini
                    params={simPhases[simPhases.length - 1].bodyParams}
                    gender={(user?.user_metadata?.gender === 'female' ? 'female' : 'male') as any}
                    size={118}
                    accentColor={Colors.journeyDreamAccent}
                  />
                  <Text style={[styles.transformKg, styles.transformKgGoal]}>
                    {simPhases[simPhases.length - 1].estimatedWeightKg} kg
                  </Text>
                </View>

                <View style={styles.transformBridge} pointerEvents="none">
                  <LinearGradient
                    colors={[...Colors.gradients.journeyBridgeHairline]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.transformBridgeHairline}
                  />
                  <LinearGradient
                    colors={[...Colors.gradients.journeyBridge]}
                    style={styles.transformBridgeOrb}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.transformCta}>
                <Text style={styles.transformCtaText}>View your journey</Text>
                <Ionicons
                  name="arrow-forward"
                  size={24}
                  color={TRANSFORM_JOURNEY_CTA_TEXT}
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Talk to your coach */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/(tabs)/coach' as any)}
          style={styles.coachPromoCard}
        >
          <LinearGradient
            colors={['#6D28D9', '#7C3AED', '#A855F7']}
            style={styles.coachPromoGradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          >
            <Ionicons name="chatbubble" size={26} color="#FFFFFF" style={styles.coachPromoBubbleIcon} />
            <View style={styles.coachPromoTextCol}>
              <Text style={styles.coachPromoTitle}>Talk to your coach</Text>
              <Text style={styles.coachPromoSub}>
                Motivation, guilt after a slip, burnout — get supportive, judgment-free guidance.
              </Text>
            </View>
            <View style={styles.coachPromoArrowCircle}>
              <Ionicons name="chevron-forward" size={22} color="#6D28D9" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Personalized Daily Diet Plan — same chrome as Talk to your coach */}
        {dietPlan && (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/diet-plan' as any)}
            style={styles.coachPromoCard}
          >
            <LinearGradient
              colors={HOME_DIET_PROMO_GRADIENT}
              style={styles.coachPromoGradient}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            >
              <Ionicons name="nutrition" size={26} color="#FFFFFF" style={styles.coachPromoBubbleIcon} />
              <View style={styles.coachPromoTextCol}>
                <Text style={styles.coachPromoTitle}>Today{"'"}s Personalized Diet Plan</Text>
                <Text style={styles.coachPromoSub}>
                  {dietPlan.calorieTarget} kcal · P {dietPlan.macros.protein_g}g · C {dietPlan.macros.carbs_g}g · F{' '}
                  {dietPlan.macros.fat_g}g{'\n'}
                  {dietPlan.meals.length} meals planned — tap to view full plan
                </Text>
              </View>
              <View style={styles.coachPromoArrowCircle}>
                <Ionicons name="chevron-forward" size={22} color={HOME_DIET_PROMO_CHEVRON} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Today's Workout — same chrome as Talk to your coach */}
        {todayWorkout && (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/(tabs)/workout')}
            style={styles.coachPromoCard}
          >
            <LinearGradient
              colors={HOME_WORKOUT_PROMO_GRADIENT}
              style={styles.coachPromoGradient}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            >
              <Ionicons name="barbell" size={26} color="#FFFFFF" style={styles.coachPromoBubbleIcon} />
              <View style={styles.coachPromoTextCol}>
                <Text style={styles.coachPromoTitle}>Today{"'"}s Workout</Text>
                <Text style={styles.coachPromoSub}>
                  {todayWorkout.isRestDay
                    ? `${todayWorkout.theme} — Rest & recover today 🛌`
                    : `${todayWorkout.theme}\n${todayWorkout.estimatedDurationMin} min · ${todayWorkout.exercises.length} exercises · ~${todayWorkout.estimatedCaloriesBurned} kcal`}
                </Text>
              </View>
              <View style={styles.coachPromoArrowCircle}>
                <Ionicons name="chevron-forward" size={22} color={HOME_WORKOUT_PROMO_CHEVRON} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Today's Meals — chip here keeps “add meal” out from under floating FAB over Dream card */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitleInRow}>Today{"'"}s Meals</Text>
          <TouchableOpacity
            style={styles.logMealChip}
            onPress={() => router.push('/add-meal')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Log a meal"
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.logMealChipGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.logMealChipText}>Log meal</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={styles.mealsGrid}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
            const cals = getMealCalories(type);
            const count = todayMeals.filter((m) => m.meal_type === type).length;
            const meta = MEAL_PROMO_META[type];
            const label = type.charAt(0).toUpperCase() + type.slice(1);
            return (
              <TouchableOpacity
                key={type}
                style={styles.mealCard}
                onPress={() => router.push('/diary')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${Math.round(cals)} calories, ${count} items`}
              >
                <LinearGradient
                  colors={[...meta.gradient]}
                  style={styles.mealCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.mealCardHeaderRow}>
                    <View style={styles.mealCardIconWrap}>
                      <Ionicons name={meta.icon} size={20} color="rgba(255,255,255,0.95)" />
                    </View>
                    <View style={styles.mealCardMiniChevron}>
                      <Ionicons name="chevron-forward" size={16} color={meta.chevron} />
                    </View>
                  </View>
                  <Text style={styles.mealCardTitle}>{label}</Text>
                  <Text style={styles.mealCardKcal}>{Math.round(cals)} kcal</Text>
                  <Text style={styles.mealCardCount}>
                    {count} {count === 1 ? 'item' : 'items'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <LinearGradient
          colors={[colors.surfaceLight, colors.card]}
          style={styles.statsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="flame-outline" size={20} color={Colors.warning} />
              <Text style={styles.statValue}>{todayMeals.length}</Text>
              <Text style={styles.statLabel}>Meals logged</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="water-outline" size={20} color={Colors.accent} />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Water (cups)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="trophy-outline" size={20} color={Colors.warning} />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Day streak</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ height: 72 }} />
        </Animated.View>
      </ScrollView>

      <StoreDrawer
        open={menuOpen}
        statusText="Quick navigation"
        onClose={() => setMenuOpen(false)}
        onAccount={() => { setMenuOpen(false); router.push('/(tabs)/profile'); }}
        onWishlist={() => { setMenuOpen(false); router.push({ pathname: '/store', params: { screen: 'wishlist' } }); }}
        onCheckout={() => { setMenuOpen(false); router.push({ pathname: '/store', params: { screen: 'checkout' } }); }}
        onOrderStatus={() => { setMenuOpen(false); router.push({ pathname: '/store', params: { screen: 'status' } }); }}
        onOrderHistory={() => { setMenuOpen(false); router.push({ pathname: '/store', params: { screen: 'orders' } }); }}
        onClearSearch={() => setMenuOpen(false)}
        onResetFilters={() => setMenuOpen(false)}
      />
    </View>
  );
}

// ============================================================
// Macro Card Component
// ============================================================

function MacroCard({
  label,
  value,
  goal,
  color,
  unit,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
  unit: string;
}) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const progress = Math.min(value / goal, 1);

  return (
    <View style={styles.macroCard}>
      <LinearGradient
        colors={[colors.surfaceLight, colors.card]}
        style={styles.macroCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[styles.macroValue, { color }]}>{Math.round(value)}{unit}</Text>
        <Text style={styles.macroLabel}>{label}</Text>
        <View style={styles.macroBarTrack}>
          <View
            style={[
              styles.macroBarFill,
              { width: `${progress * 100}%`, backgroundColor: color },
            ]}
          />
        </View>
        <Text style={styles.macroGoal}>{Math.round(goal)}{unit} goal</Text>
      </LinearGradient>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: TAB_SCROLL_GUTTER,
    paddingTop: Spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fitBotWrap: {
    marginBottom: Spacing.md,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greeting: {
    fontSize: Typography.sizes.body,
    color: colors.textSecondary,
    fontWeight: Typography.weights.medium,
    letterSpacing: 0.15,
  },
  greetingEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  headerTitle: {
    fontSize: Typography.sizes.heading,
    color: colors.text,
    fontWeight: Typography.weights.bold,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  // Calorie Card
  calorieCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...Shadows.card,
  },
  ringContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  ringOuter: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringTrack: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
    borderColor: colors.border,
  },
  ringProgress: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
    borderTopColor: Colors.primary,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  ringInner: {
    alignItems: 'center',
  },
  ringCalories: {
    fontSize: Typography.sizes.hero,
    color: colors.text,
    fontWeight: Typography.weights.bold,
  },
  ringLabel: {
    fontSize: Typography.sizes.caption,
    color: colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  ringDivider: {
    width: 40,
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
  ringRemaining: {
    fontSize: Typography.sizes.subtitle,
    color: Colors.accent,
    fontWeight: Typography.weights.semibold,
  },
  ringRemainingLabel: {
    fontSize: Typography.sizes.caption,
    color: colors.textTertiary,
  },

  // Progress bar
  progressBarContainer: {
    marginTop: Spacing.sm,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: BorderRadius.sm / 2,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: Typography.sizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },

  coachPromoCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  coachPromoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 92,
  },
  coachPromoBubbleIcon: {
    flexShrink: 0,
  },
  coachPromoTextCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: Spacing.xs,
  },
  coachPromoTitle: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.bold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  coachPromoSub: {
    fontSize: Typography.sizes.caption,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 6,
    lineHeight: 20,
    fontWeight: Typography.weights.regular,
  },
  coachPromoArrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    ...Shadows.small,
  },

  // Macros Row
  macrosRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  macroCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  macroCardGradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...Shadows.card,
  },
  macroValue: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
  },
  macroLabel: {
    fontSize: Typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  macroBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroGoal: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 4,
  },

  // Section
  sectionTitle: {
    fontSize: Typography.sizes.subtitle,
    color: colors.text,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.md,
    letterSpacing: -0.2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitleInRow: {
    flex: 1,
    minWidth: 0,
    fontSize: Typography.sizes.subtitle,
    color: colors.text,
    fontWeight: Typography.weights.bold,
    marginBottom: 0,
    letterSpacing: -0.2,
  },
  logMealChip: {
    borderRadius: BorderRadius.round,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  logMealChipGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.round,
  },
  logMealChipText: {
    color: '#FFF',
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.body,
  },

  // Today's Meals — 2×2 collage; muted gradients + icons (same palette as before)
  mealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  mealCard: {
    width: '48%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  mealCardGradient: {
    padding: Spacing.md,
    minHeight: 118,
    borderRadius: BorderRadius.md,
  },
  mealCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  mealCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealCardMiniChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  mealCardTitle: {
    fontSize: Typography.sizes.body,
    color: 'rgba(255,255,255,0.97)',
    fontWeight: Typography.weights.semibold,
  },
  mealCardKcal: {
    fontSize: Typography.sizes.bodyLarge,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: Typography.weights.bold,
    marginTop: 6,
  },
  mealCardCount: {
    fontSize: Typography.sizes.caption,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
  },

  // Stats Card
  statsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.sizes.title,
    color: colors.text,
    fontWeight: Typography.weights.bold,
    marginTop: 4,
  },
  statLabel: {
    fontSize: Typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },

  // Body Transformation Preview
  transformCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.journeyTransformCardBorder,
    ...Shadows.bodyTransformCard,
  },
  transformGradient: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  transformOuterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  transformTitleOuter: {
    flex: 1,
    flexShrink: 1,
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.bold,
    color: 'rgba(255,255,255,0.96)',
    letterSpacing: -0.35,
  },
  transformDeltaChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.journeyDeltaChipBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.journeyDeltaChipBorder,
  },
  transformDeltaChipText: {
    fontSize: 12,
    fontWeight: Typography.weights.semibold,
    color: 'rgba(235, 238, 248, 0.92)',
    letterSpacing: -0.15,
  },
  transformCompareRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    position: 'relative',
  },
  transformInnerPanel: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    minHeight: 176,
  },
  transformInnerNow: {
    backgroundColor: Colors.journeyNowPanel,
    borderColor: Colors.journeyPanelBorderNow,
  },
  transformInnerGoal: {
    backgroundColor: Colors.journeyGoalPanel,
    borderColor: Colors.journeyPanelBorderGoal,
  },
  transformPhaseNow: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    color: Colors.journeyNowAccent,
    marginBottom: Spacing.xs,
  },
  transformPhaseGoal: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    color: Colors.journeyDreamAccent,
    marginBottom: Spacing.xs,
  },
  transformBridge: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 44,
    marginLeft: -22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  transformBridgeHairline: {
    position: 'absolute',
    width: 2,
    top: '12%',
    bottom: '12%',
    borderRadius: BorderRadius.round,
  },
  transformBridgeOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  transformKg: {
    marginTop: Spacing.xs,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.2,
  },
  transformKgNow: {
    color: Colors.journeyNowAccent,
  },
  transformKgGoal: {
    color: Colors.journeyDreamAccent,
  },
  transformCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  transformCtaText: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.bold,
    color: TRANSFORM_JOURNEY_CTA_TEXT,
    letterSpacing: -0.25,
  },
});

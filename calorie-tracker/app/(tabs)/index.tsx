/**
 * Home Screen — Dashboard
 *
 * Shows:
 * - Calorie progress ring
 * - Macro breakdown bars (protein, carbs, fat)
 * - Today's meals summary
 * - Quick add FAB
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography, Shadows, MealIcons } from '@/constants/theme';
import { getMealEntriesByDate, getDailyLog, getWorkoutPlan, saveWorkoutPlan, getOnboardingProfile } from '@/src/lib/database';
import { useAuth } from '@/src/contexts/AuthContext';
import { MealEntry, MealType, WorkoutDay } from '@/src/types';
import { generateWeeklyPlan, getWeekStart } from '@/src/lib/workoutEngine';

const { width: windowWidth } = Dimensions.get('window');
const SCREEN_WIDTH = Platform.OS === 'web' ? Math.min(windowWidth, 480) : windowWidth;
const RING_SIZE = 200;
const RING_STROKE = 14;

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [macros, setMacros] = useState({ protein: 0, carbs: 0, fat: 0 });
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [refreshing, setRefreshing] = useState(false);
  const [todayWorkout, setTodayWorkout] = useState<WorkoutDay | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    try {
      const userId = user?.id || 'demo-user';
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
          const profile = await getOnboardingProfile(userId);
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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.headerTitle}>
              {user?.user_metadata?.display_name || 'Foodie'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>

        {/* Calorie Ring Card */}
        <LinearGradient
          colors={[Colors.dark.surfaceLight, Colors.dark.card]}
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

        {/* Today's Workout Preview */}
        {todayWorkout && (
          <>
            <Text style={styles.sectionTitle}>Today's Workout</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/workout')}
              activeOpacity={0.8}
              style={styles.workoutPreviewCard}
            >
              <LinearGradient
                colors={todayWorkout.isRestDay ? ['#1E1E3F', '#13132B'] : ['#2A1A60', '#0F2A40']}
                style={styles.workoutPreviewGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={styles.workoutPreviewLeft}>
                  <Text style={styles.workoutPreviewEmoji}>{todayWorkout.emoji}</Text>
                  <View>
                    <Text style={styles.workoutPreviewTheme}>{todayWorkout.theme}</Text>
                    {todayWorkout.isRestDay ? (
                      <Text style={styles.workoutPreviewSub}>Rest & recover today 🛌</Text>
                    ) : (
                      <Text style={styles.workoutPreviewSub}>
                        {todayWorkout.estimatedDurationMin} min • {todayWorkout.exercises.length} exercises • ~{todayWorkout.estimatedCaloriesBurned} kcal
                      </Text>
                    )}
                  </View>
                </View>
                {!todayWorkout.isRestDay && (
                  <View style={styles.workoutPreviewCta}>
                    <Ionicons name="play-circle" size={32} color={Colors.primary} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* Today's Meals */}
        <Text style={styles.sectionTitle}>Today's Meals</Text>
        <View style={styles.mealsGrid}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
            const cals = getMealCalories(type);
            const count = todayMeals.filter((m) => m.meal_type === type).length;
            return (
              <TouchableOpacity
                key={type}
                style={styles.mealCard}
                onPress={() => router.push('/diary')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[Colors.dark.surfaceLight, Colors.dark.card]}
                  style={styles.mealCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.mealEmoji}>{MealIcons[type]}</Text>
                  <Text style={styles.mealType}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                  <Text style={styles.mealCalories}>{Math.round(cals)} kcal</Text>
                  <Text style={styles.mealCount}>
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
          colors={[Colors.dark.surfaceLight, Colors.dark.card]}
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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Quick Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-meal')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
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
  const progress = Math.min(value / goal, 1);

  return (
    <View style={styles.macroCard}>
      <LinearGradient
        colors={[Colors.dark.surfaceLight, Colors.dark.card]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: Typography.sizes.body,
    color: Colors.dark.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  headerTitle: {
    fontSize: Typography.sizes.heading,
    color: Colors.dark.text,
    fontWeight: Typography.weights.bold,
    marginTop: 2,
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  // Calorie Card
  calorieCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    ...Shadows.medium,
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
    borderColor: Colors.dark.border,
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
    color: Colors.dark.text,
    fontWeight: Typography.weights.bold,
  },
  ringLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.dark.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  ringDivider: {
    width: 40,
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 6,
  },
  ringRemaining: {
    fontSize: Typography.sizes.subtitle,
    color: Colors.accent,
    fontWeight: Typography.weights.semibold,
  },
  ringRemainingLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.dark.textTertiary,
  },

  // Progress bar
  progressBarContainer: {
    marginTop: Spacing.sm,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: Typography.sizes.caption,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: 6,
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
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  macroValue: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
  },
  macroLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.dark.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  macroBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroGoal: {
    fontSize: 10,
    color: Colors.dark.textTertiary,
    marginTop: 4,
  },

  // Section
  sectionTitle: {
    fontSize: Typography.sizes.subtitle,
    color: Colors.dark.text,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.md,
  },

  // Meals Grid
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
  },
  mealCardGradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minHeight: 110,
  },
  mealEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  mealType: {
    fontSize: Typography.sizes.body,
    color: Colors.dark.text,
    fontWeight: Typography.weights.semibold,
  },
  mealCalories: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
    marginTop: 4,
  },
  mealCount: {
    fontSize: Typography.sizes.caption,
    color: Colors.dark.textTertiary,
    marginTop: 2,
  },

  // Workout preview card
  workoutPreviewCard: {
    borderRadius: BorderRadius.lg, overflow: 'hidden',
    marginBottom: Spacing.lg, ...Shadows.medium,
    borderWidth: 1, borderColor: Colors.primary + '40',
  },
  workoutPreviewGradient: { padding: Spacing.md },
  workoutPreviewLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  workoutPreviewEmoji: { fontSize: 32 },
  workoutPreviewTheme: { fontSize: 16, fontWeight: '700', color: Colors.dark.text },
  workoutPreviewSub: { fontSize: 12, color: Colors.dark.textSecondary, marginTop: 2 },
  workoutPreviewCta: { paddingLeft: Spacing.sm },

  // Stats Card
  statsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: Spacing.md,
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
    color: Colors.dark.text,
    fontWeight: Typography.weights.bold,
    marginTop: 4,
  },
  statLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.dark.border,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Platform.OS === 'ios' ? 100 : 80,
    borderRadius: 28,
    ...Shadows.glow,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

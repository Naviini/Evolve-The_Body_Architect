/**
 * Workout Tab Screen — Enhanced with Rewards & Dynamic Updates
 *
 * Sections:
 *   XP progress bar · Achievement badges · Dynamic refresh banner
 *   Reasoning pill · Weekly day selector · Expandable day workout card
 *   (recommended exercises) · Start CTA · Week summary stats · History
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StoreDrawer from '@/components/store/StoreDrawer';
import { HeaderIconButton } from '@/components/ui/header-icon-button';
import { ScreenTitleRow } from '@/components/ui/screen-title-row';
import { Colors, Spacing, BorderRadius, Typography, Shadows, TAB_SCROLL_GUTTER, TAB_SCROLL_BOTTOM_GAP } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  getUserHealthProfileForProcessing, getDailyLog, getWorkoutPlan, saveWorkoutPlan,
  getWorkoutHistory, getWorkoutStreak, getUserRewards, saveProfileHash, getDailyCalorieGoalForUser,
} from '@/src/lib/database';
import { generateWeeklyPlan, getWeekStart } from '@/src/lib/workoutEngine';
import { hashProfile, getAllAchievementsForUser, LEVELS } from '@/src/lib/rewardEngine';
import { WorkoutPlan, WorkoutDay, WorkoutExercise, UserRewards } from '@/src/types';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function todayDayIndex(): number {
  const raw = new Date().getDay();
  return raw === 0 ? 6 : raw - 1;
}

const CATEGORY_COLOR: Record<string, string> = {
  strength: '#6C63FF',
  cardio: '#00D2FF',
  hiit: '#FF6B6B',
  flexibility: '#00E676',
  mobility: '#FFD93D',
  yoga: '#FF9F43',
  recovery: '#A0A0C0',
};

const DIFF_BADGE: Record<string, { color: string; label: string }> = {
  easy:     { color: '#00E676', label: 'Easy' },
  moderate: { color: '#FFB74D', label: 'Moderate' },
  hard:     { color: '#FF6B6B', label: 'Hard' },
  intense:  { color: '#FF5252', label: 'Intense' },
};

/** Matches home “Today’s Workout” promo — XP card uses same orangish chrome */
const XP_CARD_GRADIENT = ['#C2410C', '#EA580C', '#FB923C'] as const;

// ════════════════════════════════════════════════════════════
// Main Screen
// ════════════════════════════════════════════════════════════

export default function WorkoutScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(todayDayIndex());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [rewards, setRewards] = useState<UserRewards | null>(null);
  const [showRefreshBanner, setShowRefreshBanner] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [workoutOverviewExpanded, setWorkoutOverviewExpanded] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const xpBarAnim = useRef(new Animated.Value(0)).current;
  const refreshBannerAnim = useRef(new Animated.Value(0)).current;

  const animate = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const animateXPBar = useCallback((lvlProgress: number) => {
    Animated.timing(xpBarAnim, {
      toValue: lvlProgress, duration: 800, useNativeDriver: false,
    }).start();
  }, [xpBarAnim]);

  const loadData = useCallback(async () => {
    const uid = user?.id ?? 'demo-user';
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = getWeekStart(new Date());

      // 1. Load cached plan or generate fresh
      let cached = await getWorkoutPlan(uid, weekStart);
      if (!cached) {
        const profile = await getUserHealthProfileForProcessing(uid);
        const todayLog = await getDailyLog(uid, today);
        const eatenCals = todayLog?.total_calories ?? 0;
        const goal = await getDailyCalorieGoalForUser(uid).catch(() => 2000);
        const deficit = (goal - eatenCals) * 7;
        if (profile) {
          const fresh = generateWeeklyPlan(profile, deficit);
          await saveWorkoutPlan(uid, fresh).catch(() => {});
          cached = fresh;
        } else {
          cached = generateWeeklyPlan({ user_id: uid } as any, 0);
        }
      }
      setPlan(cached);

      // 2. Profile change detection
      const profile = await getUserHealthProfileForProcessing(uid).catch(() => null);
      if (profile) {
        const currentHash = hashProfile(profile);
        const rewardsRow = await getUserRewards(uid).catch(() => null);
        const storedHash = rewardsRow?.profileHash;
        if (storedHash && storedHash !== currentHash) {
          // profile changed — show refresh banner
          setShowRefreshBanner(true);
          Animated.spring(refreshBannerAnim, { toValue: 1, useNativeDriver: true }).start();
          await saveProfileHash(uid, currentHash).catch(() => {});
        } else if (!storedHash) {
          await saveProfileHash(uid, currentHash).catch(() => {});
        }
      }

      // 3. Load rewards / XP
      const rw = await getUserRewards(uid).catch(() => null);
      setRewards(rw);
      if (rw) {
        const lvlDef = LEVELS.find(l => l.level === rw.level) ?? LEVELS[0];
        const nextDef = LEVELS.find(l => l.level === rw.level + 1);
        const lvlMin = lvlDef.minXP;
        const lvlMax = nextDef?.minXP ?? lvlDef.maxXP;
        const progress = Math.min((rw.totalXP - lvlMin) / Math.max(lvlMax - lvlMin, 1), 1);
        animateXPBar(progress);
      }

      // 4. Streak + history
      const [s, history] = await Promise.all([
        getWorkoutStreak(uid).catch(() => 0),
        getWorkoutHistory(uid, 5).catch(() => []),
      ]);
      setStreak(s);
      setHistoryCount(history.length);
    } catch (e) {
      console.error('WorkoutScreen load error:', e);
    } finally {
      setLoading(false);
      animate();
    }
  }, [user, animate, animateXPBar, refreshBannerAnim]);

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(24);
      xpBarAnim.setValue(0);
      setLoading(true);
      loadData();
    }, [loadData, fadeAnim, slideAnim, xpBarAnim])
  );

  useEffect(() => {
    setWorkoutOverviewExpanded(false);
    setExpandedExercise(null);
  }, [selectedDay]);

  const onRefresh = async () => {
    setRefreshing(true);
    const uid = user?.id ?? 'demo-user';
    const profile = await getUserHealthProfileForProcessing(uid).catch(() => null);
    if (profile) {
      const fresh = generateWeeklyPlan(profile, 0);
      await saveWorkoutPlan(uid, fresh).catch(() => {});
      setPlan(fresh);
    }
    setShowRefreshBanner(false);
    setRefreshing(false);
  };

  const forceRefreshPlan = async () => {
    setRefreshing(true);
    await onRefresh();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Building your plan…</Text>
      </View>
    );
  }

  const selectedDayData = plan?.days[selectedDay] ?? null;
  const unlockedIds = (rewards?.achievements ?? [])
    .filter((a: any) => a.unlockedAt).map((a: any) => a.id);
  const allAchievements = getAllAchievementsForUser(unlockedIds);
  const earnedAchievements = allAchievements.filter(a => a.unlockedAt);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: insets.bottom + TAB_SCROLL_BOTTOM_GAP + Spacing.md,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.header}>
            <ScreenTitleRow title="Workout" icon="barbell-outline" />
            <View style={styles.headerActions}>
              {streak > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <Text style={styles.streakText}>{streak} day{streak !== 1 ? 's' : ''}</Text>
                </View>
              )}
              <HeaderIconButton
                icon="menu"
                iconSize={22}
                onPress={() => setMenuOpen(true)}
                accessibilityLabel="Open navigation menu"
              />
            </View>
          </View>

          {/* ── XP Progress Bar ──────────────────────────────── */}
          {rewards && (
            <LinearGradient
              colors={[...XP_CARD_GRADIENT]}
              style={styles.xpCard}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            >
              <View style={styles.xpHeader}>
                <Text style={styles.levelName}>{rewards.levelName}</Text>
                <Text style={styles.xpTotal}>{rewards.totalXP} XP</Text>
              </View>
              <View style={styles.xpTrack}>
                <Animated.View style={[styles.xpFill, {
                  width: xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }]} />
              </View>
              {rewards.xpToNextLevel > 0 && (
                <Text style={styles.xpNext}>{rewards.xpToNextLevel} XP to next level</Text>
              )}
            </LinearGradient>
          )}

          {/* ── Dynamic Refresh Banner ───────────────────────── */}
          {showRefreshBanner && (
            <Animated.View style={[styles.refreshBanner, {
              transform: [{ scale: refreshBannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
              opacity: refreshBannerAnim,
            }]}>
              <Ionicons name="refresh-circle" size={20} color={Colors.warning} />
              <Text style={styles.refreshBannerText}>Your body has changed — update your plan!</Text>
              <TouchableOpacity onPress={forceRefreshPlan} style={styles.refreshBtn}>
                <View style={styles.refreshBtnInner}>
                  <Ionicons name="refresh" size={14} color={Colors.warning} />
                  <Text style={styles.refreshBtnText}>Refresh</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Achievements Row ─────────────────────────────── */}
          {earnedAchievements.length > 0 && (
            <>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="trophy-outline" size={18} color={colors.text} />
                <Text style={styles.sectionTitleInline}>Achievements</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesStrip}>
                {earnedAchievements.map(badge => (
                  <View key={badge.id} style={styles.badgeChip}>
                    <Text style={styles.badgeChipEmoji}>{badge.emoji}</Text>
                    <Text style={styles.badgeChipName}>{badge.name}</Text>
                  </View>
                ))}
                {/* Locked preview */}
                {allAchievements.filter(a => !a.unlockedAt).slice(0, 2).map(badge => (
                  <View key={badge.id} style={[styles.badgeChip, styles.badgeChipLocked]}>
                    <Text style={[styles.badgeChipEmoji, { opacity: 0.3 }]}>{badge.emoji}</Text>
                    <Text style={[styles.badgeChipName, { color: colors.textTertiary }]}>???</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* ── Weekly day selector (equal columns, no emoji) ─ */}
          <View style={styles.weekStripSection}>
            <View style={styles.weekStripTitleRow}>
              <View style={styles.weekStripTitleAccent} />
              <Text style={styles.weekStripLabel}>Schedule</Text>
            </View>
            <View style={styles.weekStripRow}>
              {(plan?.days ?? []).map((day, i) => {
                const isToday = i === todayDayIndex();
                const isSelected = i === selectedDay;
                const barColor = day.isRestDay
                  ? colors.border
                  : (CATEGORY_COLOR[day.exercises[0]?.category ?? 'strength'] ?? Colors.primary);
                const accessibilityLabel = `${DAY_LABELS[i]}, ${day.isRestDay ? 'rest day' : day.theme}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setSelectedDay(i)}
                    activeOpacity={0.75}
                    style={styles.weekDayTouchable}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={accessibilityLabel}
                  >
                    <View
                      style={[
                        styles.weekDayCell,
                        isSelected && styles.weekDayCellSelected,
                        isToday && !isSelected && styles.weekDayCellToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.weekDayLabel,
                          isSelected && styles.weekDayLabelSelected,
                          !isSelected && !day.isRestDay && styles.weekDayLabelTraining,
                          day.isRestDay && !isSelected && styles.weekDayLabelRest,
                        ]}
                        numberOfLines={1}
                      >
                        {DAY_LABELS[i]}
                      </Text>
                      <View
                        style={[
                          styles.weekDayBar,
                          { backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : barColor },
                          day.isRestDay && !isSelected && styles.weekDayBarMuted,
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* ── Selected Day Card ──────────────────────────────── */}
        {selectedDayData && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <DayWorkoutExpandable
              day={selectedDayData}
              isToday={selectedDay === todayDayIndex()}
              expanded={workoutOverviewExpanded}
              onToggleExpanded={() => setWorkoutOverviewExpanded(v => !v)}
            >
              {!selectedDayData.isRestDay && selectedDayData.exercises.length > 0 && (
                <>
                  <Text style={styles.dayDropdownTitle}>Recommended exercises</Text>
                  {selectedDayData.exercises.map((ex, i) => (
                    <ExerciseCard
                      key={ex.id}
                      exercise={ex}
                      index={i + 1}
                      expanded={expandedExercise === ex.id}
                      onToggle={() => setExpandedExercise(expandedExercise === ex.id ? null : ex.id)}
                      onLearn={() => router.push({
                        pathname: '/exercise-tutorial',
                        params: { exerciseId: ex.id, exerciseName: ex.name },
                      } as any)}
                    />
                  ))}
                </>
              )}
            </DayWorkoutExpandable>

            {/* ── Start CTA ─────────────────────────────── */}
            {!selectedDayData.isRestDay && selectedDayData.exercises.length > 0 && selectedDay === todayDayIndex() && (
              <TouchableOpacity
                style={styles.startBtn}
                activeOpacity={0.85}
                onPress={() => router.push({
                  pathname: '/workout-session',
                  params: { dayJson: JSON.stringify(selectedDayData), planId: plan?.id ?? '' },
                } as any)}
              >
                <LinearGradient
                  colors={['#6C63FF', '#00D2FF']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.startBtnGradient}
                >
                  <Ionicons name="play-circle" size={22} color="#FFF" />
                  <Text style={styles.startBtnText}>Start Today{"'"}s Workout</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* ── Rest Day ───────────────────────────────────── */}
            {selectedDayData.isRestDay && (
              <View style={styles.restCard}>
                <Ionicons name="moon-outline" size={48} color={colors.textSecondary} style={styles.restIcon} />
                <Text style={styles.restTitle}>Rest & Recover</Text>
                <Text style={styles.restBody}>
                  Rest days are just as important as training. Stay hydrated, sleep well, and let your muscles rebuild stronger.
                </Text>
                {selectedDayData.exercises.length > 0 && (
                  <Text style={styles.restOptional}>
                    Optional gentle activity: {selectedDayData.exercises[0].name}
                  </Text>
                )}
              </View>
            )}
          </Animated.View>
        )}

        {/* ── Week Stats ─────────────────────────────────────── */}
        {plan && (
          <Animated.View style={[styles.weekGlanceSection, { opacity: fadeAnim }]}>
            <Text style={styles.weekGlanceTitle}>This Week at a Glance</Text>
            <View style={styles.weekStats}>
              <WeekStatCard icon="flame-outline" color={Colors.warning}
                value={`${plan.days.filter(d => !d.isRestDay).length}`} label="Active Days" />
              <WeekStatCard icon="time-outline" color={Colors.accent}
                value={`${plan.days.reduce((s, d) => s + d.estimatedDurationMin, 0)}`} label="Total Min" />
              <WeekStatCard icon="flash-outline" color={Colors.primary}
                value={`${plan.days.reduce((s, d) => s + d.estimatedCaloriesBurned, 0)}`} label="Est. kcal" />
            </View>
          </Animated.View>
        )}

        {/* ── History ───────────────────────────────────────── */}
        {historyCount > 0 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.historyCard}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.historyText}>
                {historyCount} workout{historyCount !== 1 ? 's' : ''} logged
                {rewards ? ` · ${rewards.totalCaloriesBurned} kcal burned` : ''}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── Empty State ───────────────────────────────────── */}
        {!plan && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={52} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Complete Your Profile</Text>
            <Text style={styles.emptyBody}>Add your health details to get a personalised workout plan.</Text>
          </View>
        )}
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

// ════════════════════════════════════════════════════════════
// Day card — expandable workout overview + recommended exercises
// ════════════════════════════════════════════════════════════

function DayWorkoutExpandable({
  day,
  isToday,
  expanded,
  onToggleExpanded,
  children,
}: {
  day: WorkoutDay;
  isToday: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  children?: React.ReactNode;
}) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const catColor = day.isRestDay
    ? colors.textTertiary
    : (CATEGORY_COLOR[day.exercises[0]?.category ?? 'strength'] ?? Colors.primary);

  const hasExercises = !day.isRestDay && day.exercises.length > 0;

  return (
    <LinearGradient
      colors={['#1E1E3F', '#13132B']}
      style={styles.dayCard}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      <View style={[styles.dayCardAccent, { backgroundColor: catColor }]} />
      <TouchableOpacity
        activeOpacity={hasExercises ? 0.88 : 1}
        onPress={hasExercises ? onToggleExpanded : undefined}
        disabled={!hasExercises}
        accessibilityRole={hasExercises ? 'button' : undefined}
        accessibilityState={hasExercises ? { expanded } : undefined}
        accessibilityHint={hasExercises ? (expanded ? 'Collapses exercise list' : 'Shows recommended exercises') : undefined}
      >
        <View style={styles.dayCardMain}>
          <View style={[styles.dayCardIconWrap, { backgroundColor: catColor + '22' }]}>
            <Ionicons
              name={day.isRestDay ? 'moon-outline' : 'barbell-outline'}
              size={22}
              color={catColor}
            />
          </View>
          <View style={styles.dayCardCenter}>
            <Text style={styles.dayCardTheme} numberOfLines={2}>
              {day.theme}
            </Text>
            {!day.isRestDay ? (
              <View style={styles.dayCardStats}>
                <View style={styles.dayCardStat}>
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.dayCardStatText}>{day.estimatedDurationMin} min</Text>
                </View>
                <View style={styles.dayCardStat}>
                  <Ionicons name="flame-outline" size={14} color={Colors.warning} />
                  <Text style={styles.dayCardStatText}>{day.estimatedCaloriesBurned} kcal</Text>
                </View>
                <View style={styles.dayCardStat}>
                  <Ionicons name="barbell-outline" size={14} color={Colors.primary} />
                  <Text style={styles.dayCardStatText}>{day.exercises.length} exercises</Text>
                </View>
              </View>
            ) : null}
          </View>
          <View style={styles.dayCardHeaderRight}>
            {isToday && (
              <View style={styles.todayTagPill}>
                <Text style={styles.todayTagText}>TODAY</Text>
              </View>
            )}
            {hasExercises && (
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={22}
                color="rgba(255,255,255,0.75)"
              />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {hasExercises && expanded && children ? (
        <View style={styles.dayCardDropdown}>{children}</View>
      ) : null}
    </LinearGradient>
  );
}

// ════════════════════════════════════════════════════════════
// Exercise Card
// ════════════════════════════════════════════════════════════

function ExerciseCard({
  exercise, index, expanded, onToggle, onLearn,
}: {
  exercise: WorkoutExercise;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onLearn: () => void;
}) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const badge = DIFF_BADGE[exercise.difficulty] ?? DIFF_BADGE.moderate;
  const catColor = CATEGORY_COLOR[exercise.category] ?? Colors.primary;
  const setInfo = exercise.sets
    ? `${exercise.sets} × ${exercise.reps ?? '—'} reps`
    : exercise.durationSec
    ? `${Math.round(exercise.durationSec / 60)} min`
    : '';

  return (
    <TouchableOpacity style={styles.exCard} onPress={onToggle} activeOpacity={0.8}>
      <View style={styles.exCardRow}>
        <View style={[styles.exIndex, { backgroundColor: catColor + '22' }]}>
          <Text style={[styles.exIndexText, { color: catColor }]}>{index}</Text>
        </View>
        <View style={styles.exMain}>
          <Text style={styles.exName}>{exercise.name}</Text>
          <View style={styles.exMeta}>
            <Text style={styles.exSetInfo}>{setInfo}</Text>
            <Text style={styles.exRestInfo}>· {exercise.restSec}s rest</Text>
          </View>
        </View>
        <View style={styles.exRight}>
          <View style={[styles.diffBadge, { backgroundColor: badge.color + '22' }]}>
            <Text style={[styles.diffBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16} color={colors.textTertiary} style={{ marginTop: 6 }}
          />
        </View>
      </View>

      {/* Muscle tags */}
      <View style={styles.muscleRow}>
        {exercise.muscleGroups.slice(0, 3).map(m => (
          <View key={m} style={[styles.muscleTag, { borderColor: catColor }]}>
            <Text style={[styles.muscleTagText, { color: catColor }]}>{m}</Text>
          </View>
        ))}
        {exercise.equipment !== 'none' && (
          <View style={styles.equipTag}>
            <Ionicons name="barbell-outline" size={12} color={colors.textSecondary} style={styles.equipTagIcon} />
            <Text style={styles.equipTagText}>{exercise.equipment}</Text>
          </View>
        )}
      </View>

      {expanded && (
        <View style={styles.exExpanded}>
          <Text style={styles.exDescription}>{exercise.description}</Text>
          {exercise.modification && (
            <View style={styles.modRow}>
              <Ionicons name="accessibility-outline" size={14} color={Colors.accent} />
              <Text style={styles.modText}>{exercise.modification}</Text>
            </View>
          )}
          <View style={styles.calRow}>
            <Ionicons name="flame" size={14} color={Colors.warning} />
            <Text style={styles.calText}>~{exercise.estimatedCaloriesBurned * (exercise.sets ?? 1)} kcal</Text>
          </View>
          {/* Learn button */}
          <TouchableOpacity style={styles.learnBtn} onPress={onLearn}>
            <Ionicons name="book-outline" size={14} color={Colors.primary} />
            <Text style={styles.learnBtnText}>Learn proper form & biology →</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ════════════════════════════════════════════════════════════
// Week Stat Card
// ════════════════════════════════════════════════════════════

function WeekStatCard({ icon, color, value, label }: { icon: string; color: string; value: string; label: string }) {
  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.weekStatCard}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={[styles.weekStatValue, { color }]}>{value}</Text>
      <Text style={styles.weekStatLabel}>{label}</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: TAB_SCROLL_GUTTER,
    paddingTop: Spacing.lg,
  },
  loadingText: { color: colors.textSecondary, marginTop: Spacing.md, fontSize: 15 },

  // Header — matches Analytics / Profile tab rhythm
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
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface, borderRadius: BorderRadius.round,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  streakEmoji: { fontSize: 16 },
  streakText: { fontSize: 13, color: Colors.warning, fontWeight: '700' },
  // XP card (orangish gradient — text tuned for contrast)
  xpCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  levelName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  xpTotal: { fontSize: 13, color: '#FFFFFF', fontWeight: '700', opacity: 0.95 },
  xpTrack: { height: 8, backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4, backgroundColor: '#FFFFFF' },
  xpNext: { fontSize: 11, color: 'rgba(255,255,255,0.82)', marginTop: 5 },

  // Refresh banner
  refreshBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.warning + '20', borderRadius: BorderRadius.md,
    padding: Spacing.sm, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.warning + '50',
  },
  refreshBannerText: { flex: 1, fontSize: 13, color: colors.text },
  refreshBtn: {
    backgroundColor: Colors.warning + '30', borderRadius: BorderRadius.sm,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  refreshBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: Colors.warning },

  // Achievements strip
  badgesStrip: { marginBottom: Spacing.lg },
  badgeChip: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.warning + '15', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.warning + '40', marginRight: 8, minWidth: 64,
  },
  badgeChipLocked: { backgroundColor: colors.surface, borderColor: colors.border },
  badgeChipEmoji: { fontSize: 22 },
  badgeChipName: { fontSize: 10, fontWeight: '700', color: Colors.warning, marginTop: 3, textAlign: 'center' },

  // Week strip (7 equal columns)
  weekStripSection: { marginTop: Spacing.md, marginBottom: Spacing.lg },
  weekStripTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  weekStripTitleAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  weekStripLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  weekStripRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  weekDayTouchable: { flex: 1, minWidth: 0 },
  weekDayCell: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekDayCellSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.small,
  },
  weekDayCellToday: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  weekDayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  weekDayLabelSelected: { color: '#FFF' },
  weekDayLabelTraining: { color: colors.text },
  weekDayLabelRest: { color: colors.textTertiary },
  weekDayBar: {
    width: '100%',
    maxWidth: 28,
    height: 3,
    borderRadius: 2,
  },
  weekDayBarMuted: { opacity: 0.45 },

  // Day card
  dayCard: {
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.border,
    marginBottom: Spacing.md, overflow: 'hidden', ...Shadows.medium,
  },
  dayCardAccent: { height: 4, width: '100%' },
  dayCardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  dayCardCenter: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.md,
  },
  dayCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    paddingTop: 2,
  },
  dayCardDropdown: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  dayDropdownTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  dayCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCardTheme: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
  },
  todayTagPill: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.round,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  todayTagText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  dayCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 2,
  },
  dayCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  dayCardStatText: { fontSize: 13, color: colors.textSecondary },

  // Section
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge, fontWeight: '700',
    color: colors.text, marginBottom: Spacing.sm, marginTop: Spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: Spacing.sm, marginTop: Spacing.sm,
  },
  sectionTitleInline: {
    fontSize: Typography.sizes.bodyLarge, fontWeight: '700',
    color: colors.text,
  },

  weekGlanceSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    width: '100%',
  },
  weekGlanceTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: '700',
    color: colors.text,
    marginBottom: Spacing.lg,
  },

  // Exercise card
  exCard: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: Spacing.sm, padding: Spacing.md,
  },
  exCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  exIndex: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  exIndexText: { fontSize: 13, fontWeight: '800' },
  exMain: { flex: 1 },
  exName: { fontSize: 15, fontWeight: '700', color: colors.text },
  exMeta: { flexDirection: 'row', gap: 6, marginTop: 2 },
  exSetInfo: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  exRestInfo: { fontSize: 13, color: colors.textTertiary },
  exRight: { alignItems: 'flex-end' },
  diffBadge: { borderRadius: BorderRadius.round, paddingHorizontal: 8, paddingVertical: 2 },
  diffBadgeText: { fontSize: 11, fontWeight: '700' },
  muscleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: Spacing.sm },
  muscleTag: { borderRadius: BorderRadius.round, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  muscleTagText: { fontSize: 10, fontWeight: '600' },
  equipTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.border + '80', borderRadius: BorderRadius.round,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  equipTagIcon: { marginTop: 0 },
  equipTagText: { fontSize: 10, color: colors.textSecondary },
  exExpanded: {
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  exDescription: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  modRow: { flexDirection: 'row', gap: 5, alignItems: 'flex-start', marginTop: 8 },
  modText: { flex: 1, fontSize: 13, color: Colors.accent },
  calRow: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 6 },
  calText: { fontSize: 13, color: Colors.warning, fontWeight: '600' },
  learnBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  learnBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  // Start button
  startBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.glow,
  },
  startBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 14,
  },
  startBtnText: { fontSize: 17, fontWeight: '800', color: '#FFF' },

  // Rest day
  restCard: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md,
  },
  restIcon: { marginBottom: Spacing.sm },
  restTitle: { fontSize: Typography.sizes.subtitle, fontWeight: '700', color: colors.text, marginBottom: 8 },
  restBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  restOptional: { marginTop: Spacing.sm, fontSize: 13, color: Colors.primary, fontWeight: '600' },

  weekStats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  weekStatCard: {
    flex: 1,
    minHeight: 96,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    ...Shadows.small,
  },
  weekStatValue: { fontSize: 20, fontWeight: '800' },
  weekStatLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 16,
  },

  // History
  historyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border, padding: Spacing.md, marginBottom: Spacing.md,
  },
  historyText: { fontSize: 14, color: colors.textSecondary },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: Spacing.xxl },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 12 },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});

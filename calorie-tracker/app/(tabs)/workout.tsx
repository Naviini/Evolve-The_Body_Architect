/**
 * Workout Tab Screen — Enhanced with Rewards & Dynamic Updates
 *
 * Sections:
 *   XP progress bar · Achievement badges · Dynamic refresh banner
 *   Daily motivational nudge · Reasoning pill · Weekly day strip
 *   Day hero card · Exercise list (with Learn buttons) · Start CTA
 *   Week summary stats · History
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  getOnboardingProfile, getDailyLog, getWorkoutPlan, saveWorkoutPlan,
  getWorkoutHistory, getWorkoutStreak, getUserRewards, saveProfileHash,
} from '@/src/lib/database';
import { generateWeeklyPlan, getWeekStart } from '@/src/lib/workoutEngine';
import { hashProfile, getLevelForXP, getAllAchievementsForUser, LEVELS } from '@/src/lib/rewardEngine';
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

const DAILY_NUDGES = [
  { emoji: '💧', text: 'Start hydrated — drink a glass of water before your workout.' },
  { emoji: '🌡️', text: 'Warm up for 5 minutes first. Cold muscles tear, warm muscles grow.' },
  { emoji: '😴', text: 'Sleep is when you grow stronger. Aim for 7–9 hours tonight.' },
  { emoji: '🥗', text: 'Fuel your body well today — protein repairs the muscles you build.' },
  { emoji: '🧘', text: 'Consistency beats intensity. Show up, even on your off days.' },
  { emoji: '📈', text: 'Track your progress — you can\'t improve what you don\'t measure.' },
  { emoji: '🤝', text: 'Your body adapts to what you repeatedly do. Make it worth adapting to.' },
];

// ════════════════════════════════════════════════════════════
// Main Screen
// ════════════════════════════════════════════════════════════

export default function WorkoutScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
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
  const [nudgeIdx] = useState(() => new Date().getDate() % DAILY_NUDGES.length);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const xpBarAnim = useRef(new Animated.Value(0)).current;
  const refreshBannerAnim = useRef(new Animated.Value(0)).current;

  const animate = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  const animateXPBar = (lvlProgress: number) => {
    Animated.timing(xpBarAnim, {
      toValue: lvlProgress, duration: 800, useNativeDriver: false,
    }).start();
  };

  const loadData = useCallback(async () => {
    const uid = user?.id ?? 'demo-user';
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = getWeekStart(new Date());

      // 1. Load cached plan or generate fresh
      let cached = await getWorkoutPlan(uid, weekStart);
      if (!cached) {
        const profile = await getOnboardingProfile(uid);
        const todayLog = await getDailyLog(uid, today);
        const eatenCals = todayLog?.total_calories ?? 0;
        const deficit = (2000 - eatenCals) * 7;
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
      const profile = await getOnboardingProfile(uid).catch(() => null);
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
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(24);
      xpBarAnim.setValue(0);
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const uid = user?.id ?? 'demo-user';
    const profile = await getOnboardingProfile(uid).catch(() => null);
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
        <Text style={styles.loadingText}>Building your plan… 💪</Text>
      </View>
    );
  }

  const selectedDayData = plan?.days[selectedDay] ?? null;
  const unlockedIds = (rewards?.achievements ?? [])
    .filter((a: any) => a.unlockedAt).map((a: any) => a.id);
  const allAchievements = getAllAchievementsForUser(unlockedIds);
  const earnedAchievements = allAchievements.filter(a => a.unlockedAt);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSub}>Your Plan This Week</Text>
              <Text style={styles.headerTitle}>Workout 🏋️</Text>
            </View>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={styles.streakText}>{streak} day{streak !== 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>

          {/* ── XP Progress Bar ──────────────────────────────── */}
          {rewards && (
            <View style={styles.xpCard}>
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
            </View>
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
                <Text style={styles.refreshBtnText}>Refresh 🔄</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Daily Nudge ──────────────────────────────────── */}
          <View style={styles.nudgeCard}>
            <Text style={styles.nudgeEmoji}>{DAILY_NUDGES[nudgeIdx].emoji}</Text>
            <Text style={styles.nudgeText}>{DAILY_NUDGES[nudgeIdx].text}</Text>
          </View>

          {/* ── Achievements Row ─────────────────────────────── */}
          {earnedAchievements.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🏅 Achievements</Text>
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

          {/* ── Reasoning Pill ───────────────────────────────── */}
          {plan?.reasoning && (
            <View style={styles.reasoningPill}>
              <Ionicons name="sparkles" size={14} color={Colors.primary} />
              <Text style={styles.reasoningText} numberOfLines={2}>{plan.reasoning}</Text>
            </View>
          )}

          {/* ── Weekly Day Strip ─────────────────────────────── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayStrip}>
            {(plan?.days ?? []).map((day, i) => {
              const isToday = i === todayDayIndex();
              const isSelected = i === selectedDay;
              return (
                <TouchableOpacity key={i} onPress={() => setSelectedDay(i)} activeOpacity={0.7}>
                  <View style={[styles.dayChip, isSelected && styles.dayChipActive, isToday && !isSelected && styles.dayChipToday]}>
                    <Text style={[styles.dayChipLabel, isSelected && styles.dayChipLabelActive]}>{DAY_LABELS[i]}</Text>
                    <Text style={styles.dayChipEmoji}>{day.isRestDay ? '😴' : day.emoji}</Text>
                    {isToday && <View style={styles.todayDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ── Selected Day Card ──────────────────────────────── */}
        {selectedDayData && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <DayCard day={selectedDayData} isToday={selectedDay === todayDayIndex()} />

            {/* ── Exercise List (with Learn buttons) ─────────── */}
            {!selectedDayData.isRestDay && selectedDayData.exercises.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Exercises</Text>
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

                {/* ── Start CTA ─────────────────────────────── */}
                {selectedDay === todayDayIndex() && (
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
                      <Text style={styles.startBtnText}>Start Today's Workout</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ── Rest Day ───────────────────────────────────── */}
            {selectedDayData.isRestDay && (
              <View style={styles.restCard}>
                <Text style={styles.restEmoji}>🛌</Text>
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
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.sectionTitle}>This Week at a Glance</Text>
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

        {/* ── Locked Achievements Teaser ────────────────────── */}
        {allAchievements.filter(a => !a.unlockedAt).length > 0 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.sectionTitle}>🎯 Next Achievements</Text>
            <View style={styles.nextAchievementsCard}>
              {allAchievements.filter(a => !a.unlockedAt).slice(0, 3).map((a, i) => (
                <View key={a.id} style={[styles.nextAchRow, i < 2 && styles.rowBorder]}>
                  <View style={styles.lockedEmoji}><Text style={{ fontSize: 20, opacity: 0.4 }}>{a.emoji}</Text></View>
                  <View style={styles.nextAchText}>
                    <Text style={styles.nextAchName}>{a.name}</Text>
                    <Text style={styles.nextAchDesc}>{a.description}</Text>
                  </View>
                  <Ionicons name="lock-closed-outline" size={16} color={colors.textTertiary} />
                </View>
              ))}
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
            <Text style={{ fontSize: 48 }}>🏋️</Text>
            <Text style={styles.emptyTitle}>Complete Your Profile</Text>
            <Text style={styles.emptyBody}>Add your health details to get a personalised workout plan.</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// Day Card
// ════════════════════════════════════════════════════════════

function DayCard({ day, isToday }: { day: WorkoutDay; isToday: boolean }) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const catColor = day.isRestDay
    ? colors.textTertiary
    : (CATEGORY_COLOR[day.exercises[0]?.category ?? 'strength'] ?? Colors.primary);

  return (
    <LinearGradient
      colors={['#1E1E3F', '#13132B']}
      style={styles.dayCard}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      <View style={[styles.dayCardAccent, { backgroundColor: catColor }]} />
      <View style={styles.dayCardContent}>
        <Text style={styles.dayCardEmoji}>{day.emoji}</Text>
        <Text style={styles.dayCardTheme}>{day.theme}</Text>
        {isToday && <View style={styles.todayTagPill}><Text style={styles.todayTagText}>TODAY</Text></View>}
      </View>
      {!day.isRestDay && (
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
      )}
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
            <Text style={styles.equipTagText}>🏋️ {exercise.equipment}</Text>
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
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.weekStatCard}>
      <Ionicons name={icon as any} size={20} color={color} />
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
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: Spacing.md,
  },
  loadingText: { color: colors.textSecondary, marginTop: Spacing.md, fontSize: 15 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  headerSub: { fontSize: Typography.sizes.body, color: colors.textSecondary },
  headerTitle: { fontSize: Typography.sizes.heading, color: colors.text, fontWeight: Typography.weights.bold },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface, borderRadius: BorderRadius.round,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  streakEmoji: { fontSize: 16 },
  streakText: { fontSize: 13, color: Colors.warning, fontWeight: '700' },

  // XP card
  xpCard: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.primary + '40',
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  levelName: { fontSize: 14, fontWeight: '700', color: colors.text },
  xpTotal: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  xpTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary },
  xpNext: { fontSize: 11, color: colors.textTertiary, marginTop: 5 },

  // Refresh banner
  refreshBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.warning + '20', borderRadius: BorderRadius.md,
    padding: Spacing.sm, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.warning + '50',
  },
  refreshBannerText: { flex: 1, fontSize: 13, color: colors.text },
  refreshBtn: {
    backgroundColor: Colors.warning + '30', borderRadius: BorderRadius.sm,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: Colors.warning },

  // Daily nudge
  nudgeCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.sm, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  nudgeEmoji: { fontSize: 20 },
  nudgeText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18, paddingTop: 2 },

  // Achievements strip
  badgesStrip: { marginBottom: Spacing.md },
  badgeChip: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.warning + '15', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.warning + '40', marginRight: 8, minWidth: 64,
  },
  badgeChipLocked: { backgroundColor: colors.surface, borderColor: colors.border },
  badgeChipEmoji: { fontSize: 22 },
  badgeChipName: { fontSize: 10, fontWeight: '700', color: Colors.warning, marginTop: 3, textAlign: 'center' },

  // Reasoning
  reasoningPill: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '40',
    marginBottom: Spacing.md,
  },
  reasoningText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // Day strip
  dayStrip: { marginBottom: Spacing.md },
  dayChip: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.md, marginRight: 8,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, minWidth: 52,
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipToday: { borderColor: Colors.primary + '80' },
  dayChipLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  dayChipLabelActive: { color: '#FFF' },
  dayChipEmoji: { fontSize: 16, marginTop: 2 },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 3 },

  // Day card
  dayCard: {
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.border,
    marginBottom: Spacing.md, overflow: 'hidden', ...Shadows.medium,
  },
  dayCardAccent: { height: 4, width: '100%' },
  dayCardContent: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  dayCardEmoji: { fontSize: 28 },
  dayCardTheme: { flex: 1, fontSize: Typography.sizes.subtitle, fontWeight: '700', color: colors.text },
  todayTagPill: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.round,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  todayTagText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  dayCardStats: { flexDirection: 'row', gap: Spacing.lg, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  dayCardStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayCardStatText: { fontSize: 13, color: colors.textSecondary },

  // Section
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge, fontWeight: '700',
    color: colors.text, marginBottom: Spacing.sm, marginTop: Spacing.sm,
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
    backgroundColor: colors.border + '80', borderRadius: BorderRadius.round,
    paddingHorizontal: 8, paddingVertical: 2,
  },
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
  startBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.md, marginBottom: Spacing.md, ...Shadows.glow },
  startBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  startBtnText: { fontSize: 17, fontWeight: '800', color: '#FFF' },

  // Rest day
  restCard: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md,
  },
  restEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  restTitle: { fontSize: Typography.sizes.subtitle, fontWeight: '700', color: colors.text, marginBottom: 8 },
  restBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  restOptional: { marginTop: Spacing.sm, fontSize: 13, color: Colors.primary, fontWeight: '600' },

  // Week stats
  weekStats: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  weekStatCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border, padding: Spacing.md, alignItems: 'center', gap: 4,
  },
  weekStatValue: { fontSize: Typography.sizes.subtitle, fontWeight: '800' },
  weekStatLabel: { fontSize: 11, color: colors.textTertiary, textAlign: 'center' },

  // Next achievements
  nextAchievementsCard: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: Spacing.md, overflow: 'hidden',
  },
  nextAchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  lockedEmoji: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  nextAchText: { flex: 1 },
  nextAchName: { fontSize: 14, fontWeight: '700', color: colors.text },
  nextAchDesc: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },

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

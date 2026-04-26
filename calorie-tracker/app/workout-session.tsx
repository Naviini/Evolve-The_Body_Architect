/**
 * Workout Session Screen — Fully Coached Experience
 *
 * Phases per exercise:
 *   tutorial → active (auto rep timer + coaching) → rest → next
 *
 * Features:
 * - Quick form phase briefing before each exercise
 * - Auto-count rep timer with pulsing animation
 * - Rotating coaching cues every 5s
 * - Breathing rhythm indicator
 * - Rest timer with motivational quote + next exercise preview
 * - XP calculation + badge unlocking on finish
 * - Epic summary screen with XP breakdown
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Platform, Alert, Easing,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  saveWorkoutSession, getUserRewards, addXP, unlockAchievement,
  getWorkoutStreak, getWorkoutHistory,
} from '@/src/lib/database';
import {
  calculateSessionXP, checkNewAchievements, getAchievement, getLevelForXP,
} from '@/src/lib/rewardEngine';
import { getTutorial, getCoachingCue, MOTIVATIONAL_QUOTES } from '@/src/lib/exerciseTutorials';
import { WorkoutDay, WorkoutExercise, ExerciseLog, WorkoutSession } from '@/src/types';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

type SessionPhase = 'briefing' | 'active' | 'rest' | 'summary';

interface SetState {
  currentSet: number;
  currentRep: number;
  totalSets: number;
}

// ════════════════════════════════════════════════════════════
// Screen
// ════════════════════════════════════════════════════════════

export default function WorkoutSessionScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ dayJson?: string; planId?: string }>();

  // Core state
  const [day, setDay] = useState<WorkoutDay | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<SessionPhase>('briefing');
  const [setState, setSetState] = useState<SetState>({ currentSet: 1, currentRep: 0, totalSets: 1 });
  const [restSeconds, setRestSeconds] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [totalCalories, setTotalCalories] = useState(0);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [skipTutorials, setSkipTutorials] = useState(false);
  const [startTime] = useState(new Date().toISOString());
  const [saving, setSaving] = useState(false);

  // XP / rewards state (summary)
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<{ label: string; xp: number }[]>([]);
  const [newBadges, setNewBadges] = useState<{ emoji: string; name: string }[]>([]);
  const [levelInfo, setLevelInfo] = useState({ level: 1, name: 'Beginner 🌱', xpToNext: 200, totalXP: 0 });

  // Coaching
  const [coachingCueIdx, setCoachingCueIdx] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'in' | 'out'>('in');
  const [quoteIdx] = useState(() => Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length));

  // Timers
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cueRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const repPulseAnim = useRef(new Animated.Value(1)).current;
  const breathAnim = useRef(new Animated.Value(0.9)).current;
  const cueSlideAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const restCircleAnim = useRef(new Animated.Value(1)).current;

  // Parse day
  useEffect(() => {
    try {
      if (params.dayJson) {
        const d = JSON.parse(params.dayJson) as WorkoutDay;
        setDay(d);
        setSetState({ currentSet: 1, currentRep: 0, totalSets: d.exercises[0]?.sets ?? 1 });
      }
    } catch { }
  }, [params.dayJson]);

  // Elapsed timer
  useEffect(() => {
    elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, []);

  // Progress bar animation
  useEffect(() => {
    if (!day) return;
    Animated.timing(progressAnim, {
      toValue: currentIdx / Math.max(day.exercises.length, 1),
      duration: 500, useNativeDriver: false,
    }).start();
  }, [currentIdx, day]);

  // Coaching cue rotation (during active phase)
  useEffect(() => {
    if (phase !== 'active') { if (cueRef.current) clearInterval(cueRef.current); return; }
    cueRef.current = setInterval(() => {
      // slide out old cue, update, slide in new
      Animated.timing(cueSlideAnim, { toValue: -20, duration: 200, useNativeDriver: true }).start(() => {
        setCoachingCueIdx(i => i + 1);
        cueSlideAnim.setValue(20);
        Animated.timing(cueSlideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => { if (cueRef.current) clearInterval(cueRef.current); };
  }, [phase]);

  // Breathing animation (active + rest phases)
  useEffect(() => {
    if (phase === 'summary' || phase === 'briefing') {
      if (breathRef.current) clearInterval(breathRef.current);
      return;
    }
    const runBreath = () => {
      Animated.timing(breathAnim, { toValue: 1.12, duration: 3500, useNativeDriver: true }).start(() => {
        setBreathPhase('out');
        Animated.timing(breathAnim, { toValue: 0.9, duration: 3500, useNativeDriver: true }).start(() => {
          setBreathPhase('in');
          runBreath();
        });
      });
    };
    runBreath();
    return () => breathAnim.stopAnimation();
  }, [phase]);

  // Rep pulse animation (active phase)
  useEffect(() => {
    if (phase !== 'active') { repPulseAnim.setValue(1); return; }
    let running = true;
    const doPulse = () => {
      if (!running) return;
      Animated.sequence([
        Animated.timing(repPulseAnim, { toValue: 1.18, duration: 300, useNativeDriver: true }),
        Animated.timing(repPulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => { if (running) setTimeout(doPulse, 1200); });
    };
    doPulse();
    return () => { running = false; };
  }, [phase]);

  // Rest countdown
  useEffect(() => {
    if (phase !== 'rest') { if (restRef.current) clearInterval(restRef.current); return; }
    // Animate rest circle
    Animated.timing(restCircleAnim, { toValue: 0, duration: restSeconds * 1000, useNativeDriver: false }).start();
    restRef.current = setInterval(() => {
      setRestSeconds(s => {
        if (s <= 1) {
          clearInterval(restRef.current!);
          advanceToNextExercise();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, [phase]);

  const currentExercise: WorkoutExercise | null = day?.exercises[currentIdx] ?? null;
  const tutorial = currentExercise ? getTutorial(currentExercise.id) : null;

  const formatSecs = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Advance to next exercise after rest ───────────────────
  const advanceToNextExercise = () => {
    if (!day) return;
    const nextIdx = currentIdx + 1;
    if (nextIdx >= day.exercises.length) {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      setPhase('summary');
    } else {
      setCurrentIdx(nextIdx);
      setSetState({ currentSet: 1, currentRep: 0, totalSets: day.exercises[nextIdx]?.sets ?? 1 });
      setPhase(skipTutorials ? 'active' : 'briefing');
    }
  };

  // ── Complete a set ────────────────────────────────────────
  const completeSet = () => {
    if (!currentExercise) return;
    const { currentSet, totalSets } = setState;

    if (currentSet < totalSets) {
      // more sets to go — short intra-set rest (half the restSec)
      const intraRest = Math.floor(currentExercise.restSec / 2);
      setSetState(prev => ({ ...prev, currentSet: prev.currentSet + 1 }));
      setRestSeconds(intraRest);
      restCircleAnim.setValue(1);
      setPhase('rest');
    } else {
      // All sets done — log this exercise
      const burnedCals = currentExercise.estimatedCaloriesBurned * totalSets;
      setTotalCalories(tc => tc + burnedCals);
      const effort = 3 as const; // default effort — summoned by effort buttons at end

      const log: ExerciseLog = {
        exerciseId: currentExercise.id,
        exerciseName: currentExercise.name,
        setsCompleted: totalSets,
        repsPerSet: currentExercise.reps,
        durationSec: currentExercise.durationSec,
        wasSkipped: false,
        effort: 3,
      };
      setLogs(prev => [...prev, log]);

      // inter-exercise rest
      const isLast = currentIdx >= (day?.exercises.length ?? 1) - 1;
      if (isLast) {
        if (elapsedRef.current) clearInterval(elapsedRef.current);
        setPhase('summary');
      } else {
        setRestSeconds(currentExercise.restSec);
        restCircleAnim.setValue(1);
        setPhase('rest');
      }
    }
  };

  // ── Skip exercise ─────────────────────────────────────────
  const skipExercise = () => {
    if (!currentExercise) return;
    setLogs(prev => [...prev, {
      exerciseId: currentExercise.id,
      exerciseName: currentExercise.name,
      setsCompleted: 0, wasSkipped: true, effort: 1,
    }]);
    const isLast = currentIdx >= (day?.exercises.length ?? 1) - 1;
    if (isLast) {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      setPhase('summary');
    } else {
      setCurrentIdx(i => i + 1);
      setSetState({ currentSet: 1, currentRep: 0, totalSets: day!.exercises[currentIdx + 1]?.sets ?? 1 });
      setPhase(skipTutorials ? 'active' : 'briefing');
    }
  };

  // ── Save session & compute rewards ────────────────────────
  const finishSession = useCallback(async () => {
    setSaving(true);
    const uid = user?.id ?? 'demo-user';
    const completed = logs.filter(l => !l.wasSkipped).length;
    const skipped = logs.filter(l => l.wasSkipped).length;

    try {
      // 1. Save session
      const session: WorkoutSession = {
        userId: uid,
        planId: params.planId || undefined,
        dayDate: new Date().toISOString().split('T')[0],
        startedAt: startTime,
        completedAt: new Date().toISOString(),
        exerciseLogs: logs,
        totalCaloriesBurned: Math.round(totalCalories),
      };
      await saveWorkoutSession(session);

      // 2. Compute XP
      const streak = await getWorkoutStreak(uid).catch(() => 0);
      const history = await getWorkoutHistory(uid, 2).catch(() => []);
      const isFirst = history.length <= 1;

      const allEfforts = logs.filter(l => !l.wasSkipped).map(l => l.effort);
      const xpResult = calculateSessionXP({
        exercisesCompleted: completed,
        exercisesSkipped: skipped,
        totalExercises: day?.exercises.length ?? 0,
        isFirstWorkout: isFirst,
        streak,
        startedAt: startTime,
        allEfforts,
      });
      setXpEarned(xpResult.total);
      setXpBreakdown(xpResult.breakdown);

      // 3. Write XP to DB
      const categories = [...new Set(day?.exercises.map(e => e.category) ?? [])];
      await addXP(uid, xpResult.total, {
        exercisesCompleted: completed,
        caloriesBurned: Math.round(totalCalories),
        categories,
      });

      // 4. Check achievements
      const existingRewards = await getUserRewards(uid).catch(() => null);
      const existingIds = (existingRewards?.achievements ?? [])
        .filter((a: any) => a.unlockedAt)
        .map((a: any) => a.id);
      const newTotalXP = (existingRewards?.totalXP ?? 0) + xpResult.total;
      const newIds = checkNewAchievements({
        isFirstWorkout: isFirst,
        streak,
        totalWorkouts: (existingRewards?.totalWorkoutsCompleted ?? 0) + 1,
        totalExercises: (existingRewards?.totalExercisesCompleted ?? 0) + completed,
        totalCaloriesBurned: (existingRewards?.totalCaloriesBurned ?? 0) + Math.round(totalCalories),
        newTotalXP,
        exercisesSkippedInSession: skipped,
        allEffortsInSession: allEfforts,
        startedAt: startTime,
        categoriesCompleted: categories,
        existingAchievementIds: existingIds,
      });
      for (const id of newIds) {
        await unlockAchievement(uid, id).catch(() => {});
      }
      setNewBadges(newIds.map(id => {
        const a = getAchievement(id);
        return { emoji: a.emoji, name: a.name };
      }));

      // 5. Level info for summary
      const lvl = getLevelForXP(newTotalXP);
      setLevelInfo({ level: lvl.level, name: lvl.name, xpToNext: lvl.xpToNext, totalXP: newTotalXP });

      // 6. Animate badges in
      if (newIds.length > 0) {
        Animated.spring(badgeAnim, { toValue: 1, useNativeDriver: true }).start();
      }
    } catch (e) {
      console.error('Session save error:', e);
    }
    setSaving(false);
  }, [logs, totalCalories, day, startTime, user?.id, params.planId]);

  // Auto-compute rewards when phase becomes summary
  useEffect(() => {
    if (phase === 'summary') finishSession();
  }, [phase]);

  // ════════════════════════════════════════════════════════════
  // Empty state
  // ════════════════════════════════════════════════════════════
  if (!day) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Loading workout…</Text>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ── SUMMARY PHASE ──────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  if (phase === 'summary') {
    const completed = logs.filter(l => !l.wasSkipped).length;
    const skipped = logs.filter(l => l.wasSkipped).length;
    const lvlThreshold = [0, 200, 500, 1000, 2000, 4000][Math.min(levelInfo.level - 1, 5)];
    const nextThreshold = [200, 500, 1000, 2000, 4000, 99999][Math.min(levelInfo.level - 1, 5)];
    const lvlProgress = (levelInfo.totalXP - lvlThreshold) / Math.max(nextThreshold - lvlThreshold, 1);

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4A42DB', '#00B4D8']}
          style={styles.summaryHero}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={styles.summaryBigEmoji}>🏆</Text>
          <Text style={styles.summaryTitle}>Workout Complete!</Text>
          <Text style={styles.summaryXP}>+{xpEarned} XP</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: Spacing.md }}>
          {/* Stats row */}
          <View style={styles.summaryRow}>
            <SummaryStat emoji="⏱️" label="Duration" value={formatSecs(elapsedSec)} />
            <SummaryStat emoji="🔥" label="Calories" value={`${Math.round(totalCalories)} kcal`} />
            <SummaryStat emoji="✅" label="Done" value={`${completed}/${day.exercises.length}`} />
          </View>

          {/* Level bar */}
          <View style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <Text style={styles.levelName}>{levelInfo.name}</Text>
              <Text style={styles.levelXP}>{levelInfo.totalXP} XP total</Text>
            </View>
            <View style={styles.levelTrack}>
              <Animated.View style={[styles.levelFill, { width: `${Math.min(lvlProgress * 100, 100)}%` }]} />
            </View>
            {levelInfo.xpToNext > 0 && (
              <Text style={styles.levelNext}>{levelInfo.xpToNext} XP to next level</Text>
            )}
          </View>

          {/* XP breakdown */}
          <Text style={styles.breakdownTitle}>XP Breakdown</Text>
          <View style={styles.card}>
            {xpBreakdown.map((b, i) => (
              <View key={i} style={[styles.breakdownRow, i < xpBreakdown.length - 1 && styles.rowBorder]}>
                <Text style={styles.breakdownLabel}>{b.label}</Text>
                <Text style={styles.breakdownXP}>+{b.xp} XP</Text>
              </View>
            ))}
            {xpBreakdown.length === 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Keep going to earn XP! 💪</Text>
                <Text style={styles.breakdownXP}>+0 XP</Text>
              </View>
            )}
          </View>

          {/* New badges */}
          {newBadges.length > 0 && (
            <>
              <Text style={styles.badgesTitle}>🎖️ Badges Unlocked!</Text>
              <View style={styles.badgesRow}>
                {newBadges.map((b, i) => (
                  <Animated.View
                    key={i}
                    style={[styles.badgeCard, {
                      transform: [{ scale: badgeAnim }],
                      opacity: badgeAnim,
                    }]}
                  >
                    <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                    <Text style={styles.badgeName}>{b.name}</Text>
                  </Animated.View>
                ))}
              </View>
            </>
          )}

          {skipped > 0 && (
            <Text style={styles.skippedNote}>{skipped} exercise{skipped !== 1 ? 's' : ''} skipped</Text>
          )}

          {/* Done button */}
          <TouchableOpacity
            style={[styles.doneCta, saving && { opacity: 0.5 }]}
            onPress={() => router.replace('/(tabs)/workout')}
            disabled={saving}
          >
            <LinearGradient
              colors={['#6C63FF', '#00D2FF']}
              style={styles.doneCtaGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.doneCtaText}>{saving ? 'Saving…' : 'Back to Workouts 🏠'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ── REST PHASE ─────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  if (phase === 'rest') {
    const quote = MOTIVATIONAL_QUOTES[quoteIdx];
    const nextEx = day.exercises[currentIdx + 1];

    return (
      <View style={[styles.container, { justifyContent: 'space-between' }]}>
        <LinearGradient
          colors={['#13132B', '#0A0A1A']}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}
        >
          <Text style={styles.restTitle}>Rest & Recover 😤</Text>

          {/* Animated circle countdown */}
          <View style={styles.restCircleOuter}>
            <View style={styles.restCircleTrack}>
              <Animated.View style={[styles.restCircleArc, {
                borderTopColor: restCircleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [colors.border, Colors.primary],
                }),
              }]} />
            </View>
            <View style={styles.restCircleCenter}>
              <Text style={styles.restTimer}>{formatSecs(restSeconds)}</Text>
              <Text style={styles.restTimerLabel}>rest</Text>
            </View>
          </View>

          {/* Motivational quote */}
          <View style={styles.quoteBox}>
            <Text style={styles.quoteText}>"{quote.quote}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </View>

          {/* Next exercise preview */}
          {nextEx && (
            <View style={styles.nextExPreview}>
              <Text style={styles.nextExLabel}>Up next</Text>
              <Text style={styles.nextExName}>{nextEx.name}</Text>
              <Text style={styles.nextExInfo}>
                {nextEx.sets ? `${nextEx.sets}×${nextEx.reps} reps` : nextEx.durationSec ? `${Math.round(nextEx.durationSec / 60)} min` : ''}
              </Text>
            </View>
          )}

          {/* Breathing indicator */}
          <Animated.View style={[styles.restBreath, { transform: [{ scale: breathAnim }] }]}>
            <Text style={styles.restBreathText}>{breathPhase === 'in' ? '🌬️ Breathe In' : '💨 Breathe Out'}</Text>
          </Animated.View>

          <TouchableOpacity
            style={styles.skipRestBtn}
            onPress={() => {
              if (restRef.current) clearInterval(restRef.current);
              advanceToNextExercise();
            }}
          >
            <Text style={styles.skipRestText}>Skip Rest →</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ── BRIEFING PHASE (Quick form reminder before exercise) ───
  // ════════════════════════════════════════════════════════════
  if (phase === 'briefing' && currentExercise) {
    const tut = tutorial;
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.sessionHeader}>
          <TouchableOpacity onPress={() => Alert.alert('Quit Workout?', 'Progress will be lost.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Quit', style: 'destructive', onPress: () => router.back() },
          ])} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{day.theme}</Text>
            <Text style={styles.headerSub}>Exercise {currentIdx + 1} of {day.exercises.length}</Text>
          </View>
          <Text style={styles.elapsed}>{formatSecs(elapsedSec)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }]} />
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }}>
          {/* Exercise name */}
          <LinearGradient
            colors={['#2A1A60', '#0A0A1A']}
            style={styles.briefingHero}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={styles.briefingName}>{currentExercise.name}</Text>
            <Text style={styles.briefingMuscles}>{currentExercise.muscleGroups.join(' · ')}</Text>
            <View style={styles.briefingStats}>
              {currentExercise.sets && (
                <View style={styles.briefingStat}>
                  <Text style={styles.briefingStatVal}>{currentExercise.sets}</Text>
                  <Text style={styles.briefingStatLbl}>Sets</Text>
                </View>
              )}
              {currentExercise.reps && (
                <View style={styles.briefingStat}>
                  <Text style={styles.briefingStatVal}>{currentExercise.reps}</Text>
                  <Text style={styles.briefingStatLbl}>Reps</Text>
                </View>
              )}
              {currentExercise.durationSec && (
                <View style={styles.briefingStat}>
                  <Text style={styles.briefingStatVal}>{Math.round(currentExercise.durationSec / 60)}</Text>
                  <Text style={styles.briefingStatLbl}>Min</Text>
                </View>
              )}
              <View style={styles.briefingStat}>
                <Text style={styles.briefingStatVal}>{currentExercise.restSec}s</Text>
                <Text style={styles.briefingStatLbl}>Rest</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Quick form phases */}
          {tut && (
            <>
              <Text style={styles.briefingSubtitle}>⚡ Quick Form Reminder</Text>
              {tut.phases.map((p, i) => (
                <View key={i} style={styles.quickPhaseRow}>
                  <View style={styles.quickPhaseNum}><Text style={styles.quickPhaseNumText}>{i + 1}</Text></View>
                  <Text style={styles.quickPhaseEmoji}>{p.emoji}</Text>
                  <View style={styles.quickPhaseContent}>
                    <Text style={styles.quickPhaseLabel}>{p.label}</Text>
                    <Text style={styles.quickPhaseCue}>{p.cue}</Text>
                  </View>
                </View>
              ))}

              {/* Key safety tip */}
              {tut.safetyTips.length > 0 && (
                <View style={styles.safetyBanner}>
                  <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
                  <Text style={styles.safetyBannerText}>{tut.safetyTips[0]}</Text>
                </View>
              )}

              {/* Breathing reminder */}
              <View style={styles.breathInfo}>
                <Ionicons name="fitness-outline" size={14} color={Colors.accent} />
                <Text style={styles.breathInfoText}>{tut.breathingCue}</Text>
              </View>
            </>
          )}

          {!tut && (
            <View style={styles.noTutCard}>
              <Text style={styles.noTutText}>{currentExercise.description}</Text>
              {currentExercise.modification && (
                <Text style={styles.noTutMod}>💡 {currentExercise.modification}</Text>
              )}
            </View>
          )}

          {/* Learn more link */}
          <TouchableOpacity
            style={styles.learnMoreBtn}
            onPress={() => router.push({
              pathname: '/exercise-tutorial',
              params: { exerciseId: currentExercise.id, exerciseName: currentExercise.name },
            } as any)}
          >
            <Ionicons name="book-outline" size={16} color={Colors.primary} />
            <Text style={styles.learnMoreText}>Full Tutorial & Biology</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomCta}>
          <TouchableOpacity style={styles.skipExBtn} onPress={skipExercise}>
            <Text style={styles.skipExText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.startExBtn}
            onPress={() => setPhase('active')}
          >
            <LinearGradient
              colors={['#6C63FF', '#00D2FF']}
              style={styles.startExBtnGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Ionicons name="play" size={20} color="#FFF" />
              <Text style={styles.startExBtnText}>Start Exercise</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ── ACTIVE PHASE ───────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  if (phase === 'active' && currentExercise) {
    const { currentSet, totalSets } = setState;
    const targetReps = currentExercise.reps ?? 0;
    const isDuration = !!currentExercise.durationSec;
    const cue = getCoachingCue(currentExercise.id, coachingCueIdx);

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.sessionHeader}>
          <TouchableOpacity onPress={() => setPhase('briefing')} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{currentExercise.name}</Text>
            <Text style={styles.headerSub}>Set {currentSet} of {totalSets}</Text>
          </View>
          <Text style={styles.elapsed}>{formatSecs(elapsedSec)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }]} />
        </View>

        {/* Set dots */}
        <View style={styles.setDots}>
          {Array.from({ length: totalSets }).map((_, i) => (
            <View key={i} style={[styles.setDot, i < currentSet && styles.setDotDone]} />
          ))}
        </View>

        {/* Main rep/duration display */}
        <View style={styles.activeCenter}>
          <Animated.View style={{ transform: [{ scale: repPulseAnim }] }}>
            {isDuration ? (
              <View style={styles.durationCircle}>
                <LinearGradient colors={['#6C63FF', '#00D2FF']} style={styles.durationCircleInner}>
                  <Text style={styles.durationText}>{Math.round((currentExercise.durationSec ?? 0) / 60)}</Text>
                  <Text style={styles.durationUnit}>min</Text>
                </LinearGradient>
              </View>
            ) : (
              <View style={styles.repDisplay}>
                <Text style={styles.repNumbers}>{targetReps}</Text>
                <Text style={styles.repLabel}>reps to complete</Text>
              </View>
            )}
          </Animated.View>

          {/* Coaching cue */}
          <Animated.View style={[styles.cueBox, {
            opacity: cueSlideAnim.interpolate({ inputRange: [-20, 0, 20], outputRange: [0, 1, 0] }),
            transform: [{ translateY: cueSlideAnim }],
          }]}>
            <Text style={styles.cueText}>{cue}</Text>
          </Animated.View>

          {/* Breathing indicator */}
          <Animated.View style={[styles.breathDot, { transform: [{ scale: breathAnim }] }]}>
            <Text style={styles.breathDotText}>{breathPhase === 'in' ? '🌬️ In' : '💨 Out'}</Text>
          </Animated.View>
        </View>

        {/* Bottom area */}
        <View style={styles.activeBottom}>
          <TouchableOpacity style={styles.skipExBtn} onPress={skipExercise}>
            <Text style={styles.skipExText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneSetBtn} onPress={completeSet}>
            <LinearGradient
              colors={['#00E676', '#00D2FF']}
              style={styles.doneSetBtnGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Ionicons name="checkmark" size={22} color="#FFF" />
              <Text style={styles.doneSetBtnText}>
                {currentSet < totalSets ? `Done — Set ${currentSet}/${totalSets}` : 'All Sets Done! ✓'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

// ════════════════════════════════════════════════════════════
// Summary Stat card
// ════════════════════════════════════════════════════════════
function SummaryStat({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.summaryStatCard}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={styles.summaryStatVal}>{value}</Text>
      <Text style={styles.summaryStatLbl}>{label}</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════
const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Shared Header
  sessionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
  },
  closeBtn: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 11, color: colors.textSecondary },
  elapsed: { fontSize: 13, color: Colors.primary, fontWeight: '700', minWidth: 48, textAlign: 'right' },

  progressTrack: { height: 3, backgroundColor: colors.border },
  progressFill: { height: '100%', backgroundColor: Colors.primary },

  // ── Briefing ──
  briefingHero: {
    borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  briefingName: { fontSize: Typography.sizes.heading, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  briefingMuscles: { fontSize: 13, color: Colors.primary, marginTop: 4 },
  briefingStats: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.md },
  briefingStat: { alignItems: 'center' },
  briefingStatVal: { fontSize: Typography.sizes.subtitle, fontWeight: '800', color: '#FFF' },
  briefingStatLbl: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  briefingSubtitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: Spacing.sm, marginTop: Spacing.sm },

  quickPhaseRow: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  quickPhaseNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary + '25', justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  quickPhaseNumText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  quickPhaseEmoji: { fontSize: 18, marginTop: 2 },
  quickPhaseContent: { flex: 1 },
  quickPhaseLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  quickPhaseCue: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },

  safetyBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: Colors.success + '15', borderRadius: BorderRadius.sm,
    padding: Spacing.sm, marginTop: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.success,
  },
  safetyBannerText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  breathInfo: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    backgroundColor: Colors.accent + '10', borderRadius: BorderRadius.sm,
    padding: Spacing.sm, marginTop: Spacing.sm,
  },
  breathInfoText: { fontSize: 13, color: Colors.accent },

  noTutCard: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  noTutText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  noTutMod: { fontSize: 13, color: Colors.accent, marginTop: 8 },

  learnMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
    paddingVertical: Spacing.sm, marginTop: 2,
  },
  learnMoreText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  // Bottom CTAs
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  skipExBtn: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center',
  },
  skipExText: { color: colors.textTertiary, fontSize: 14 },
  startExBtn: { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden' },
  startExBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  startExBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  // ── Active ──
  setDots: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingVertical: Spacing.sm,
  },
  setDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.border,
  },
  setDotDone: { backgroundColor: Colors.primary },

  activeCenter: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.md,
  },
  repDisplay: { alignItems: 'center' },
  repNumbers: { fontSize: 96, fontWeight: '900', color: colors.text, lineHeight: 100 },
  repLabel: { fontSize: 16, color: colors.textSecondary, fontWeight: '600' },

  durationCircle: { width: 160, height: 160, borderRadius: 80 },
  durationCircleInner: {
    width: '100%', height: '100%', borderRadius: 80,
    justifyContent: 'center', alignItems: 'center',
  },
  durationText: { fontSize: 56, fontWeight: '900', color: '#FFF' },
  durationUnit: { fontSize: 16, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  cueBox: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.primary + '40',
    padding: Spacing.md, marginTop: Spacing.xl, maxWidth: 300,
  },
  cueText: { fontSize: 15, color: colors.text, textAlign: 'center', fontWeight: '600', lineHeight: 21 },

  breathDot: {
    marginTop: Spacing.lg, backgroundColor: colors.border + '60',
    borderRadius: BorderRadius.round, paddingHorizontal: 16, paddingVertical: 6,
  },
  breathDotText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

  activeBottom: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  doneSetBtn: { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden', ...Shadows.glow },
  doneSetBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  doneSetBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },

  // ── Rest ──
  restTitle: { fontSize: Typography.sizes.subtitle, fontWeight: '800', color: colors.text, marginBottom: Spacing.lg },
  restCircleOuter: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  restCircleTrack: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 8, borderColor: colors.border,
  },
  restCircleArc: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 8, borderColor: Colors.primary,
    borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent',
  },
  restCircleCenter: { alignItems: 'center' },
  restTimer: { fontSize: 48, fontWeight: '900', color: Colors.primary },
  restTimerLabel: { fontSize: 13, color: colors.textSecondary },
  quoteBox: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: Spacing.md, width: '100%', marginBottom: Spacing.md,
  },
  quoteText: { fontSize: 14, color: colors.text, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
  quoteAuthor: { fontSize: 12, color: colors.textTertiary, textAlign: 'right', marginTop: 6 },
  nextExPreview: {
    backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.md,
    padding: Spacing.md, width: '100%', alignItems: 'center', marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  nextExLabel: { fontSize: 11, color: Colors.primary, fontWeight: '700', marginBottom: 4 },
  nextExName: { fontSize: 17, fontWeight: '700', color: colors.text },
  nextExInfo: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  restBreath: {
    backgroundColor: colors.border + '40', borderRadius: BorderRadius.round,
    paddingHorizontal: 20, paddingVertical: 8, marginBottom: Spacing.lg,
  },
  restBreathText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  skipRestBtn: {
    borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
  },
  skipRestText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },

  // ── Summary ──
  summaryHero: {
    paddingTop: Platform.OS === 'ios' ? 70 : 54,
    paddingBottom: Spacing.xl, alignItems: 'center',
  },
  summaryBigEmoji: { fontSize: 64 },
  summaryTitle: { fontSize: Typography.sizes.heading, fontWeight: '900', color: '#FFF', marginTop: 8 },
  summaryXP: {
    fontSize: Typography.sizes.subtitle, fontWeight: '700',
    color: 'rgba(255,255,255,0.9)', marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.round,
    paddingHorizontal: 16, paddingVertical: 4,
  },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  summaryStatCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border, padding: Spacing.md,
    alignItems: 'center', gap: 4,
  },
  summaryStatVal: { fontSize: 16, fontWeight: '800', color: colors.text },
  summaryStatLbl: { fontSize: 11, color: colors.textTertiary },

  // Level
  levelCard: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border, padding: Spacing.md, marginBottom: Spacing.md,
  },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  levelName: { fontSize: 15, fontWeight: '700', color: colors.text },
  levelXP: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  levelTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  levelFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  levelNext: { fontSize: 11, color: colors.textTertiary, marginTop: 6 },

  // XP Breakdown
  breakdownTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: Spacing.sm },
  card: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: Spacing.md, overflow: 'hidden',
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md },
  breakdownLabel: { fontSize: 14, color: colors.textSecondary },
  breakdownXP: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },

  // Badges
  badgesTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: Spacing.sm },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  badgeCard: {
    backgroundColor: Colors.warning + '20', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.warning + '50',
    padding: Spacing.sm, alignItems: 'center', minWidth: 80,
  },
  badgeEmoji: { fontSize: 28 },
  badgeName: { fontSize: 11, fontWeight: '700', color: Colors.warning, marginTop: 4, textAlign: 'center' },

  skippedNote: { fontSize: 13, color: Colors.warning, textAlign: 'center', marginBottom: Spacing.md },
  doneCta: { borderRadius: BorderRadius.md, overflow: 'hidden', ...Shadows.glow },
  doneCtaGradient: { paddingVertical: 16, alignItems: 'center' },
  doneCtaText: { fontSize: 17, fontWeight: '800', color: '#FFF' },
});

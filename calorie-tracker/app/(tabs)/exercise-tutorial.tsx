/**
 * Exercise Tutorial Screen
 *
 * Full guided tutorial for a single exercise:
 * form phases, safety tips, common mistakes,
 * breathing guide, and optional biology section.
 *
 * Access via: router.push('/exercise-tutorial?exerciseId=push-up')
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Platform, LayoutAnimation, UIManager,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';
import { getTutorial } from '@/src/lib/exerciseTutorials';
import { ExerciseTutorial } from '@/src/types';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ════════════════════════════════════════════════════════════
// Screen
// ════════════════════════════════════════════════════════════

export default function ExerciseTutorialScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const { exerciseId, exerciseName } = useLocalSearchParams<{
    exerciseId: string;
    exerciseName?: string;
  }>();
  const router = useRouter();
  const [tutorial, setTutorial] = useState<ExerciseTutorial | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [activePhase, setActivePhase] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'in' | 'out'>('in');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const breathAnim = useRef(new Animated.Value(0.85)).current;
  const phaseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (exerciseId) {
      const t = getTutorial(exerciseId);
      setTutorial(t);
    }
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [exerciseId]);

  // Breathing animation loop
  useEffect(() => {
    const runCycle = () => {
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1.15, duration: 3500, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 0.85, duration: 3500, useNativeDriver: true }),
      ]).start(() => runCycle());
      // toggle breathPhase label
      setTimeout(() => setBreathPhase('out'), 3500);
      setTimeout(() => setBreathPhase('in'), 7000);
    };
    runCycle();
  }, []);

  // Phase card entrance animation
  const animatePhase = (idx: number) => {
    phaseAnim.setValue(0);
    setActivePhase(idx);
    Animated.timing(phaseAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  if (!tutorial) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtnAbsolute} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 48 }}>🏋️</Text>
          <Text style={styles.noTutTitle}>{exerciseName ?? exerciseId}</Text>
          <Text style={styles.noTutBody}>
            Step-by-step guidance for this exercise is coming soon.{'\n'}
            Focus on controlled movement and proper breathing.
          </Text>
          <TouchableOpacity style={styles.backCta} onPress={() => router.back()}>
            <Text style={styles.backCtaText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2A1A60', '#0A0A1A']}
        style={styles.header}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{exerciseName ?? exerciseId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
          <Text style={styles.headerSub}>Exercise Tutorial</Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="book-outline" size={22} color="rgba(255,255,255,0.7)" />
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Form Phases ─────────────────────────────────── */}
        <Text style={styles.sectionTitle}>📋 Form Phases</Text>
        <Text style={styles.sectionSub}>Tap each phase to see the coaching cue</Text>

        {/* Phase step pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phaseStrip}>
          {tutorial.phases.map((phase, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => animatePhase(i)}
              style={[styles.phaseChip, activePhase === i && styles.phaseChipActive]}
              activeOpacity={0.8}
            >
              <Text style={styles.phaseChipEmoji}>{phase.emoji}</Text>
              <Text style={[styles.phaseChipLabel, activePhase === i && styles.phaseChipLabelActive]}>
                {i + 1}. {phase.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active phase card */}
        <Animated.View
          style={[styles.phaseCard, {
            opacity: phaseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
            transform: [{ translateY: phaseAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          }]}
        >
          <LinearGradient
            colors={['#1E1E3F', '#13132B']}
            style={styles.phaseCardGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={styles.phaseCardHeader}>
              <Text style={styles.phaseCardEmoji}>{tutorial.phases[activePhase].emoji}</Text>
              <View style={styles.phaseCardStep}>
                <Text style={styles.phaseCardStepNum}>{activePhase + 1}/{tutorial.phases.length}</Text>
              </View>
            </View>
            <Text style={styles.phaseCardLabel}>{tutorial.phases[activePhase].label}</Text>
            <Text style={styles.phaseCardCue}>{tutorial.phases[activePhase].cue}</Text>

            <View style={styles.phaseNav}>
              <TouchableOpacity
                style={[styles.phaseNavBtn, activePhase === 0 && styles.phaseNavBtnDisabled]}
                onPress={() => activePhase > 0 && animatePhase(activePhase - 1)}
              >
                <Ionicons name="arrow-back" size={18} color={activePhase === 0 ? colors.border : Colors.primary} />
                <Text style={[styles.phaseNavText, activePhase === 0 && { color: colors.border }]}>Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.phaseNavBtn, activePhase === tutorial.phases.length - 1 && styles.phaseNavBtnDisabled]}
                onPress={() => activePhase < tutorial.phases.length - 1 && animatePhase(activePhase + 1)}
              >
                <Text style={[styles.phaseNavText, activePhase === tutorial.phases.length - 1 && { color: colors.border }]}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color={activePhase === tutorial.phases.length - 1 ? colors.border : Colors.primary} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Breathing Guide ─────────────────────────────── */}
        <Text style={styles.sectionTitle}>🫁 Breathing Guide</Text>
        <View style={styles.breathCard}>
          <View style={styles.breathVisual}>
            <Animated.View style={[styles.breathCircle, {
              transform: [{ scale: breathAnim }],
              opacity: breathAnim.interpolate({ inputRange: [0.85, 1.15], outputRange: [0.6, 1] }),
            }]}>
              <LinearGradient
                colors={breathPhase === 'in' ? ['#6C63FF', '#00D2FF'] : ['#00E676', '#00D2FF']}
                style={styles.breathCircleInner}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.breathLabel}>{breathPhase === 'in' ? '🌬️' : '💨'}</Text>
                <Text style={styles.breathPhaseText}>{breathPhase === 'in' ? 'Breathe In' : 'Breathe Out'}</Text>
              </LinearGradient>
            </Animated.View>
          </View>
          <Text style={styles.breathingCueText}>{tutorial.breathingCue}</Text>
        </View>

        {/* ── Safety & Injury Prevention ─────────────────── */}
        <Text style={styles.sectionTitle}>🛡️ Safety & Injury Prevention</Text>
        <View style={styles.card}>
          {tutorial.safetyTips.map((tip, i) => (
            <View key={i} style={[styles.safetyRow, i < tutorial.safetyTips.length - 1 && styles.rowBorder]}>
              <View style={styles.safetyIcon}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
              </View>
              <Text style={styles.safetyText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* ── Common Mistakes ─────────────────────────────── */}
        <Text style={styles.sectionTitle}>⚠️ Common Mistakes</Text>
        <View style={styles.card}>
          {tutorial.commonMistakes.map((mistake, i) => (
            <View key={i} style={[styles.mistakeRow, i < tutorial.commonMistakes.length - 1 && styles.rowBorder]}>
              <Text style={styles.mistakeText}>{mistake}</Text>
            </View>
          ))}
        </View>

        {/* ── Optional Biology ────────────────────────────── */}
        {tutorial.biology && (
          <>
            <TouchableOpacity
              style={styles.bioToggle}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setBioExpanded(e => !e);
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1E1E3F', '#13132B']}
                style={styles.bioToggleGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={styles.bioToggleLeft}>
                  <Text style={styles.bioToggleEmoji}>🧬</Text>
                  <View>
                    <Text style={styles.bioToggleTitle}>Biology Explained</Text>
                    <Text style={styles.bioToggleSub}>
                      {bioExpanded ? 'Tap to hide' : 'Tap to learn what happens in your body'}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={bioExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20} color={Colors.primary}
                />
              </LinearGradient>
            </TouchableOpacity>

            {bioExpanded && (
              <View style={styles.bioContent}>
                <View style={styles.bioSection}>
                  <Text style={styles.bioSectionTitle}>💪 Muscles Worked</Text>
                  <Text style={styles.bioSectionBody}>{tutorial.biology.musclesWorked}</Text>
                </View>
                <View style={[styles.bioSection, styles.rowBorder]}>
                  <Text style={styles.bioSectionTitle}>⚙️ What Happens Inside</Text>
                  <Text style={styles.bioSectionBody}>{tutorial.biology.mechanism}</Text>
                </View>
                <View style={styles.bioSection}>
                  <Text style={styles.bioSectionTitle}>🌱 Long-term Benefits</Text>
                  <Text style={styles.bioSectionBody}>{tutorial.biology.benefits}</Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* ── Start Exercise CTA ──────────────────────────── */}
        <TouchableOpacity
          style={styles.startCta}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#6C63FF', '#00D2FF']}
            style={styles.startCtaGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Ionicons name="checkmark-circle" size={22} color="#FFF" />
            <Text style={styles.startCtaText}>Got it — I'm ready!</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: { padding: 6 },
  backBtnAbsolute: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 44,
    left: Spacing.md, zIndex: 10, padding: 6,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: Typography.sizes.subtitle, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerRight: { padding: 6 },

  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge, fontWeight: '700',
    color: colors.text, marginBottom: 4, marginTop: Spacing.md,
  },
  sectionSub: {
    fontSize: 12, color: colors.textTertiary, marginBottom: Spacing.sm,
  },

  // Phase strip
  phaseStrip: { marginBottom: Spacing.sm },
  phaseChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.surface, borderRadius: BorderRadius.round,
    borderWidth: 1, borderColor: colors.border, marginRight: 8,
  },
  phaseChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  phaseChipEmoji: { fontSize: 16 },
  phaseChipLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  phaseChipLabelActive: { color: '#FFF' },

  // Phase card
  phaseCard: {
    borderRadius: BorderRadius.lg, overflow: 'hidden',
    marginBottom: Spacing.md, ...Shadows.medium,
  },
  phaseCardGradient: {
    padding: Spacing.lg, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  phaseCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  phaseCardEmoji: { fontSize: 36 },
  phaseCardStep: {
    backgroundColor: Colors.primary + '30', borderRadius: BorderRadius.round,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  phaseCardStepNum: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  phaseCardLabel: { fontSize: Typography.sizes.subtitle, fontWeight: '700', color: colors.text, marginBottom: 8 },
  phaseCardCue: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  phaseNav: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
  phaseNavBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  phaseNavBtnDisabled: { opacity: 0.3 },
  phaseNavText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  // Breathing
  breathCard: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md,
  },
  breathVisual: { height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  breathCircle: { width: 100, height: 100, borderRadius: 50 },
  breathCircleInner: {
    width: '100%', height: '100%', borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
  },
  breathLabel: { fontSize: 24 },
  breathPhaseText: { fontSize: 11, color: '#FFF', fontWeight: '700', marginTop: 2 },
  breathingCueText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Cards
  card: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },

  // Safety
  safetyRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, alignItems: 'flex-start' },
  safetyIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.success + '20', justifyContent: 'center', alignItems: 'center',
    marginTop: 1,
  },
  safetyText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },

  // Mistakes
  mistakeRow: { padding: Spacing.md },
  mistakeText: { fontSize: 14, color: colors.text, lineHeight: 20 },

  // Biology
  bioToggle: {
    borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: 2, ...Shadows.small,
  },
  bioToggleGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.primary + '40',
  },
  bioToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bioToggleEmoji: { fontSize: 28 },
  bioToggleTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  bioToggleSub: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  bioContent: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.primary + '30',
    marginBottom: Spacing.md, overflow: 'hidden',
  },
  bioSection: { padding: Spacing.md },
  bioSectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginBottom: 6 },
  bioSectionBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },

  // CTA
  startCta: { borderRadius: BorderRadius.md, overflow: 'hidden', ...Shadows.glow, marginTop: Spacing.md },
  startCtaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  startCtaText: { fontSize: 17, fontWeight: '800', color: '#FFF' },

  // No tutorial
  noTutTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 16, textAlign: 'center' },
  noTutBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: Spacing.xl },
  backCta: {
    marginTop: Spacing.lg, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md, paddingHorizontal: 28, paddingVertical: 12,
  },
  backCtaText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

/**
 * Body Insights Screen
 *
 * Full-screen deep-dive into the user's detected body type.
 * Shows: type name, somatotype scores, estimated BF%, frame size,
 * personalised diet & training insights, accuracy level.
 */

import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, Animated, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { getOnboardingProfile, saveBodyTypeResult, getBodyTypeResult } from '@/src/lib/database';
import { detectBodyType } from '@/src/lib/bodyTypeEngine';
import { BodyTypeResult, OnboardingProfile } from '@/src/types';

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════
const TYPE_CONFIG: Record<string, {
    emoji: string;
    label: string;
    tagline: string;
    gradient: readonly [string, string];
    traits: string[];
}> = {
    ectomorph: {
        emoji: '⚡',
        label: 'Ectomorph',
        tagline: 'Naturally lean with a fast metabolism',
        gradient: ['#00D2FF', '#6C63FF'] as const,
        traits: ['Slim build', 'Fast metabolism', 'Hard to gain weight', 'Long limbs', 'Low body fat'],
    },
    mesomorph: {
        emoji: '💪',
        label: 'Mesomorph',
        tagline: 'Athletic build with efficient metabolism',
        gradient: ['#FF9F43', '#FF6B81'] as const,
        traits: ['Athletic build', 'Gains muscle easily', 'Responds well to training', 'Defined physique', 'Medium frame'],
    },
    endomorph: {
        emoji: '🛡️',
        label: 'Endomorph',
        tagline: 'Robust build with efficient fat storage',
        gradient: ['#FF6B6B', '#FFD93D'] as const,
        traits: ['Rounder build', 'Strong and powerful', 'Gains fat easily', 'Slower metabolism', 'Wide frame'],
    },
};

const CONFIDENCE_CONFIG = {
    low: { label: 'Low (BMI estimate)', color: Colors.warning, icon: 'alert-circle-outline' },
    medium: { label: 'Medium (lifestyle-adjusted)', color: Colors.accent, icon: 'information-circle-outline' },
    high: { label: 'High (circumference-based)', color: Colors.success, icon: 'checkmark-circle-outline' },
};

// ════════════════════════════════════════════════════════════
// Main Screen
// ════════════════════════════════════════════════════════════
export default function BodyInsightsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<BodyTypeResult | null>(null);
    const [profile, setProfile] = useState<OnboardingProfile | null>(null);

    // Animated bars
    const ectoAnim = React.useRef(new Animated.Value(0)).current;
    const mesoAnim = React.useRef(new Animated.Value(0)).current;
    const endoAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const uid = user?.id ?? 'onboarding-temp';

        const animateBars = (r: BodyTypeResult) => {
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(ectoAnim, { toValue: r.scores.ecto / 100, duration: 800, useNativeDriver: false }),
                    Animated.timing(mesoAnim, { toValue: r.scores.meso / 100, duration: 800, useNativeDriver: false }),
                    Animated.timing(endoAnim, { toValue: r.scores.endo / 100, duration: 800, useNativeDriver: false }),
                ]).start();
            }, 300);
        };

        // 1. Load cached result for instant display
        getBodyTypeResult(uid).then(cached => {
            if (cached) {
                setResult(cached as any as BodyTypeResult);
                animateBars(cached as any as BodyTypeResult);
            }
        }).catch(() => { });

        // 2. Recalculate fresh, update state + DB
        getOnboardingProfile(uid).then(p => {
            if (p) {
                setProfile(p);
                const fresh = detectBodyType(p);
                if (fresh) {
                    setResult(fresh);
                    animateBars(fresh);
                    saveBodyTypeResult(uid, fresh).catch(() => { });
                }
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!result) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}>
                <Text style={{ fontSize: 48 }}>🧬</Text>
                <Text style={styles.emptyTitle}>Not enough data yet</Text>
                <Text style={styles.emptyBody}>Complete more of your health profile to unlock your body type analysis.</Text>
                <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => router.push(`/edit-health-profile?mode=edit&userId=${user?.id ?? 'onboarding-temp'}` as any)}
                >
                    <Text style={styles.emptyBtnText}>Complete My Profile</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const cfg = TYPE_CONFIG[result.dominant];
    const confCfg = CONFIDENCE_CONFIG[result.confidence];

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient colors={cfg.gradient} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerEmoji}>{cfg.emoji}</Text>
                <Text style={styles.headerType}>
                    {result.blend ?? cfg.label}
                </Text>
                <Text style={styles.headerTagline}>{cfg.tagline}</Text>

                {/* Quick traits */}
                <View style={styles.traitRow}>
                    {cfg.traits.slice(0, 3).map(t => (
                        <View key={t} style={styles.trait}>
                            <Text style={styles.traitText}>{t}</Text>
                        </View>
                    ))}
                </View>
            </LinearGradient>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

                {/* Somatotype Score Bars */}
                <Text style={styles.sectionTitle}>Somatotype Breakdown</Text>
                <View style={styles.card}>
                    {[
                        { label: 'Ectomorph ⚡', score: result.scores.ecto, anim: ectoAnim, color: '#00D2FF' },
                        { label: 'Mesomorph 💪', score: result.scores.meso, anim: mesoAnim, color: '#FF9F43' },
                        { label: 'Endomorph 🛡️', score: result.scores.endo, anim: endoAnim, color: '#FF6B6B' },
                    ].map(({ label, score, anim, color }) => (
                        <View key={label} style={styles.barRow}>
                            <View style={styles.barLabelRow}>
                                <Text style={styles.barLabel}>{label}</Text>
                                <Text style={[styles.barPct, { color }]}>{score}%</Text>
                            </View>
                            <View style={styles.barTrack}>
                                <Animated.View style={[styles.barFill, {
                                    width: (anim as any).interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                                    backgroundColor: color,
                                }]} />
                            </View>
                        </View>
                    ))}
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    {result.estimatedBF !== null && (
                        <View style={styles.statCard}>
                            <Text style={styles.statVal}>{result.estimatedBF}%</Text>
                            <Text style={styles.statLbl}>Est. Body Fat</Text>
                        </View>
                    )}
                    {result.frameSize && (
                        <View style={styles.statCard}>
                            <Text style={styles.statVal}>
                                {result.frameSize.charAt(0).toUpperCase() + result.frameSize.slice(1)}
                            </Text>
                            <Text style={styles.statLbl}>Frame Size</Text>
                        </View>
                    )}
                    {profile?.height_cm && profile?.weight_kg && (
                        <View style={styles.statCard}>
                            <Text style={styles.statVal}>
                                {(profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)}
                            </Text>
                            <Text style={styles.statLbl}>BMI</Text>
                        </View>
                    )}
                </View>

                {/* Confidence */}
                <View style={[styles.confBar, { borderColor: confCfg.color }]}>
                    <Ionicons name={confCfg.icon as any} size={18} color={confCfg.color} />
                    <Text style={[styles.confText, { color: confCfg.color }]}>
                        Detection accuracy: {confCfg.label}
                    </Text>
                </View>

                {/* Personalised Insights */}
                <Text style={styles.sectionTitle}>Personalised Insights</Text>
                <View style={styles.card}>
                    {result.insights.map((tip, i) => (
                        <View key={i} style={[styles.insightRow, i < result.insights.length - 1 && styles.insightBorder]}>
                            <Text style={styles.insightText}>{tip}</Text>
                        </View>
                    ))}
                </View>

                {/* Body traits detail */}
                <Text style={styles.sectionTitle}>Your Traits</Text>
                <View style={styles.card}>
                    {cfg.traits.map((t, i) => (
                        <View key={t} style={[styles.traitDetailRow, i < cfg.traits.length - 1 && styles.insightBorder]}>
                            <Ionicons name="checkmark-circle" size={18} color={cfg.gradient[0]} />
                            <Text style={styles.traitDetail}>{t}</Text>
                        </View>
                    ))}
                </View>

                {/* Update profile link */}
                <TouchableOpacity
                    style={styles.updateBtn}
                    onPress={() => router.push(`/edit-health-profile?mode=edit&userId=${user?.id ?? 'onboarding-temp'}` as any)}
                >
                    <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
                    <Text style={styles.updateBtnText}>Update Profile & Recalculate</Text>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.dark.background },

    // Header
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 44,
        paddingBottom: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
    },
    backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 58 : 40, left: Spacing.md, padding: 8 },
    headerEmoji: { fontSize: 56, marginBottom: 4 },
    headerType: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 4 },
    headerTagline: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: Spacing.md },
    traitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
    trait: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
    traitText: { fontSize: 12, color: '#FFF', fontWeight: '600' },

    // Body
    body: { flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
    sectionTitle: {
        fontSize: Typography.sizes.bodyLarge,
        color: Colors.dark.textSecondary,
        fontWeight: '600',
        marginBottom: Spacing.sm,
        marginTop: Spacing.sm,
    },
    card: {
        backgroundColor: Colors.dark.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        marginBottom: Spacing.md,
        overflow: 'hidden',
    },

    // Score bars
    barRow: { padding: Spacing.md, gap: 6 },
    barLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
    barLabel: { fontSize: 14, color: Colors.dark.text, fontWeight: '600' },
    barPct: { fontSize: 14, fontWeight: '700' },
    barTrack: { height: 10, backgroundColor: Colors.dark.border, borderRadius: 5, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 5 },

    // Stats
    statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    statCard: {
        flex: 1,
        backgroundColor: Colors.dark.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        padding: Spacing.md,
        alignItems: 'center',
    },
    statVal: { fontSize: 22, fontWeight: '800', color: Colors.primary },
    statLbl: { fontSize: 11, color: Colors.dark.textTertiary, marginTop: 2 },

    // Confidence bar
    confBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: BorderRadius.sm,
        padding: Spacing.sm,
        marginBottom: Spacing.md,
    },
    confText: { fontSize: 13, fontWeight: '500' },

    // Insights
    insightRow: { padding: Spacing.md },
    insightBorder: { borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
    insightText: { fontSize: 14, color: Colors.dark.text, lineHeight: 20 },

    // Trait detail
    traitDetailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
    traitDetail: { fontSize: 15, color: Colors.dark.text },

    // Update btn
    updateBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    updateBtnText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },

    // Empty state
    emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.dark.text, marginTop: 16, textAlign: 'center' },
    emptyBody: { fontSize: 14, color: Colors.dark.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    emptyBtn: { marginTop: 24, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 28, paddingVertical: 12 },
    emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

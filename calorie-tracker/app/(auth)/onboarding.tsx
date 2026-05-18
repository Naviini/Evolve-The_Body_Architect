/**
 * Onboarding / Welcome Screen
 *
 * A premium 3-page swipeable onboarding flow shown to first-time users.
 * Features smooth swipe transitions, per-slide accent gradients, and
 * CTA styling aligned with the welcome mockups.
 */

import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Platform,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';

const { width: windowWidth, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCREEN_WIDTH = Platform.OS === 'web' ? Math.min(windowWidth, 480) : windowWidth;
const ONBOARDING_KEY = '@calorie_tracker_onboarding_done';

const ONBOARDING_THEME = {
    bg: '#060912',
    surfaceInner: '#0E1424',
    border: '#2A3555',
    text: '#FFFFFF',
    textMuted: '#A8B4D4',
    textSoft: '#8B97B8',
    dotInactive: '#303A58',
};

interface OnboardingPage {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    /** Ring + CTA horizontal gradient */
    gradient: readonly [string, string];
    /** Subtitle accent (vibrant, matches reference screens) */
    subtitleColor: string;
    /** Large soft orb behind hero (per slide) */
    ambientOrb: string;
    title: string;
    subtitle: string;
    description: string;
}

const PAGES: OnboardingPage[] = [
    {
        icon: 'flame',
        iconColor: '#FF9A7B',
        gradient: ['#FF6B8A', '#FFE566'] as const,
        subtitleColor: '#FF7B9A',
        ambientOrb: 'rgba(255, 88, 118, 0.20)',
        title: 'Track Calories',
        subtitle: 'Effortlessly',
        description:
            'Log your meals in seconds. Get detailed breakdowns of calories, protein, carbs, and fats — all in one beautiful dashboard.',
    },
    {
        icon: 'camera',
        iconColor: '#5CE8FF',
        gradient: ['#7B61FF', '#00D1FF'] as const,
        subtitleColor: '#9B8CFF',
        ambientOrb: 'rgba(115, 92, 255, 0.20)',
        title: 'Scan Your Food',
        subtitle: 'With AI Vision',
        description:
            'Point your camera at any meal. Our fine-tuned vision model recognizes foods instantly and estimates nutrition automatically.',
    },
    {
        icon: 'trophy',
        iconColor: '#3DFF9A',
        gradient: ['#15E08A', '#00D4FF'] as const,
        subtitleColor: '#38F0A0',
        ambientOrb: 'rgba(26, 216, 154, 0.18)',
        title: 'Achieve Goals',
        subtitle: 'Stay Consistent',
        description:
            'Set personalized calorie targets, track streaks, and watch your progress with beautiful analytics and insights.',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);
    const [currentPage, setCurrentPage] = useState(0);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        const clamped = Math.max(0, Math.min(PAGES.length - 1, page));
        setCurrentPage((p) => (p === clamped ? p : clamped));
    };

    const finalizePage = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setCurrentPage(Math.max(0, Math.min(PAGES.length - 1, page)));
    };

    const goToPage = (index: number) => {
        scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
        setCurrentPage(index);
    };

    const handleNext = () => {
        if (currentPage < PAGES.length - 1) {
            goToPage(currentPage + 1);
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        } catch {
            // Silently fail — not critical
        }
        router.replace('/(auth)/profile-setup' as any);
    };

    return (
        <View style={styles.container}>
            <View
                pointerEvents="none"
                style={[styles.bgGlow, { backgroundColor: PAGES[currentPage].ambientOrb }]}
            />

            {/* Tiny skip — available on every slide */}
            <TouchableOpacity
                style={[styles.skipButton, { top: Math.max(insets.top, Platform.OS === 'ios' ? 12 : 8) + 8 }]}
                onPress={handleSkip}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            {/* Swipeable Pages */}
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                onMomentumScrollEnd={finalizePage}
                scrollEventThrottle={16}
                bounces={false}
                decelerationRate="fast"
            >
                {PAGES.map((page, index) => (
                    <View key={index} style={styles.page}>
                        {/* Icon with gradient circle */}
                        <View style={styles.iconArea}>
                            <LinearGradient
                                colors={page.gradient}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={styles.iconCircleOuter}
                            >
                                <View style={styles.iconCircleInner}>
                                    <Ionicons name={page.icon} size={60} color={page.iconColor} />
                                </View>
                            </LinearGradient>

                            {/* Decorative floating dots */}
                            <View style={[styles.floatingDot, styles.dot1, { backgroundColor: page.gradient[0] + '55' }]} />
                            <View style={[styles.floatingDot, styles.dot2, { backgroundColor: page.gradient[1] + '44' }]} />
                            <View style={[styles.floatingDot, styles.dot3, { backgroundColor: page.gradient[1] + '28' }]} />
                        </View>

                        {/* Text content */}
                        <View style={styles.textArea}>
                            <Text style={styles.title}>{page.title}</Text>
                            <Text style={[styles.subtitle, { color: page.subtitleColor }]}>
                                {page.subtitle}
                            </Text>
                            <Text style={styles.description}>{page.description}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Bottom area: dots + button */}
            <View style={styles.bottomArea}>
                {/* Page Indicators */}
                <View style={styles.dotsRow}>
                    {PAGES.map((page, index) => (
                        <TouchableOpacity
                            key={page.title}
                            onPress={() => goToPage(index)}
                            accessibilityRole="button"
                            accessibilityLabel={`Go to slide ${index + 1}`}
                            hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                        >
                            <View
                                style={[
                                    styles.dotCapsule,
                                    index === currentPage
                                        ? { width: 28, backgroundColor: page.gradient[0], opacity: 1 }
                                        : {
                                              width: 8,
                                              backgroundColor: ONBOARDING_THEME.dotInactive,
                                              opacity: 0.7,
                                          },
                                ]}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Primary action button */}
                <TouchableOpacity style={styles.actionButton} onPress={handleNext} activeOpacity={0.85}>
                    <LinearGradient
                        colors={PAGES[currentPage].gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionButtonGradient}
                    >
                        {currentPage < PAGES.length - 1 ? (
                            <>
                                <Text style={styles.actionButtonText}>Next</Text>
                                <Ionicons name="arrow-forward" size={20} color="#FFF" />
                            </>
                        ) : (
                            <>
                                <Text style={styles.actionButtonText}>Get Started</Text>
                                <Ionicons name="rocket" size={20} color="#FFF" />
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Sign In link — always visible for returning users */}
                <Pressable
                    style={({ pressed }) => [styles.signInRow, pressed && styles.signInRowPressed]}
                    onPress={() => router.replace('/(auth)/login' as any)}
                    accessibilityRole="link"
                    accessibilityLabel="Already have an account? Sign In"
                    hitSlop={{ top: 8, bottom: 8 }}
                >
                    <Text style={styles.signInPrompt}>
                        Already have an account?<Text style={[styles.signInLink, { color: PAGES[currentPage].subtitleColor }]}> Sign In</Text>
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ONBOARDING_THEME.bg,
    },
    bgGlow: {
        position: 'absolute',
        top: SCREEN_HEIGHT * 0.13,
        left: SCREEN_WIDTH * 0.08,
        width: SCREEN_WIDTH * 0.84,
        height: SCREEN_WIDTH * 0.84,
        borderRadius: SCREEN_WIDTH * 0.42,
    },

    // Skip (compact — always visible)
    skipButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 52 : 40,
        right: Spacing.md,
        zIndex: 10,
        paddingVertical: 4,
        paddingHorizontal: Spacing.sm,
    },
    skipText: {
        fontSize: Typography.sizes.caption,
        color: ONBOARDING_THEME.textSoft,
        fontWeight: Typography.weights.semibold,
        letterSpacing: 0.4,
        opacity: 0.92,
    },

    // Page
    page: {
        width: SCREEN_WIDTH,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },

    // Icon area
    iconArea: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xxl,
        height: 200,
        width: 200,
    },
    iconCircleOuter: {
        width: 156,
        height: 156,
        borderRadius: 78,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        ...Shadows.glow,
    },
    iconCircleInner: {
        width: 118,
        height: 118,
        borderRadius: 59,
        backgroundColor: ONBOARDING_THEME.surfaceInner,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Floating decorative dots
    floatingDot: {
        position: 'absolute',
        borderRadius: 100,
    },
    dot1: {
        width: 20,
        height: 20,
        top: 10,
        right: 10,
    },
    dot2: {
        width: 14,
        height: 14,
        bottom: 20,
        left: 5,
    },
    dot3: {
        width: 10,
        height: 10,
        top: 50,
        left: 0,
    },

    // Text area
    textArea: {
        alignItems: 'center',
        maxWidth: 340,
    },
    title: {
        fontSize: Typography.sizes.hero,
        fontWeight: Typography.weights.heavy,
        color: ONBOARDING_THEME.text,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: Typography.sizes.title,
        fontWeight: Typography.weights.bold,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: Spacing.md,
    },
    description: {
        fontSize: Typography.sizes.bodyLarge,
        color: ONBOARDING_THEME.textMuted,
        textAlign: 'center',
        lineHeight: 24,
    },

    // Bottom area
    bottomArea: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? 50 : 36,
        alignItems: 'center',
        gap: Spacing.lg,
    },

    // Dots
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dotCapsule: {
        height: 8,
        borderRadius: 4,
    },

    // CTA
    actionButton: {
        width: '100%',
        borderRadius: BorderRadius.round,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
    },
    actionButtonGradient: {
        flexDirection: 'row',
        paddingVertical: 18,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.sm,
        borderRadius: BorderRadius.round,
    },
    actionButtonText: {
        fontSize: Typography.sizes.subtitle,
        fontWeight: Typography.weights.bold,
        color: '#FFF',
    },

    // Sign In row
    signInRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.sm,
    },
    signInRowPressed: {
        opacity: 0.75,
    },
    signInPrompt: {
        fontSize: Typography.sizes.body,
        color: ONBOARDING_THEME.textMuted,
    },
    signInLink: {
        fontSize: Typography.sizes.body,
        fontWeight: Typography.weights.bold,
    },
});

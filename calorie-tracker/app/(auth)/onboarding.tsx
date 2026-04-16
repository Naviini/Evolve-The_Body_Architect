/**
 * Onboarding / Welcome Screen
 *
 * A premium 3-page swipeable onboarding flow shown to first-time users.
 * Features smooth page transitions, animated dot indicators, and
 * gradient accent buttons matching the app design system.
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
    Animated,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';

const { width: windowWidth, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCREEN_WIDTH = Platform.OS === 'web' ? Math.min(windowWidth, 480) : windowWidth;
const ONBOARDING_KEY = '@calorie_tracker_onboarding_done';

const ONBOARDING_THEME = {
    bg: '#050A1D',
    surface: '#171E3F',
    border: '#2B366C',
    accent: '#6664FF',
    accentStrong: '#8D9BFF',
    text: '#EEF2FF',
    textMuted: '#9AA8D7',
    textSoft: '#7F8BB9',
};

interface OnboardingPage {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    gradient: readonly [string, string, ...string[]];
    title: string;
    subtitle: string;
    description: string;
}

const PAGES: OnboardingPage[] = [
    {
        icon: 'flame',
        iconColor: '#A8B6FF',
        gradient: ['#5E68FF', '#7D8BFF'] as const,
        title: 'Track Calories',
        subtitle: 'Effortlessly',
        description:
            'Log your meals in seconds. Get detailed breakdowns of calories, protein, carbs, and fats — all in one beautiful dashboard.',
    },
    {
        icon: 'camera',
        iconColor: '#9FB0FF',
        gradient: ['#5C73FF', '#7193FF'] as const,
        title: 'Scan Your Food',
        subtitle: 'With AI Vision',
        description:
            'Point your camera at any meal. Our fine-tuned vision model recognizes foods instantly and estimates nutrition automatically.',
    },
    {
        icon: 'trophy',
        iconColor: '#B4BEFF',
        gradient: ['#6366FF', '#8A93FF'] as const,
        title: 'Achieve Goals',
        subtitle: 'Stay Consistent',
        description:
            'Set personalized calorie targets, track streaks, and watch your progress with beautiful analytics and insights.',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const scrollRef = useRef<ScrollView>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [currentPage, setCurrentPage] = useState(0);

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
            useNativeDriver: false,
            listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentPage(page);
            },
        }
    );

    const goToPage = (index: number) => {
        scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
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
        } catch (e) {
            // Silently fail — not critical
        }
        router.replace('/(auth)/profile-setup' as any);
    };

    return (
        <View style={styles.container}>
            {/* Background glow effect */}
            <View style={styles.bgGlow} />

            {/* Skip button */}
            {currentPage < PAGES.length - 1 && (
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            )}

            {/* Swipeable Pages */}
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
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
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.iconCircleOuter}
                            >
                                <View style={styles.iconCircleInner}>
                                    <Ionicons name={page.icon} size={56} color={page.iconColor} />
                                </View>
                            </LinearGradient>

                            {/* Decorative floating dots */}
                            <View style={[styles.floatingDot, styles.dot1, { backgroundColor: page.gradient[0] + '40' }]} />
                            <View style={[styles.floatingDot, styles.dot2, { backgroundColor: page.gradient[1] + '30' }]} />
                            <View style={[styles.floatingDot, styles.dot3, { backgroundColor: page.gradient[0] + '20' }]} />
                        </View>

                        {/* Text content */}
                        <View style={styles.textArea}>
                            <Text style={styles.title}>{page.title}</Text>
                            <Text style={[styles.subtitle, { color: page.gradient[0] }]}>
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
                    {PAGES.map((page, index) => {
                        const inputRange = [
                            (index - 1) * SCREEN_WIDTH,
                            index * SCREEN_WIDTH,
                            (index + 1) * SCREEN_WIDTH,
                        ];

                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 28, 8],
                            extrapolate: 'clamp',
                        });

                        const dotOpacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });

                        return (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        width: dotWidth,
                                        opacity: dotOpacity,
                                        backgroundColor: page.gradient[0],
                                    },
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Action Button */}
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
        top: SCREEN_HEIGHT * 0.15,
        left: SCREEN_WIDTH * 0.1,
        width: SCREEN_WIDTH * 0.8,
        height: SCREEN_WIDTH * 0.8,
        borderRadius: SCREEN_WIDTH * 0.4,
        backgroundColor: ONBOARDING_THEME.accent,
        opacity: 0.12,
    },

    // Skip
    skipButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 45,
        right: Spacing.lg,
        zIndex: 10,
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
    },
    skipText: {
        fontSize: Typography.sizes.bodyLarge,
        color: ONBOARDING_THEME.textMuted,
        fontWeight: Typography.weights.medium,
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
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        ...Shadows.glow,
    },
    iconCircleInner: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: ONBOARDING_THEME.surface,
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
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },

    // CTA
    actionButton: {
        width: '100%',
        borderRadius: BorderRadius.lg,
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
        borderRadius: BorderRadius.lg,
    },
    actionButtonText: {
        fontSize: Typography.sizes.subtitle,
        fontWeight: Typography.weights.bold,
        color: '#FFF',
    },
});

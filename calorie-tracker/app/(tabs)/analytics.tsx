/**
 * Analytics Screen — Stats & Charts
 *
 * Shows weekly/monthly calorie trends, macro distribution,
 * streak counter, and average daily intake stats.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';
import { getWeeklyLogs, getMonthlyLogs } from '@/src/lib/database';
import { useAuth } from '@/src/contexts/AuthContext';

const { width: windowWidth } = Dimensions.get('window');
const SCREEN_WIDTH = Platform.OS === 'web' ? Math.min(windowWidth, 480) : windowWidth;
const CHART_HEIGHT = 180;
const CHART_WIDTH = SCREEN_WIDTH - Spacing.md * 2 - Spacing.lg * 2;

type TimeRange = 'week' | 'month';

export default function AnalyticsScreen() {
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState<TimeRange>('week');
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState({
        avgCalories: 0,
        avgProtein: 0,
        avgCarbs: 0,
        avgFat: 0,
        totalDays: 0,
        bestDay: 0,
        worstDay: 0,
    });

    const today = new Date().toISOString().split('T')[0];

    const loadData = useCallback(async () => {
        try {
            const userId = user?.id || 'demo-user';
            const data = timeRange === 'week'
                ? await getWeeklyLogs(userId, today)
                : await getMonthlyLogs(userId, today);

            setLogs(data);

            if (data.length > 0) {
                const cals = data.map((d: any) => d.total_calories || 0);
                setStats({
                    avgCalories: cals.reduce((a: number, b: number) => a + b, 0) / data.length,
                    avgProtein: data.reduce((s: number, d: any) => s + (d.total_protein_g || 0), 0) / data.length,
                    avgCarbs: data.reduce((s: number, d: any) => s + (d.total_carbs_g || 0), 0) / data.length,
                    avgFat: data.reduce((s: number, d: any) => s + (d.total_fat_g || 0), 0) / data.length,
                    totalDays: data.length,
                    bestDay: Math.max(...cals),
                    worstDay: Math.min(...cals.filter((c: number) => c > 0)),
                });
            }
        } catch (e) {
            console.error('Failed to load analytics:', e);
        }
    }, [user, today, timeRange]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const maxCal = Math.max(...logs.map((l: any) => l.total_calories || 0), 1);

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Analytics</Text>
                    <View style={styles.timeToggle}>
                        <TouchableOpacity
                            style={[styles.timeButton, timeRange === 'week' && styles.timeButtonActive]}
                            onPress={() => setTimeRange('week')}
                        >
                            <Text style={[styles.timeText, timeRange === 'week' && styles.timeTextActive]}>
                                Week
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.timeButton, timeRange === 'month' && styles.timeButtonActive]}
                            onPress={() => setTimeRange('month')}
                        >
                            <Text style={[styles.timeText, timeRange === 'month' && styles.timeTextActive]}>
                                Month
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Calorie Trend Chart */}
                <LinearGradient
                    colors={[Colors.dark.surfaceLight, Colors.dark.card]}
                    style={styles.chartCard}
                >
                    <Text style={styles.chartTitle}>Calorie Intake</Text>
                    <Text style={styles.chartSubtitle}>
                        {timeRange === 'week' ? 'Last 7 days' : 'Last 30 days'}
                    </Text>

                    {logs.length === 0 ? (
                        <View style={styles.emptyChart}>
                            <Ionicons name="bar-chart-outline" size={48} color={Colors.dark.textTertiary} />
                            <Text style={styles.emptyText}>No data yet</Text>
                            <Text style={styles.emptySubtext}>Start logging meals to see your trends</Text>
                        </View>
                    ) : (
                        <View style={styles.barChart}>
                            {logs.map((log: any, index: number) => {
                                const barHeight = maxCal > 0 ? (log.total_calories / maxCal) * CHART_HEIGHT : 0;
                                const dayLabel = new Date(log.log_date).toLocaleDateString('en', { weekday: 'short' }).charAt(0);

                                return (
                                    <View key={index} style={styles.barWrapper}>
                                        <Text style={styles.barValue}>
                                            {log.total_calories > 0 ? Math.round(log.total_calories) : ''}
                                        </Text>
                                        <View style={[styles.bar, { height: Math.max(barHeight, 4) }]}>
                                            <LinearGradient
                                                colors={[Colors.primary, Colors.accent]}
                                                style={StyleSheet.absoluteFill}
                                                start={{ x: 0, y: 1 }}
                                                end={{ x: 0, y: 0 }}
                                            />
                                        </View>
                                        <Text style={styles.barLabel}>{dayLabel}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </LinearGradient>

                {/* Average Stats */}
                <Text style={styles.sectionTitle}>Daily Averages</Text>
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="flame"
                        label="Calories"
                        value={`${Math.round(stats.avgCalories)}`}
                        unit="kcal"
                        color={Colors.warning}
                    />
                    <StatCard
                        icon="fitness"
                        label="Protein"
                        value={`${Math.round(stats.avgProtein)}`}
                        unit="g"
                        color={Colors.protein}
                    />
                    <StatCard
                        icon="leaf"
                        label="Carbs"
                        value={`${Math.round(stats.avgCarbs)}`}
                        unit="g"
                        color={Colors.carbs}
                    />
                    <StatCard
                        icon="water"
                        label="Fat"
                        value={`${Math.round(stats.avgFat)}`}
                        unit="g"
                        color={Colors.fat}
                    />
                </View>

                {/* Macro Distribution */}
                <Text style={styles.sectionTitle}>Macro Distribution</Text>
                <LinearGradient
                    colors={[Colors.dark.surfaceLight, Colors.dark.card]}
                    style={styles.macroCard}
                >
                    {(() => {
                        const total = stats.avgProtein * 4 + stats.avgCarbs * 4 + stats.avgFat * 9;
                        const proteinPct = total > 0 ? ((stats.avgProtein * 4) / total) * 100 : 33;
                        const carbsPct = total > 0 ? ((stats.avgCarbs * 4) / total) * 100 : 33;
                        const fatPct = total > 0 ? ((stats.avgFat * 9) / total) * 100 : 33;

                        return (
                            <>
                                <View style={styles.macroBar}>
                                    <View style={[styles.macroSegment, { width: `${proteinPct}%`, backgroundColor: Colors.protein }]} />
                                    <View style={[styles.macroSegment, { width: `${carbsPct}%`, backgroundColor: Colors.carbs }]} />
                                    <View style={[styles.macroSegment, { width: `${fatPct}%`, backgroundColor: Colors.fat }]} />
                                </View>
                                <View style={styles.macroLegend}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: Colors.protein }]} />
                                        <Text style={styles.legendText}>Protein {Math.round(proteinPct)}%</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: Colors.carbs }]} />
                                        <Text style={styles.legendText}>Carbs {Math.round(carbsPct)}%</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: Colors.fat }]} />
                                        <Text style={styles.legendText}>Fat {Math.round(fatPct)}%</Text>
                                    </View>
                                </View>
                            </>
                        );
                    })()}
                </LinearGradient>

                {/* Insights */}
                <Text style={styles.sectionTitle}>Insights</Text>
                <LinearGradient
                    colors={[Colors.dark.surfaceLight, Colors.dark.card]}
                    style={styles.insightCard}
                >
                    <View style={styles.insightRow}>
                        <Ionicons name="trending-up" size={24} color={Colors.success} />
                        <View style={styles.insightContent}>
                            <Text style={styles.insightTitle}>
                                {stats.totalDays > 0 ? `${stats.totalDays} days tracked` : 'No data yet'}
                            </Text>
                            <Text style={styles.insightText}>
                                {stats.totalDays > 0
                                    ? `Best day: ${Math.round(stats.bestDay)} kcal`
                                    : 'Start logging to see insights'}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

function StatCard({
    icon,
    label,
    value,
    unit,
    color,
}: {
    icon: string;
    label: string;
    value: string;
    unit: string;
    color: string;
}) {
    return (
        <View style={styles.statCard}>
            <LinearGradient
                colors={[Colors.dark.surfaceLight, Colors.dark.card]}
                style={styles.statCardGradient}
            >
                <Ionicons name={icon as any} size={22} color={color} />
                <Text style={[styles.statValue, { color }]}>{value}</Text>
                <Text style={styles.statUnit}>{unit}</Text>
                <Text style={styles.statLabel}>{label}</Text>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: Spacing.md,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    headerTitle: {
        fontSize: Typography.sizes.heading,
        color: Colors.dark.text,
        fontWeight: Typography.weights.bold,
    },
    timeToggle: {
        flexDirection: 'row',
        backgroundColor: Colors.dark.surface,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    timeButton: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: BorderRadius.sm,
    },
    timeButtonActive: {
        backgroundColor: Colors.primary,
    },
    timeText: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textSecondary,
        fontWeight: Typography.weights.medium,
    },
    timeTextActive: {
        color: '#FFF',
        fontWeight: Typography.weights.bold,
    },

    // Chart
    chartCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        marginBottom: Spacing.lg,
    },
    chartTitle: {
        fontSize: Typography.sizes.subtitle,
        color: Colors.dark.text,
        fontWeight: Typography.weights.bold,
    },
    chartSubtitle: {
        fontSize: Typography.sizes.caption,
        color: Colors.dark.textTertiary,
        marginBottom: Spacing.md,
    },
    emptyChart: {
        height: CHART_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: Typography.sizes.bodyLarge,
        color: Colors.dark.textSecondary,
        fontWeight: Typography.weights.semibold,
        marginTop: Spacing.sm,
    },
    emptySubtext: {
        fontSize: Typography.sizes.caption,
        color: Colors.dark.textTertiary,
        marginTop: 4,
    },
    barChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: CHART_HEIGHT + 40,
        gap: 4,
        paddingTop: 20,
    },
    barWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    barValue: {
        fontSize: 9,
        color: Colors.dark.textTertiary,
        marginBottom: 4,
    },
    bar: {
        width: '70%',
        borderRadius: 4,
        overflow: 'hidden',
        minHeight: 4,
    },
    barLabel: {
        fontSize: 10,
        color: Colors.dark.textTertiary,
        marginTop: 4,
    },

    // Stats Grid
    sectionTitle: {
        fontSize: Typography.sizes.subtitle,
        color: Colors.dark.text,
        fontWeight: Typography.weights.bold,
        marginBottom: Spacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    statCard: {
        width: '48%',
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    statCardGradient: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        alignItems: 'center',
    },
    statValue: {
        fontSize: Typography.sizes.heading,
        fontWeight: Typography.weights.bold,
        marginTop: 4,
    },
    statUnit: {
        fontSize: Typography.sizes.caption,
        color: Colors.dark.textTertiary,
        marginTop: 2,
    },
    statLabel: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textSecondary,
        marginTop: 4,
        fontWeight: Typography.weights.medium,
    },

    // Macro Distribution
    macroCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        marginBottom: Spacing.lg,
    },
    macroBar: {
        flexDirection: 'row',
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: Spacing.md,
    },
    macroSegment: {
        height: '100%',
    },
    macroLegend: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textSecondary,
    },

    // Insights
    insightCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        marginBottom: Spacing.md,
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontSize: Typography.sizes.bodyLarge,
        color: Colors.dark.text,
        fontWeight: Typography.weights.semibold,
    },
    insightText: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textSecondary,
        marginTop: 2,
    },
});

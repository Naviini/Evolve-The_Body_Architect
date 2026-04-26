/**
 * Profile Screen — User Settings & Preferences
 *
 * Shows user profile, daily calorie goal settings,
 * app preferences, and sign-out option.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { syncAll, getSyncStatus } from '@/src/lib/sync';
import {
    getOnboardingProfile,
    saveBodyTypeResult,
    getBodyTypeResult,
    hydrateOnboardingProfileFromSupabase,
    getDailyCalorieGoalForUser,
    getUserPreferences,
} from '@/src/lib/database';
import { detectBodyType } from '@/src/lib/bodyTypeEngine';
import type { BodyTypeResult } from '@/src/types';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppTheme } from '@/src/contexts/ThemeContext';

export default function ProfileScreen() {
    const colors = useThemeColors();
    const styles = useAppStyles(createStyles);
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [calorieGoal, setCalorieGoal] = useState('2000');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);
    const [bodyTypeResult, setBodyTypeResult] = useState<BodyTypeResult | null>(null);
    const [prefs, setPrefs] = useState<any>(null);
    const [lastCloudRefresh, setLastCloudRefresh] = useState<string | null>(null);
    const { isDark, toggleTheme } = useAppTheme();

    useFocusEffect(
        useCallback(() => {
            const uid = user?.id ?? 'onboarding-temp';
            getUserPreferences(uid).then(setPrefs).catch(() => { });
        }, [user?.id])
    );

    useEffect(() => {
        const uid = user?.id ?? 'onboarding-temp';

        getDailyCalorieGoalForUser(uid)
            .then((goal) => setCalorieGoal(String(goal)))
            .catch(() => { });

        // 1. Load cached result instantly
        getBodyTypeResult(uid).then(cached => {
            if (cached) {
                setBodyTypeResult(cached as any as BodyTypeResult);
            }
        }).catch(() => { });
        // 2. Recalculate fresh & update DB
        getOnboardingProfile(uid).then(p => {
            if (p) {
                const fresh = detectBodyType(p);
                if (fresh) {
                    setBodyTypeResult(fresh);
                    saveBodyTypeResult(uid, fresh).catch(() => { });
                }
            }
        }).catch(() => { });
    }, [user?.id]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncAll();
            Alert.alert(
                'Sync Complete',
                `Pushed: ${result.pushed}\nPulled: ${result.pulled}${result.errors.length > 0 ? `\nErrors: ${result.errors.length}` : ''
                }`
            );
        } catch (e) {
            Alert.alert('Sync Failed', 'Please check your connection and try again.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleRefreshFromCloud = async () => {
        if (!user?.id) {
            Alert.alert('Sign in required', 'Please sign in to refresh your profile from cloud.');
            return;
        }

        setIsRefreshingCloud(true);
        try {
            await hydrateOnboardingProfileFromSupabase(user.id);
            const profile = await getOnboardingProfile(user.id);

            if (profile) {
                const fresh = detectBodyType(profile);
                if (fresh) {
                    setBodyTypeResult(fresh);
                    saveBodyTypeResult(user.id, fresh).catch(() => { });
                }
            }

            setLastCloudRefresh(new Date().toISOString());

            Alert.alert('Cloud Refresh Complete', 'Your onboarding profile was refreshed from Supabase.');
        } catch (e) {
            Alert.alert('Refresh Failed', 'Could not refresh profile from cloud. Please try again.');
        } finally {
            setIsRefreshingCloud(false);
        }
    };

    const handleSignOut = () => {
        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to sign out?')) {
                signOut();
            }
        } else {
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: signOut,
                },
            ]);
        }
    };

    const syncStatus = getSyncStatus();

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Text style={styles.headerTitle}>Profile</Text>

                {/* User Card */}
                <LinearGradient
                    colors={Colors.gradients.primary}
                    style={styles.userCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={36} color={Colors.primary} />
                    </View>
                    <Text style={styles.userName}>
                        {user?.user_metadata?.display_name || 'Guest User'}
                    </Text>
                    <Text style={styles.userEmail}>
                        {user?.email || 'demo@calorietracker.app'}
                    </Text>
                </LinearGradient>

                {/* Daily Goal */}
                <Text style={styles.sectionTitle}>Daily Goal</Text>
                <View style={styles.settingCard}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="flame" size={22} color={Colors.warning} />
                            <Text style={styles.settingLabel}>Calorie Goal</Text>
                        </View>
                        <View style={styles.goalInput}>
                            <TextInput
                                value={calorieGoal}
                                onChangeText={setCalorieGoal}
                                keyboardType="numeric"
                                style={styles.goalTextInput}
                                placeholderTextColor={colors.textTertiary}
                            />
                            <Text style={styles.goalUnit}>kcal</Text>
                        </View>
                    </View>
                </View>

                {/* Quick Goal Presets */}
                <View style={styles.presetRow}>
                    {['1500', '1800', '2000', '2500'].map((val) => (
                        <TouchableOpacity
                            key={val}
                            style={[styles.presetButton, calorieGoal === val && styles.presetButtonActive]}
                            onPress={() => setCalorieGoal(val)}
                        >
                            <Text style={[styles.presetText, calorieGoal === val && styles.presetTextActive]}>
                                {val}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Sync */}
                <Text style={styles.sectionTitle}>Data & Sync</Text>
                <View style={styles.settingCard}>
                    <TouchableOpacity style={[styles.settingRow, styles.settingBorder]} onPress={handleSync} disabled={isSyncing}>
                        <View style={styles.settingLeft}>
                            <Ionicons
                                name={isSyncing ? 'sync' : 'sync-outline'}
                                size={22}
                                color={Colors.accent}
                            />
                            <View>
                                <Text style={styles.settingLabel}>
                                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                                </Text>
                                <Text style={styles.settingSub}>
                                    {syncStatus.lastSync
                                        ? `Last: ${new Date(syncStatus.lastSync).toLocaleTimeString()}`
                                        : 'Not synced yet'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingRow} onPress={handleRefreshFromCloud} disabled={isRefreshingCloud}>
                        <View style={styles.settingLeft}>
                            <Ionicons
                                name={isRefreshingCloud ? 'cloud-download' : 'cloud-download-outline'}
                                size={22}
                                color={Colors.primary}
                            />
                            <View>
                                <Text style={styles.settingLabel}>
                                    {isRefreshingCloud ? 'Refreshing...' : 'Refresh From Cloud'}
                                </Text>
                                <Text style={styles.settingSub}>
                                    {lastCloudRefresh
                                        ? `Last: ${new Date(lastCloudRefresh).toLocaleTimeString()}`
                                        : 'Pull latest onboarding profile from Supabase'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                </View>

                {/* Body Type Analysis */}
                {bodyTypeResult ? (
                    <>
                        <Text style={styles.sectionTitle}>Body Type Analysis</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/body-insights' as any)}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={bodyTypeResult.dominant === 'ectomorph'
                                    ? ['#00D2FF', '#6C63FF']
                                    : bodyTypeResult.dominant === 'mesomorph'
                                        ? ['#FF9F43', '#FF6B81']
                                        : ['#FF6B6B', '#FFD93D']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.bodyTypeCard}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.bodyTypeLabel}>
                                        {bodyTypeResult.dominant === 'ectomorph' ? '⚡' :
                                            bodyTypeResult.dominant === 'mesomorph' ? '💪' : '🛡️'}
                                        {'  '}
                                        {bodyTypeResult.blend ??
                                            (bodyTypeResult.dominant.charAt(0).toUpperCase() + bodyTypeResult.dominant.slice(1))}
                                    </Text>
                                    <Text style={styles.bodyTypeSub}>
                                        {bodyTypeResult.scores.ecto}% Ecto · {bodyTypeResult.scores.meso}% Meso · {bodyTypeResult.scores.endo}% Endo
                                    </Text>
                                    {bodyTypeResult.estimatedBF !== null && (
                                        <Text style={styles.bodyTypeBF}>Est. Body Fat: {bodyTypeResult.estimatedBF}%</Text>
                                    )}
                                </View>
                                <View style={styles.bodyTypeArrow}>
                                    <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.8)" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </>
                ) : null}

                {/* Health Profile */}
                <Text style={styles.sectionTitle}>Health Profile</Text>
                <View style={styles.settingCard}>
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() =>
                            router.push(
                                `/edit-health-profile?mode=edit&userId=${user?.id ?? 'onboarding-temp'}` as any
                            )
                        }
                    >
                        <View style={styles.settingLeft}>
                            <View style={styles.healthIconBg}>
                                <Ionicons name="body-outline" size={20} color="#FFF" />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Edit Health Profile</Text>
                                <Text style={styles.settingSub}>Update your body data &amp; goals</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                </View>

                {/* Settings */}
                <Text style={styles.sectionTitle}>Settings</Text>
                <View style={styles.settingCard}>
                    <SettingRow
                        icon="notifications-outline"
                        label="Notifications"
                        color={Colors.primary}
                        badge={prefs?.notifications_enabled ? "On" : "Off"}
                        onPress={() => router.push('/settings/notifications')}
                    />
                    <SettingRow
                        icon={isDark ? "moon" : "moon-outline"}
                        label="Dark Mode"
                        color={Colors.primaryLight}
                        badge={isDark ? "On" : "Off"}
                        onPress={toggleTheme}
                    />
                    <SettingRow
                        icon="language-outline"
                        label="Language"
                        color={Colors.accent}
                        badge={prefs?.language ? (prefs.language === 'en' ? 'English' : prefs.language.toUpperCase()) : 'English'}
                        onPress={() => router.push('/settings/language')}
                    />
                    <SettingRow
                        icon="options-outline"
                        label="Units"
                        color={Colors.warning}
                        badge={prefs?.weight_unit ? `${prefs.weight_unit}, ${prefs.height_unit}` : 'kg, cm'}
                        onPress={() => router.push('/settings/units')}
                    />
                    <SettingRow
                        icon="shield-checkmark-outline"
                        label="Privacy"
                        color={Colors.success}
                        onPress={() => router.push('/settings/privacy')}
                        last
                    />
                </View>

                {/* About */}
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.settingCard}>
                    <SettingRow icon="information-circle-outline" label="App Version" color={colors.textSecondary} badge="1.0.0" />
                    <SettingRow icon="star-outline" label="Rate the App" color={Colors.warning} />
                    <SettingRow icon="chatbubble-outline" label="Send Feedback" color={Colors.accent} last />
                </View>

                {/* Sign Out */}
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={22} color={Colors.error} />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.footer}>Calorie Tracker v1.0.0</Text>
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

function SettingRow({
    icon,
    label,
    color,
    badge,
    last,
    onPress,
}: {
    icon: string;
    label: string;
    color: string;
    badge?: string;
    last?: boolean;
    onPress?: () => void;
}) {
    const colors = useThemeColors();
    const styles = useAppStyles(createStyles);
    return (
        <TouchableOpacity style={[styles.settingRow, !last && styles.settingBorder]} onPress={onPress}>
            <View style={styles.settingLeft}>
                <Ionicons name={icon as any} size={22} color={color} />
                <Text style={styles.settingLabel}>{label}</Text>
            </View>
            <View style={styles.settingRight}>
                {badge && <Text style={styles.settingBadge}>{badge}</Text>}
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </View>
        </TouchableOpacity>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: Spacing.md,
    },
    headerTitle: {
        fontSize: Typography.sizes.heading,
        color: colors.text,
        fontWeight: Typography.weights.bold,
        marginBottom: Spacing.lg,
    },

    // User Card
    userCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    userName: {
        fontSize: Typography.sizes.title,
        color: '#FFF',
        fontWeight: Typography.weights.bold,
    },
    userEmail: {
        fontSize: Typography.sizes.body,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },

    // Sections
    sectionTitle: {
        fontSize: Typography.sizes.bodyLarge,
        color: colors.textSecondary,
        fontWeight: Typography.weights.semibold,
        marginBottom: Spacing.sm,
        marginTop: Spacing.sm,
    },

    // Setting Card
    settingCard: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: Spacing.md,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
    },
    settingBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    settingLabel: {
        fontSize: Typography.sizes.bodyLarge,
        color: colors.text,
        fontWeight: Typography.weights.medium,
    },
    settingSub: {
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    settingBadge: {
        fontSize: Typography.sizes.body,
        color: colors.textTertiary,
    },
    healthIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Body type card
    bodyTypeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    bodyTypeLabel: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 3,
    },
    bodyTypeSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
    },
    bodyTypeBF: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 2,
    },
    bodyTypeArrow: {
        padding: 4,
    },

    // Goal Input
    goalInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    goalTextInput: {
        color: colors.text,
        fontSize: Typography.sizes.bodyLarge,
        fontWeight: Typography.weights.bold,
        paddingVertical: 6,
        width: 60,
        textAlign: 'right',
    },
    goalUnit: {
        fontSize: Typography.sizes.body,
        color: colors.textTertiary,
        marginLeft: 4,
    },

    // Presets
    presetRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    presetButton: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    presetButtonActive: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(108, 99, 255, 0.15)',
    },
    presetText: {
        fontSize: Typography.sizes.body,
        color: colors.textSecondary,
        fontWeight: Typography.weights.medium,
    },
    presetTextActive: {
        color: Colors.primary,
        fontWeight: Typography.weights.bold,
    },

    // Sign Out
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        marginTop: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.error,
    },
    signOutText: {
        fontSize: Typography.sizes.bodyLarge,
        color: Colors.error,
        fontWeight: Typography.weights.semibold,
    },

    footer: {
        textAlign: 'center',
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        marginTop: Spacing.lg,
    },
});

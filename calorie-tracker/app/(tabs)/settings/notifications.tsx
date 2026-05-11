/**
 * Notification Settings
 * 
 * Manage app reminders and marketing communications.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUserPreferences, saveUserPreferences, UserPreferences } from '@/src/lib/database';

export default function NotificationsScreen() {
    const colors = useThemeColors();
    const styles = useAppStyles(createStyles);
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [prefs, setPrefs] = useState<UserPreferences | null>(null);

    useEffect(() => {
        if (user?.id) {
            getUserPreferences(user.id).then(p => {
                setPrefs(p);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [user?.id]);

    const updatePreference = async (key: keyof UserPreferences, value: any) => {
        if (!user?.id || !prefs) return;
        const newPrefs = { ...prefs, [key]: value };
        setPrefs(newPrefs);
        await saveUserPreferences(user.id, { [key]: value });
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Reminders</Text>
                <View style={styles.card}>
                    <View style={[styles.row, styles.border]}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
                            <View style={styles.rowText}>
                                <Text style={styles.rowLabel}>Daily Logging Reminders</Text>
                                <Text style={styles.rowSub}>Get notified if you forget to log a meal.</Text>
                            </View>
                        </View>
                        <Switch
                            value={prefs?.notifications_enabled ?? true}
                            onValueChange={(v) => updatePreference('notifications_enabled', v)}
                            trackColor={{ false: colors.border, true: Colors.primary }}
                            thumbColor="#FFF"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="water-outline" size={22} color={Colors.accent} />
                            <View style={styles.rowText}>
                                <Text style={styles.rowLabel}>Water Reminders</Text>
                                <Text style={styles.rowSub}>Stay hydrated with periodic drink alerts.</Text>
                            </View>
                        </View>
                        <Switch
                            value={prefs?.notifications_enabled ?? true}
                            onValueChange={(v) => updatePreference('notifications_enabled', v)}
                            trackColor={{ false: colors.border, true: Colors.primary }}
                            thumbColor="#FFF"
                        />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Marketing</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="mail-outline" size={22} color={Colors.warning} />
                            <View style={styles.rowText}>
                                <Text style={styles.rowLabel}>Email Updates</Text>
                                <Text style={styles.rowSub}>Receive newsletters, tips, and feature updates.</Text>
                            </View>
                        </View>
                        <Switch
                            value={prefs?.marketing_emails ?? false}
                            onValueChange={(v) => updatePreference('marketing_emails', v)}
                            trackColor={{ false: colors.border, true: Colors.primary }}
                            thumbColor="#FFF"
                        />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>System</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.row} onPress={() => {}}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
                            <Text style={styles.rowLabel}>System Notification Settings</Text>
                        </View>
                        <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.footer}>
                    You can also manage notifications in your device's system settings.
                </Text>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.sizes.title,
        fontWeight: Typography.weights.bold,
        color: colors.text,
    },
    scrollContent: {
        padding: Spacing.md,
    },
    sectionTitle: {
        fontSize: Typography.sizes.body,
        fontWeight: Typography.weights.semibold,
        color: colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.sm,
        marginTop: Spacing.lg,
        marginLeft: 4,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
    },
    border: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: Spacing.sm,
    },
    rowText: {
        flex: 1,
    },
    rowLabel: {
        fontSize: Typography.sizes.bodyLarge,
        fontWeight: Typography.weights.medium,
        color: colors.text,
    },
    rowSub: {
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    footer: {
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
});

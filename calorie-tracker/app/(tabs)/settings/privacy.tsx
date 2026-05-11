/**
 * Privacy & Data Settings
 * 
 * Allows users to manage data sharing, export data, and delete their account.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUserPreferences, saveUserPreferences, deleteUserData, UserPreferences } from '@/src/lib/database';

export default function PrivacyScreen() {
    const colors = useThemeColors();
    const styles = useAppStyles(createStyles);
    const router = useRouter();
    const { user, signOut } = useAuth();
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

    const toggleDataSharing = async (value: boolean) => {
        if (!user?.id || !prefs) return;
        const newPrefs = { ...prefs, privacy_data_sharing: value };
        setPrefs(newPrefs);
        await saveUserPreferences(user.id, { privacy_data_sharing: value });
    };

    const handleExportData = () => {
        Alert.alert(
            'Export Data',
            'A copy of your data will be prepared and sent to your email address.',
            [{ text: 'Cancel', style: 'cancel' }, { text: 'Export', onPress: () => Alert.alert('Request Sent', 'Your data export request is being processed.') }]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This action is permanent and will delete all your calorie logs, health profile, and account settings. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Everything',
                    style: 'destructive',
                    onPress: async () => {
                        if (user?.id) {
                            await deleteUserData(user.id);
                            await signOut();
                            router.replace('/(auth)/login');
                        }
                    }
                }
            ]
        );
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
                <Text style={styles.headerTitle}>Privacy & Data</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Data Permissions</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="analytics-outline" size={22} color={Colors.primary} />
                            <View style={styles.rowText}>
                                <Text style={styles.rowLabel}>Usage Analytics</Text>
                                <Text style={styles.rowSub}>Help us improve by sharing anonymous app usage data.</Text>
                            </View>
                        </View>
                        <Switch
                            value={prefs?.privacy_data_sharing ?? true}
                            onValueChange={toggleDataSharing}
                            trackColor={{ false: colors.border, true: Colors.primary }}
                            thumbColor="#FFF"
                        />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Your Information</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={[styles.row, styles.border]} onPress={handleExportData}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="download-outline" size={22} color={Colors.accent} />
                            <View style={styles.rowText}>
                                <Text style={styles.rowLabel}>Export My Data</Text>
                                <Text style={styles.rowSub}>Download a JSON/CSV of all your logs.</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.row} onPress={() => router.push('/(auth)/onboarding' as any)}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="refresh-outline" size={22} color={Colors.warning} />
                            <View style={styles.rowText}>
                                <Text style={styles.rowLabel}>Review Onboarding</Text>
                                <Text style={styles.rowSub}>Change your initial health and goal selections.</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Legal</Text>
                <View style={styles.card}>
                    <TouchableOpacity
                        style={[styles.row, styles.border]}
                        onPress={() => router.push('/settings/privacy-policy')}
                    >
                        <View style={styles.rowLeft}>
                            <Ionicons name="document-text-outline" size={22} color={colors.textSecondary} />
                            <Text style={styles.rowLabel}>Privacy Policy</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => router.push('/settings/terms')}
                    >
                        <View style={styles.rowLeft}>
                            <Ionicons name="shield-outline" size={22} color={colors.textSecondary} />
                            <Text style={styles.rowLabel}>Terms of Service</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Danger Zone</Text>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    <Text style={styles.deleteText}>Delete Account & Data</Text>
                </TouchableOpacity>
                
                <Text style={styles.footer}>
                    Deleting your account is permanent. All your history will be wiped from our servers.
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
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.error,
        marginTop: Spacing.sm,
    },
    deleteText: {
        color: Colors.error,
        fontWeight: Typography.weights.bold,
        fontSize: Typography.sizes.bodyLarge,
    },
    footer: {
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
});

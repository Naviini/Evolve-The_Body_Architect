/**
 * Language Settings
 * 
 * Change the app's display language.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
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

const LANGUAGES = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'es', label: 'Spanish', native: 'Español' },
    { code: 'fr', label: 'French', native: 'Français' },
    { code: 'de', label: 'German', native: 'Deutsch' },
    { code: 'si', label: 'Sinhala', native: 'සිංහල' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'zh', label: 'Chinese', native: '中文' },
    { code: 'ja', label: 'Japanese', native: '日本語' },
];

export default function LanguageScreen() {
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

    const updateLanguage = async (code: string) => {
        if (!user?.id || !prefs) return;
        const newPrefs = { ...prefs, language: code };
        setPrefs(newPrefs);
        await saveUserPreferences(user.id, { language: code });
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
                <Text style={styles.headerTitle}>Language</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Select Language</Text>
                <View style={styles.card}>
                    {LANGUAGES.map((lang, index) => (
                        <TouchableOpacity
                            key={lang.code}
                            style={[styles.row, index !== LANGUAGES.length - 1 && styles.border]}
                            onPress={() => updateLanguage(lang.code)}
                        >
                            <View>
                                <Text style={[styles.rowLabel, prefs?.language === lang.code && styles.selectedLabel]}>
                                    {lang.label}
                                </Text>
                                <Text style={styles.rowSub}>{lang.native}</Text>
                            </View>
                            {prefs?.language === lang.code && (
                                <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                            )}
                            {prefs?.language !== lang.code && <View style={styles.circle} />}
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.footer}>
                    Translations are currently in beta. Some parts of the app may still appear in English.
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
    rowLabel: {
        fontSize: Typography.sizes.bodyLarge,
        fontWeight: Typography.weights.medium,
        color: colors.textSecondary,
    },
    selectedLabel: {
        color: colors.text,
        fontWeight: Typography.weights.bold,
    },
    rowSub: {
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    circle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.border,
    },
    footer: {
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
});

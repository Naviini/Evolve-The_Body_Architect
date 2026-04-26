/**
 * Unit Preferences
 * 
 * Switch between Metric and Imperial units for Weight, Height, and Energy.
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

export default function UnitsScreen() {
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

    const updateUnit = async (key: keyof UserPreferences, value: string) => {
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
                <Text style={styles.headerTitle}>Units & Formatting</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Weight</Text>
                <View style={styles.card}>
                    <UnitRow
                        label="Kilograms (kg)"
                        selected={prefs?.weight_unit === 'kg'}
                        onPress={() => updateUnit('weight_unit', 'kg')}
                    />
                    <UnitRow
                        label="Pounds (lb)"
                        selected={prefs?.weight_unit === 'lb'}
                        onPress={() => updateUnit('weight_unit', 'lb')}
                        last
                    />
                </View>

                <Text style={styles.sectionTitle}>Height</Text>
                <View style={styles.card}>
                    <UnitRow
                        label="Centimeters (cm)"
                        selected={prefs?.height_unit === 'cm'}
                        onPress={() => updateUnit('height_unit', 'cm')}
                    />
                    <UnitRow
                        label="Feet & Inches (ft/in)"
                        selected={prefs?.height_unit === 'ft'}
                        onPress={() => updateUnit('height_unit', 'ft')}
                        last
                    />
                </View>

                <Text style={styles.sectionTitle}>Energy</Text>
                <View style={styles.card}>
                    <UnitRow
                        label="Calories (kcal)"
                        selected={prefs?.energy_unit === 'kcal'}
                        onPress={() => updateUnit('energy_unit', 'kcal')}
                    />
                    <UnitRow
                        label="Kilojoules (kJ)"
                        selected={prefs?.energy_unit === 'kJ'}
                        onPress={() => updateUnit('energy_unit', 'kJ')}
                        last
                    />
                </View>

                <Text style={styles.footer}>
                    Changing units will automatically convert your existing weight and height measurements.
                </Text>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function UnitRow({ label, selected, onPress, last }: { label: string, selected: boolean, onPress: () => void, last?: boolean }) {
    const colors = useThemeColors();
    const styles = useAppStyles(createStyles);
    return (
        <TouchableOpacity style={[styles.row, !last && styles.border]} onPress={onPress}>
            <Text style={[styles.rowLabel, selected && styles.selectedLabel]}>{label}</Text>
            {selected && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
            {!selected && <View style={styles.circle} />}
        </TouchableOpacity>
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

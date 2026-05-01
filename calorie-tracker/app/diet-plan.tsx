import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { getDailyDietPlanForUser } from '@/src/lib/database';
import type { DailyDietPlan } from '@/src/lib/dietPlanEngine';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function DietPlanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);

  const [refreshing, setRefreshing] = useState(false);
  const [dietPlan, setDietPlan] = useState<DailyDietPlan | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const loadPlan = useCallback(async () => {
    try {
      const userId = user?.id || 'demo-user';
      const plan = await getDailyDietPlanForUser(userId, today);
      setDietPlan(plan);
    } catch {
      setDietPlan(null);
    }
  }, [user, today]);

  useFocusEffect(
    useCallback(() => {
      loadPlan();
    }, [loadPlan])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlan();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Today's Diet Plan</Text>
        <View style={styles.headerGhost} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {!dietPlan ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No diet plan found for today</Text>
            <Text style={styles.emptySub}>Complete your profile and try refreshing.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.target}>{dietPlan.calorieTarget} kcal target</Text>
            <Text style={styles.macro}>
              P {dietPlan.macros.protein_g}g | C {dietPlan.macros.carbs_g}g | F {dietPlan.macros.fat_g}g
            </Text>

            {dietPlan.meals.map((meal) => (
              <View key={meal.type} style={styles.mealRow}>
                <Text style={styles.mealType}>{meal.type.toUpperCase()}</Text>
                <View style={styles.mealBody}>
                  <Text style={styles.mealTitle}>{meal.title}</Text>
                  <Text style={styles.mealDesc}>{meal.description}</Text>
                </View>
                <Text style={styles.mealCal}>{meal.calories}kcal</Text>
              </View>
            ))}

            {dietPlan.notes.length > 0 && (
              <View style={styles.notesWrap}>
                <Text style={styles.notesTitle}>Coach Notes</Text>
                {dietPlan.notes.slice(0, 3).map((note, idx) => (
                  <Text key={idx} style={styles.noteItem}>
                    - {note}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 56,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerGhost: {
      width: 36,
      height: 36,
    },
    headerTitle: {
      fontSize: Typography.sizes.subtitle,
      color: colors.text,
      fontWeight: Typography.weights.bold,
    },
    content: {
      padding: Spacing.md,
      paddingBottom: 120,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.md,
    },
    target: {
      fontSize: Typography.sizes.title,
      color: colors.text,
      fontWeight: Typography.weights.bold,
    },
    macro: {
      marginTop: 4,
      marginBottom: Spacing.sm,
      color: colors.textSecondary,
      fontSize: Typography.sizes.body,
    },
    mealRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: Spacing.sm,
      marginTop: Spacing.sm,
      gap: Spacing.sm,
    },
    mealType: {
      minWidth: 72,
      color: Colors.primary,
      fontWeight: Typography.weights.bold,
      fontSize: Typography.sizes.caption,
    },
    mealBody: {
      flex: 1,
    },
    mealTitle: {
      color: colors.text,
      fontWeight: Typography.weights.semibold,
      fontSize: Typography.sizes.body,
    },
    mealDesc: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: Typography.sizes.caption,
      lineHeight: 16,
    },
    mealCal: {
      color: colors.textSecondary,
      fontWeight: Typography.weights.semibold,
      fontSize: Typography.sizes.caption,
    },
    notesWrap: {
      marginTop: Spacing.md,
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    notesTitle: {
      color: colors.text,
      fontWeight: Typography.weights.bold,
      marginBottom: 6,
      fontSize: Typography.sizes.body,
    },
    noteItem: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.caption,
      marginBottom: 4,
      lineHeight: 16,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.md,
    },
    emptyTitle: {
      color: colors.text,
      fontWeight: Typography.weights.bold,
      fontSize: Typography.sizes.bodyLarge,
    },
    emptySub: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: Typography.sizes.caption,
    },
  });

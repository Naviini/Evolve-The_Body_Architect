import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadows, TAB_SCROLL_GUTTER, TAB_SCROLL_BOTTOM_GAP } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { getDailyDietPlanForUser } from '@/src/lib/database';
import type { DailyDietPlan } from '@/src/lib/dietPlanEngine';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTabEntranceAnimation } from '@/hooks/useTabEntranceAnimation';
import { ScreenTitleRow } from '@/components/ui/screen-title-row';

export default function DietPlanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { entranceStyle } = useTabEntranceAnimation();

  const [refreshing, setRefreshing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [dietPlan, setDietPlan] = useState<DailyDietPlan | null>(null);
  const variationRollRef = useRef(0);

  const today = new Date().toISOString().split('T')[0];

  const loadPlan = useCallback(async () => {
    try {
      const userId = user?.id || 'demo-user';
      const plan = await getDailyDietPlanForUser(userId, today, variationRollRef.current);
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

  const onRegenerate = async () => {
    if (!dietPlan || regenerating) return;
    variationRollRef.current += 1;
    setRegenerating(true);
    await loadPlan();
    setRegenerating(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingTop: Spacing.lg }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <ScreenTitleRow title={"Today's Diet Plan"} icon="nutrition-outline" />
        </View>
        <TouchableOpacity
          onPress={onRegenerate}
          style={[styles.headerBtn, (!dietPlan || regenerating) && styles.headerBtnDisabled]}
          disabled={!dietPlan || regenerating}
          activeOpacity={0.72}
          accessibilityLabel="Regenerate diet plan with different meal ideas"
        >
          {regenerating
            ? <ActivityIndicator color={Colors.primary} size="small" />
            : <Ionicons name="shuffle-outline" size={22} color={colors.text} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + TAB_SCROLL_BOTTOM_GAP },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <Animated.View style={entranceStyle}>
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
            <Text style={styles.regenerateHint}>
              Tap the shuffle icon above for alternate meals — same daily targets.
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
        </Animated.View>
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
      paddingHorizontal: TAB_SCROLL_GUTTER,
      paddingBottom: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    headerBtnDisabled: {
      opacity: 0.38,
    },
    headerTitleWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
    },
    content: {
      paddingHorizontal: TAB_SCROLL_GUTTER,
      paddingTop: Spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: Spacing.md,
      overflow: 'hidden',
      ...Shadows.card,
    },
    target: {
      fontSize: Typography.sizes.title,
      color: colors.text,
      fontWeight: Typography.weights.bold,
    },
    macro: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: Typography.sizes.body,
    },
    regenerateHint: {
      marginTop: 8,
      marginBottom: Spacing.sm,
      color: colors.textTertiary,
      fontSize: Typography.sizes.caption,
      lineHeight: 16,
    },
    mealRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderTopWidth: StyleSheet.hairlineWidth,
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
      borderTopWidth: StyleSheet.hairlineWidth,
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
      borderRadius: BorderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: Spacing.lg,
      overflow: 'hidden',
      ...Shadows.card,
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

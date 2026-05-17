import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { useThemedAlert } from '@/src/contexts/ThemedAlertContext';
import { getDailyDietPlanForUser, initDatabase, upsertStoreCartItem } from '@/src/lib/database';
import type { DailyDietPlan } from '@/src/lib/dietPlanEngine';
import {
  buildFitstoreSuggestionsForPlan,
  FITSTORE_RESTAURANT_LABEL,
  type FitstoreDietSuggestion,
} from '@/src/lib/fitstoreDietMatch';
import { getAllProducts } from '@/src/services/storeService';
import { storeProductImageSource } from '@/components/store/productImages';
import { products as storeSeedProducts } from '@/components/store/products';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScreenTitleRow } from '@/components/ui/screen-title-row';

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

const FIT_THUMB = 58;

function FitstoreMealThumb({
  productId,
  remoteImage,
}: {
  productId: string;
  remoteImage?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const src = storeProductImageSource(productId, remoteImage);
  const frame = {
    width: FIT_THUMB,
    height: FIT_THUMB,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primary + '28',
    overflow: 'hidden' as const,
    backgroundColor: Colors.primary + '06',
  };

  if (failed || !src) {
    return (
      <View
        style={[
          frame,
          {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Colors.primary + '08',
          },
        ]}
      >
        <Ionicons name="restaurant-outline" size={24} color={Colors.primary + 'AA'} />
      </View>
    );
  }

  return (
    <View style={frame}>
      <Image
        source={src as any}
        style={{ width: FIT_THUMB, height: FIT_THUMB }}
        resizeMode="cover"
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

export default function DietPlanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { alert } = useThemedAlert();
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);

  const [refreshing, setRefreshing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [dietPlan, setDietPlan] = useState<DailyDietPlan | null>(null);
  const [fitstoreMatches, setFitstoreMatches] = useState<FitstoreDietSuggestion[]>([]);
  const [orderingProductId, setOrderingProductId] = useState<string | null>(null);
  const variationRollRef = useRef(0);

  const today = new Date().toISOString().split('T')[0];

  const loadPlan = useCallback(async () => {
    try {
      const userId = user?.id || 'demo-user';
      const plan = await getDailyDietPlanForUser(userId, today, variationRollRef.current);
      setDietPlan(plan);
      try {
        const catalog = await getAllProducts();
        let suggestions = plan ? buildFitstoreSuggestionsForPlan(plan.meals, catalog) : [];
        // Older installs may have SQLite rows missing "Healthy Meals" — fall back to bundled seed catalogue.
        if (plan && suggestions.length === 0) {
          suggestions = buildFitstoreSuggestionsForPlan(plan.meals, storeSeedProducts);
        }
        setFitstoreMatches(suggestions);
      } catch {
        try {
          setFitstoreMatches(
            plan ? buildFitstoreSuggestionsForPlan(plan.meals, storeSeedProducts) : []
          );
        } catch {
          setFitstoreMatches([]);
        }
      }
    } catch {
      setDietPlan(null);
      setFitstoreMatches([]);
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

  const fitByMealType = useMemo(() => {
    const m = new Map<string, FitstoreDietSuggestion>();
    for (const s of fitstoreMatches) {
      m.set(s.meal.type, s);
    }
    return m;
  }, [fitstoreMatches]);

  const onOpenFitstoreKitchens = () => {
    router.push({ pathname: '/store', params: { tab: 'Restaurants' } } as any);
  };

  const onDeliverMatchedMeal = async (row: FitstoreDietSuggestion) => {
    if (orderingProductId) return;
    try {
      setOrderingProductId(row.product.id);
      await initDatabase();
      await upsertStoreCartItem(user?.id || 'demo-user', row.product, 1);
      router.push({ pathname: '/store', params: { screen: 'checkout' } } as any);
    } catch {
      alert(
        'Could not add item',
        'Please try again, or open the FitStore manually from the Shopping tab.'
      );
    } finally {
      setOrderingProductId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <ScreenTitleRow title={"Today's Diet Plan"} icon="nutrition-outline" />
        </View>
        <TouchableOpacity
          onPress={onRegenerate}
          style={[styles.headerBtn, (!dietPlan || regenerating) && styles.headerBtnDisabled]}
          disabled={!dietPlan || regenerating}
          accessibilityLabel="Regenerate diet plan with different meal ideas"
        >
          {regenerating
            ? <ActivityIndicator color={Colors.primary} size="small" />
            : <Ionicons name="shuffle-outline" size={22} color={colors.text} />}
        </TouchableOpacity>
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
            <Text style={styles.regenerateHint}>
              Tap the shuffle icon above for alternate meals — same daily targets.
            </Text>

            <Text style={styles.fitstoreScreenHint}>
              Each slot below lists a FitStore partner pick tied to your plan — tap Deliver to checkout.
            </Text>

            {dietPlan.meals.map((meal) => {
              const row = fitByMealType.get(meal.type);
              const skuCal = row?.product.nutrition?.calories;
              const busy = row ? orderingProductId === row.product.id : false;

              return (
                <React.Fragment key={meal.type}>
                  <View style={styles.mealRow}>
                    <Text style={styles.mealType}>{meal.type.toUpperCase()}</Text>
                    <View style={styles.mealBody}>
                      <Text style={styles.mealTitle}>{meal.title}</Text>
                      <Text style={styles.mealDesc}>{meal.description}</Text>
                    </View>
                    <Text style={styles.mealCal}>{meal.calories}kcal</Text>
                  </View>

                  {row && (
                    <View style={styles.mealFitstoreWrap}>
                      <View style={styles.mealFitstoreTop}>
                        <FitstoreMealThumb productId={row.product.id} remoteImage={row.product.image} />
                        <View style={styles.mealFitstoreBody}>
                          <Text style={styles.mealFitstoreLabel}>{FITSTORE_RESTAURANT_LABEL}</Text>
                          <Text style={styles.mealFitstoreSku}>{row.product.name}</Text>
                          <Text style={styles.mealFitstoreMeta}>
                            {row.isDrinkAddon
                              ? 'FitStore grocery'
                              : row.product.partnerName
                                ? `${row.product.partnerName} · ~${row.eta}`
                                : `~${row.eta}`}
                            {' · '}
                            {formatRs(row.product.price)}
                            {typeof skuCal === 'number' ? ` · ~${skuCal} kcal` : ''}
                          </Text>
                          {row.hint && <Text style={styles.mealFitstoreRowHint}>{row.hint}</Text>}
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.mealDeliverBtn, (!!orderingProductId && !busy) && { opacity: 0.5 }]}
                        onPress={() => onDeliverMatchedMeal(row)}
                        disabled={orderingProductId !== null}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={`Deliver ${row.product.name}`}
                      >
                        <LinearGradient
                          colors={[Colors.primary, Colors.primaryDark]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.mealDeliverBtnGrad}
                        >
                          {busy ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Ionicons name="bicycle-outline" color="#fff" size={17} />
                              <Text style={styles.mealDeliverBtnText}>Deliver this meal</Text>
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                </React.Fragment>
              );
            })}

            <TouchableOpacity style={styles.browseKitchens} onPress={onOpenFitstoreKitchens}>
              <Text style={styles.browseKitchensText}>Browse kitchens on FitStore</Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={Colors.primary + 'CC'}
                style={styles.browseKitchensChevron}
              />
            </TouchableOpacity>

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
      color: colors.textSecondary,
      fontSize: Typography.sizes.body,
    },
    regenerateHint: {
      marginTop: 8,
      marginBottom: Spacing.xs,
      color: colors.textTertiary,
      fontSize: Typography.sizes.caption,
      lineHeight: 16,
    },
    fitstoreScreenHint: {
      marginBottom: Spacing.xs,
      color: colors.textTertiary,
      fontSize: Typography.sizes.caption,
      lineHeight: 16,
    },
    mealFitstoreWrap: {
      marginBottom: Spacing.sm,
      marginTop: Spacing.xs,
      padding: Spacing.sm,
      borderRadius: BorderRadius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    mealFitstoreTop: {
      flexDirection: 'row',
      gap: Spacing.sm,
      alignItems: 'flex-start',
    },
    mealFitstoreBody: {
      flex: 1,
      minWidth: 0,
    },
    mealFitstoreLabel: {
      fontSize: 10,
      letterSpacing: 0.35,
      fontWeight: Typography.weights.semibold,
      color: Colors.primary,
      opacity: 0.92,
      marginBottom: 2,
    },
    mealFitstoreSku: {
      fontWeight: Typography.weights.semibold,
      fontSize: Typography.sizes.body,
      color: colors.text,
      lineHeight: 20,
    },
    mealFitstoreMeta: {
      marginTop: 4,
      fontSize: Typography.sizes.caption,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    mealFitstoreRowHint: {
      marginTop: 4,
      fontSize: Typography.sizes.caption,
      fontStyle: 'italic',
      lineHeight: 15,
      color: colors.textTertiary,
    },
    mealDeliverBtn: {
      marginTop: Spacing.sm,
      borderRadius: BorderRadius.sm,
      overflow: 'hidden',
    },
    mealDeliverBtnGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.sm,
    },
    mealDeliverBtnText: {
      color: '#fff',
      fontWeight: Typography.weights.bold,
      fontSize: Typography.sizes.caption,
    },
    browseKitchens: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginTop: Spacing.sm,
      paddingTop: Spacing.xs,
      paddingBottom: 2,
    },
    browseKitchensText: {
      fontWeight: Typography.weights.medium,
      fontSize: Typography.sizes.caption,
      color: Colors.primary,
      opacity: 0.92,
    },
    browseKitchensChevron: {
      marginTop: 0,
      opacity: 0.85,
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

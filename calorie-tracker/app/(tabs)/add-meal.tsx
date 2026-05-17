/**
 * Add Meal Screen — Manual Food Entry Modal
 *
 * Allows users to search 5 000+ foods (South-Asian / Indian / Sri Lankan
 * catalog synced from Supabase) or create custom entries.
 * Search is offline-first: queries local SQLite after the first sync.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    Animated,
    ActivityIndicator,
    Modal,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography, TAB_SCROLL_GUTTER, TAB_SCROLL_BOTTOM_GAP } from '@/constants/theme';
import { addMealEntry, searchFoodItems, insertFoodItem , generateId } from '@/src/lib/database';

import { useAuth } from '@/src/contexts/AuthContext';
import { MealType, FoodItem } from '@/src/types';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { syncFoodCatalog, getCatalogStatus, CatalogStatus } from '@/src/lib/foodCatalogSync';
import { ScreenTitleRow } from '@/components/ui/screen-title-row';

/** g / ml — user enters how much they actually ate using the catalog's scale. */
function portionMode(unit: string): 'weight' | 'servings' {
    const u = unit.trim().toLowerCase();
    if (
        u === 'g' || u === 'gram' || u === 'grams' ||
        u === 'ml' || u === 'milliliter' || u === 'milliliters' ||
        u === 'millilitre' || u === 'millilitres'
    ) return 'weight';
    return 'servings';
}

type PopularNutrition = {
    name: string;
    cal: number;
    p: number;
    c: number;
    f: number;
    unit: string;
};

/** Turn shortcut rows (`200 g`, `1 cup`) into proper FoodItems for portion math. */
function popularRowToFood(row: PopularNutrition, id: string): FoodItem {
    const raw = row.unit.trim();
    const gMatch = /^([\d.]+)\s*g$/i.exec(raw);
    const mlMatch = /^([\d.]+)\s*ml$/i.exec(raw);
    let serving_size = 1;
    let serving_unit = raw;

    if (gMatch) {
        serving_size = Number.parseFloat(gMatch[1]);
        serving_unit = 'g';
    } else if (mlMatch) {
        serving_size = Number.parseFloat(mlMatch[1]);
        serving_unit = 'ml';
    } else if (raw) {
        const composite = /^([\d.]+)\s+(.+)$/.exec(raw);
        if (composite) {
            serving_size = Number.parseFloat(composite[1]);
            serving_unit = composite[2].trim();
        } else {
            serving_size = 1;
            serving_unit = raw;
        }
    }
    return {
        id,
        name: row.name,
        brand: null,
        serving_size,
        serving_unit,
        calories: row.cal,
        protein_g: row.p,
        carbs_g: row.c,
        fat_g: row.f,
        fiber_g: 0,
        image_url: null,
        barcode: null,
        is_verified: true,
        created_at: new Date().toISOString(),
    };
}

/** Readable reference for one nutrition label (servings-based foods). */
function servingRefLabel(f: FoodItem): string {
    const qty = Number(f.serving_size);
    const u = String(f.serving_unit).trim();
    if (!Number.isFinite(qty) || qty <= 0 || !u) return u;
    return `${qty} ${u}`;
}

function round1(n: number) {
    return Math.round(n * 10) / 10;
}

export default function AddMealScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams<{ mealType?: string; date?: string }>();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedMealType, setSelectedMealType] = useState<MealType>(
        (params.mealType as MealType) || 'lunch'
    );
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [adding, setAdding] = useState(false);
    const [sessionCount, setSessionCount] = useState(0);

    // ── Catalog sync state ────────────────────────────────────
    const [catalogStatus, setCatalogStatus] = useState<CatalogStatus | null>(null);
    const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);

    // Custom food form
    const [foodName, setFoodName] = useState('');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');
    const [servings, setServings] = useState('1');

    /** Food chosen from catalogue — modal asks for portion before logging. */
    const [portionFood, setPortionFood] = useState<FoodItem | null>(null);
    const [portionInput, setPortionInput] = useState('1');

    // ── Toast (visual only — no auto-navigation) ─────────────
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const toastAnim = useRef(new Animated.Value(0)).current;

    // ── Debounce ref ──────────────────────────────────────────
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Kick off catalog sync on mount ────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function init() {
            const status = await getCatalogStatus();
            if (!cancelled) setCatalogStatus(status);

            if (status.needsSync) {
                await syncFoodCatalog(false, (done, total) => {
                    if (!cancelled) setSyncProgress({ done, total });
                });
                if (!cancelled) {
                    setSyncProgress(null);
                    const updated = await getCatalogStatus();
                    setCatalogStatus(updated);
                }
            }
        }

        init();
        return () => { cancelled = true; };
    }, []);

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        toastAnim.stopAnimation();
        toastAnim.setValue(0);
        Animated.sequence([
            Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.delay(1400),
            Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => setToast(null));
    };

    const resetSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
    };

    const resetCustomForm = () => {
        setFoodName('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFat('');
        setServings('1');
        setShowCustomForm(false);
    };

    // ── Debounced search (300 ms) ─────────────────────────────
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (searchTimer.current) clearTimeout(searchTimer.current);

        if (query.length < 2) {
            setSearchResults([]);
            setSearching(false);
            return;
        }

        setSearching(true);
        searchTimer.current = setTimeout(async () => {
            const results = await searchFoodItems(query);
            setSearchResults(results);
            setSearching(false);
        }, 300);
    }, []);

    // ── Catalog status bar helpers ────────────────────────────
    const catalogLabel = (() => {
        if (syncProgress) {
            const pct = syncProgress.total > 0
                ? Math.round((syncProgress.done / syncProgress.total) * 100)
                : 0;
            return `Syncing catalog… ${syncProgress.done.toLocaleString()} / ${syncProgress.total.toLocaleString()} (${pct}%)`;
        }
        if (catalogStatus?.isSyncing) return 'Syncing food catalog…';
        if (catalogStatus && catalogStatus.itemCount > 0) {
            return `${catalogStatus.itemCount.toLocaleString()}+ foods available`;
        }
        return 'Loading food catalog…';
    })();


    const closePortionModal = useCallback(() => {
        setPortionFood(null);
        setPortionInput('1');
    }, []);

    const openPortionPicker = useCallback((food: FoodItem) => {
        setPortionFood(food);
        const mode = portionMode(food.serving_unit);
        const sz = Number(food.serving_size);
        setPortionInput(
            mode === 'weight'
                ? String(Number.isFinite(sz) && sz > 0 ? sz : 100)
                : '1',
        );
    }, []);

    const confirmPortionAndAdd = async () => {
        if (!portionFood || adding) return;
        const f = portionFood;
        const mode = portionMode(f.serving_unit);
        const num = Number.parseFloat(String(portionInput).replace(',', '.'));
        if (!Number.isFinite(num) || num <= 0) {
            showToast('Enter a valid portion amount.', false);
            return;
        }

        const refSize = Number(f.serving_size);
        const baseline = Number.isFinite(refSize) && refSize > 0 ? refSize : (mode === 'weight' ? 100 : 1);

        let mult: number;
        let loggedName: string;
        if (mode === 'weight') {
            mult = num / baseline;
            loggedName = `${f.name} (${round1(num)} ${f.serving_unit})`;
        } else {
            mult = num;
            loggedName = `${f.name} (${round1(mult)} × ${servingRefLabel(f)})`;
        }

        setAdding(true);
        try {
            const userId = user?.id || 'demo-user';
            const date = params.date || new Date().toISOString().split('T')[0];

            await addMealEntry({
                user_id: userId,
                food_item_id: f.id,
                food_name: loggedName,
                meal_type: selectedMealType,
                servings: round1(mult),
                calories: Math.round(f.calories * mult),
                protein_g: round1(f.protein_g * mult),
                carbs_g: round1(f.carbs_g * mult),
                fat_g: round1(f.fat_g * mult),
                logged_at: date,
            });

            setSessionCount((c) => c + 1);
            closePortionModal();
            resetSearch();
            showToast(`"${loggedName}" added!`, true);
        } catch {
            showToast('Failed to add — please try again.', false);
        } finally {
            setAdding(false);
        }
    };

    const handleAddCustom = async () => {
        if (!foodName || !calories) {
            showToast('Please enter a food name and calories.', false);
            return;
        }
        if (adding) return;
        setAdding(true);

        try {
            const userId = user?.id || 'demo-user';
            const date = params.date || new Date().toISOString().split('T')[0];
            const foodId = generateId();

            await insertFoodItem({
                id: foodId,
                name: foodName,
                serving_size: 1,
                serving_unit: 'serving',
                calories: parseFloat(calories) || 0,
                protein_g: parseFloat(protein) || 0,
                carbs_g: parseFloat(carbs) || 0,
                fat_g: parseFloat(fat) || 0,
            });

            await addMealEntry({
                user_id: userId,
                food_item_id: foodId,
                food_name: foodName,
                meal_type: selectedMealType,
                servings: parseFloat(servings) || 1,
                calories: parseFloat(calories) || 0,
                protein_g: parseFloat(protein) || 0,
                carbs_g: parseFloat(carbs) || 0,
                fat_g: parseFloat(fat) || 0,
                logged_at: date,
            });

            setSessionCount(c => c + 1);
            resetCustomForm();                      // clear form, collapse it
            showToast(`"${foodName}" added!`, true);
        } catch {
            showToast('Failed to add — please try again.', false);
        } finally {
            setAdding(false);
        }
    };

    let portionPreview: {
        cal: number; p: number; c: number; f: number;
    } | null = null;
    if (portionFood) {
        const mode = portionMode(portionFood.serving_unit);
        const num = Number.parseFloat(String(portionInput).replace(',', '.'));
        if (Number.isFinite(num) && num > 0) {
            const refSize = Number(portionFood.serving_size);
            const baseline =
                Number.isFinite(refSize) && refSize > 0 ? refSize : (mode === 'weight' ? 100 : 1);
            const mult = mode === 'weight' ? num / baseline : num;
            portionPreview = {
                cal: Math.round(portionFood.calories * mult),
                p: round1(portionFood.protein_g * mult),
                c: round1(portionFood.carbs_g * mult),
                f: round1(portionFood.fat_g * mult),
            };
        }
    }

    const portionHint = portionFood
        ? portionMode(portionFood.serving_unit) === 'weight'
            ? `Nutrition facts are based on ${portionFood.serving_size} ${portionFood.serving_unit}. Enter how much you actually ate:`
            : `Nutrition facts are based on ${servingRefLabel(portionFood)}. Enter number of servings you had:`
        : '';

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: Spacing.lg }]}>
                {/* Close — go back without Done */}
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <ScreenTitleRow title="Add Meal" icon="restaurant-outline" />
                    {sessionCount > 0 && (
                        <View style={styles.sessionBadge}>
                            <Text style={styles.sessionBadgeText}>{sessionCount} added</Text>
                        </View>
                    )}
                </View>

                {/* Done — explicit "I'm finished" action */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[styles.doneButton, sessionCount === 0 && styles.doneButtonDisabled]}
                    disabled={sessionCount === 0}
                >
                    <Text style={[styles.doneButtonText, sessionCount === 0 && { color: colors.textTertiary }]}>
                        Done
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Meal Type Selector */}
            <View style={styles.mealTypeRow}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                    <TouchableOpacity
                        key={type}
                        style={[
                            styles.mealTypeButton,
                            selectedMealType === type && styles.mealTypeButtonActive,
                        ]}
                        onPress={() => setSelectedMealType(type)}
                    >
                        <Text
                            style={[
                                styles.mealTypeText,
                                selectedMealType === type && styles.mealTypeTextActive,
                            ]}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: insets.bottom + TAB_SCROLL_BOTTOM_GAP },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Catalog sync status */}
                <View style={styles.catalogBar}>
                    {(syncProgress || catalogStatus?.isSyncing) ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 6 }} />
                    ) : (
                        <Ionicons
                            name={catalogStatus && catalogStatus.itemCount > 0 ? 'checkmark-circle' : 'cloud-download-outline'}
                            size={14}
                            color={catalogStatus && catalogStatus.itemCount > 0 ? Colors.success : Colors.primary}
                            style={{ marginRight: 4 }}
                        />
                    )}
                    <Text style={styles.catalogBarText}>{catalogLabel}</Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={colors.textTertiary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={
                            catalogStatus && catalogStatus.itemCount > 0
                                ? `Search ${catalogStatus.itemCount.toLocaleString()}+ foods…`
                                : 'Search foods…'
                        }
                        placeholderTextColor={colors.textTertiary}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                    {searching
                        ? <ActivityIndicator size="small" color={colors.textTertiary} />
                        : searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')}>
                                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                            </TouchableOpacity>
                        )
                    }
                </View>

                {/* No results hint */}
                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <View style={styles.emptySearch}>
                        <Text style={styles.emptySearchText}>
                            No results for {'"'}{searchQuery}{'"'} — try a shorter word or add a custom entry below.
                        </Text>
                    </View>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <View style={styles.resultsList}>
                        {searchResults.map((food) => (
                            <TouchableOpacity
                                key={food.id}
                                style={styles.resultItem}
                                onPress={() => openPortionPicker(food)}
                            >
                                <View style={styles.resultLeft}>
                                    <Text style={styles.resultName}>{food.name}</Text>
                                    <Text style={styles.resultDetail}>
                                        {food.serving_size}{food.serving_unit} • P: {food.protein_g}g C: {food.carbs_g}g F: {food.fat_g}g
                                    </Text>
                                </View>
                                <View style={styles.resultRight}>
                                    <Text style={styles.resultCals}>{Math.round(food.calories)}</Text>
                                    <Text style={styles.resultUnit}>kcal</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Or Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or add custom food</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Custom Food Form */}
                <TouchableOpacity
                    style={styles.customToggle}
                    onPress={() => setShowCustomForm(!showCustomForm)}
                >
                    <Ionicons
                        name={showCustomForm ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={Colors.primary}
                    />
                    <Text style={styles.customToggleText}>
                        {showCustomForm ? 'Hide custom form' : 'Create custom entry'}
                    </Text>
                </TouchableOpacity>

                {showCustomForm && (
                    <View style={styles.customForm}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Food Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Grilled Chicken Breast"
                                placeholderTextColor={colors.textTertiary}
                                value={foodName}
                                onChangeText={setFoodName}
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Calories *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor={colors.textTertiary}
                                    keyboardType="numeric"
                                    value={calories}
                                    onChangeText={setCalories}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Servings</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="1"
                                    placeholderTextColor={colors.textTertiary}
                                    keyboardType="numeric"
                                    value={servings}
                                    onChangeText={setServings}
                                />
                            </View>
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.inputLabel, { color: Colors.protein }]}>Protein (g)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor={colors.textTertiary}
                                    keyboardType="numeric"
                                    value={protein}
                                    onChangeText={setProtein}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.inputLabel, { color: Colors.carbs }]}>Carbs (g)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor={colors.textTertiary}
                                    keyboardType="numeric"
                                    value={carbs}
                                    onChangeText={setCarbs}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.inputLabel, { color: Colors.fat }]}>Fat (g)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor={colors.textTertiary}
                                    keyboardType="numeric"
                                    value={fat}
                                    onChangeText={setFat}
                                />
                            </View>
                        </View>

                        {/* Add Button */}
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleAddCustom}
                            disabled={adding}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={adding ? [colors.border, colors.border] : [Colors.primary, Colors.primaryDark]}
                                style={styles.addButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {adding
                                    ? <ActivityIndicator size="small" color="#FFF" />
                                    : <><Ionicons name="add-circle" size={22} color="#FFF" />
                                        <Text style={styles.addButtonText}>Add to {selectedMealType}</Text></>
                                }
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Popular Foods */}
                {searchQuery.length === 0 && (
                <Text style={styles.sectionTitle}>Popular Foods</Text>
                )}
                {searchQuery.length === 0 && [
                    { name: 'White Rice (cooked)',   cal: 206, p: 4.3, c: 45,  f: 0.4, unit: '1 cup' },
                    { name: 'Chicken Curry',          cal: 210, p: 18,  c: 6,   f: 12,  unit: '200g' },
                    { name: 'Roti / Chapati',         cal: 104, p: 3.1, c: 18,  f: 2.5, unit: '1 piece' },
                    { name: 'Dal (cooked lentils)',   cal: 230, p: 18,  c: 40,  f: 1,   unit: '1 cup' },
                    { name: 'Egg (large)',             cal: 72,  p: 6.3, c: 0.4, f: 4.8, unit: '1 egg' },
                    { name: 'Banana',                 cal: 105, p: 1.3, c: 27,  f: 0.4, unit: '1 medium' },
                    { name: 'Sambar',                 cal: 80,  p: 4,   c: 13,  f: 1.2, unit: '200ml' },
                    { name: 'Idli',                   cal: 58,  p: 2,   c: 12,  f: 0.4, unit: '1 piece' },
                    { name: 'Dosa (plain)',            cal: 133, p: 2.7, c: 25,  f: 2.5, unit: '1 piece' },
                    { name: 'Paratha (plain)',         cal: 257, p: 5.6, c: 36,  f: 10,  unit: '1 piece' },
                    { name: 'Biryani (chicken)',       cal: 290, p: 16,  c: 38,  f: 8,   unit: '200g' },
                    { name: 'Coconut Milk',            cal: 230, p: 2.3, c: 6,   f: 24,  unit: '240ml' },
                ].map((food: PopularNutrition, i: number) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.popularItem, adding && { opacity: 0.45 }]}
                        disabled={adding}
                        onPress={() => openPortionPicker(popularRowToFood(food, generateId()))}
                    >
                        <View style={styles.popularLeft}>
                            <Text style={styles.popularName}>{food.name}</Text>
                            <Text style={styles.popularDetail}>
                                {food.unit} • P: {food.p}g C: {food.c}g F: {food.f}g
                            </Text>
                        </View>
                        <View style={styles.popularRight}>
                            <Text style={styles.popularCals}>{food.cal}</Text>
                            <Text style={styles.popularUnit}>kcal</Text>
                        </View>
                    </TouchableOpacity>
                ))}

            </ScrollView>

            {/* ── Toast notification (same style as diary screen) ── */}
            {toast !== null && (
                <Animated.View
                    style={[
                        styles.toast,
                        !toast.ok && styles.toastError,
                        {
                            opacity: toastAnim,
                            transform: [{
                                translateY: toastAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0],
                                }),
                            }],
                        },
                    ]}
                    pointerEvents="none"
                >
                    <Ionicons
                        name={toast.ok ? 'checkmark-circle' : 'alert-circle'}
                        size={22}
                        color={toast.ok ? Colors.success : Colors.error}
                    />
                    <Text style={styles.toastText}>{toast.msg}</Text>
                </Animated.View>
            )}

            <Modal
                visible={portionFood !== null}
                transparent
                animationType="fade"
                onRequestClose={closePortionModal}
            >
                <View style={styles.portionSheetWrap}>
                    <Pressable style={styles.portionBackdrop} onPress={closePortionModal} />

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.portionSheetInner}
                    >
                        <View style={[styles.portionCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                            <Text style={[styles.portionTitle, { color: colors.text }]}>{portionFood?.name}</Text>
                            <Text style={[styles.portionSubtitle, { color: colors.textTertiary }]}>
                                {portionHint}
                            </Text>

                            <Text style={[styles.portionLabel, { color: colors.textSecondary }]}>
                                {portionFood && portionMode(portionFood.serving_unit) === 'weight'
                                    ? `Amount (${portionFood.serving_unit})`
                                    : 'Servings'}
                            </Text>
                            <TextInput
                                style={[
                                    styles.portionInput,
                                    { borderColor: colors.border, backgroundColor: colors.background, color: colors.text },
                                ]}
                                value={portionInput}
                                onChangeText={setPortionInput}
                                keyboardType="decimal-pad"
                                placeholder={
                                    portionFood && portionMode(portionFood.serving_unit) === 'weight'
                                        ? String(portionFood.serving_size ?? '')
                                        : '1'
                                }
                                placeholderTextColor={colors.textTertiary}
                            />

                            {portionPreview && (
                                <View style={[styles.portionTotals, { backgroundColor: colors.background }]}>
                                    <Text style={[styles.portionTotalCals, { color: Colors.primary }]}>
                                        {portionPreview.cal} kcal
                                    </Text>
                                    <Text style={[styles.portionTotalMacros, { color: colors.textTertiary }]}>
                                        P: {portionPreview.p}g • C: {portionPreview.c}g • F: {portionPreview.f}g
                                    </Text>
                                </View>
                            )}

                            <View style={styles.portionActions}>
                                <TouchableOpacity
                                    style={[styles.portionBtnSecondary, { borderColor: colors.border }]}
                                    onPress={closePortionModal}
                                    disabled={adding}
                                >
                                    <Text style={[styles.portionBtnSecondaryText, { color: colors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.portionBtnPrimary,
                                        !portionPreview && { opacity: 0.45 },
                                    ]}
                                    onPress={confirmPortionAndAdd}
                                    disabled={!portionPreview || adding}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={[Colors.primary, Colors.primaryDark]}
                                        style={styles.portionBtnGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        {adding
                                            ? <ActivityIndicator color="#FFF" size="small" />
                                            : <Text style={styles.portionBtnPrimaryText}>Add</Text>}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: TAB_SCROLL_GUTTER,
        paddingBottom: Spacing.sm,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    sessionBadge: {
        backgroundColor: Colors.primary + '28',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: Colors.primary + '55',
    },
    sessionBadgeText: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: Typography.weights.bold,
    },
    doneButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        minWidth: 56,
        alignItems: 'center',
    },
    doneButtonDisabled: {
        backgroundColor: colors.surfaceLight,
        borderWidth: 1,
        borderColor: colors.border,
    },
    doneButtonText: {
        fontSize: 14,
        color: '#FFF',
        fontWeight: Typography.weights.bold,
    },


    // Meal Type
    mealTypeRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: TAB_SCROLL_GUTTER,
        marginBottom: Spacing.md,
    },
    mealTypeButton: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    mealTypeButtonActive: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(108, 99, 255, 0.15)',
    },
    mealTypeText: {
        fontSize: Typography.sizes.caption,
        color: colors.textSecondary,
        fontWeight: Typography.weights.medium,
    },
    mealTypeTextActive: {
        color: Colors.primary,
        fontWeight: Typography.weights.bold,
    },

    scrollContent: {
        paddingHorizontal: TAB_SCROLL_GUTTER,
        paddingTop: Spacing.md,
    },

    // Catalog status bar
    catalogBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        marginBottom: 4,
    },
    catalogBarText: {
        fontSize: 12,
        color: colors.textTertiary,
        flex: 1,
    },

    // Empty search hint
    emptySearch: {
        paddingHorizontal: Spacing.sm,
        paddingBottom: Spacing.sm,
    },
    emptySearchText: {
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // Search Bar
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        fontSize: Typography.sizes.bodyLarge,
        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    },

    // Results
    resultsList: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: Spacing.md,
        overflow: 'hidden',
    },
    resultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    resultLeft: {
        flex: 1,
    },
    resultName: {
        fontSize: Typography.sizes.bodyLarge,
        color: colors.text,
        fontWeight: Typography.weights.medium,
    },
    resultDetail: {
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    resultRight: {
        alignItems: 'flex-end',
        marginLeft: Spacing.md,
    },
    resultCals: {
        fontSize: Typography.sizes.bodyLarge,
        color: Colors.primary,
        fontWeight: Typography.weights.bold,
    },
    resultUnit: {
        fontSize: 10,
        color: colors.textTertiary,
    },

    // Divider
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.md,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        marginHorizontal: Spacing.sm,
    },

    // Custom Toggle
    customToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: Spacing.md,
    },
    customToggleText: {
        fontSize: Typography.sizes.body,
        color: Colors.primary,
        fontWeight: Typography.weights.medium,
    },

    // Custom Form
    customForm: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    inputGroup: {
        marginBottom: Spacing.sm,
    },
    inputLabel: {
        fontSize: Typography.sizes.caption,
        color: colors.textSecondary,
        fontWeight: Typography.weights.medium,
        marginBottom: 4,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        color: colors.text,
        fontSize: Typography.sizes.body,
    },
    inputRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },

    // Add Button
    addButton: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        marginTop: Spacing.sm,
    },
    addButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    addButtonText: {
        fontSize: Typography.sizes.bodyLarge,
        color: '#FFF',
        fontWeight: Typography.weights.bold,
    },

    // Popular Foods
    sectionTitle: {
        fontSize: Typography.sizes.subtitle,
        color: colors.text,
        fontWeight: Typography.weights.bold,
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
    },
    popularItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.sm,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    popularLeft: {
        flex: 1,
    },
    popularName: {
        fontSize: Typography.sizes.body,
        color: colors.text,
        fontWeight: Typography.weights.medium,
    },
    popularDetail: {
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    popularRight: {
        alignItems: 'flex-end',
        marginLeft: Spacing.md,
    },
    popularCals: {
        fontSize: Typography.sizes.bodyLarge,
        color: Colors.primary,
        fontWeight: Typography.weights.bold,
    },
    popularUnit: {
        fontSize: 10,
        color: colors.textTertiary,
    },

    // Portion picker modal
    portionSheetWrap: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    portionBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.52)',
    },
    portionSheetInner: {
        zIndex: 1,
        width: '100%',
        maxWidth: 440,
        alignSelf: 'center',
    },
    portionCard: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        padding: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 14,
    },
    portionTitle: {
        fontSize: Typography.sizes.bodyLarge,
        fontWeight: Typography.weights.bold,
        marginBottom: 8,
    },
    portionSubtitle: {
        fontSize: Typography.sizes.caption,
        lineHeight: 18,
        marginBottom: Spacing.md,
    },
    portionLabel: {
        fontSize: Typography.sizes.caption,
        fontWeight: Typography.weights.medium,
        marginBottom: 6,
    },
    portionInput: {
        borderWidth: 1,
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        fontSize: Typography.sizes.bodyLarge,
        fontWeight: Typography.weights.semibold,
    },
    portionTotals: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.sm,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
    },
    portionTotalCals: {
        fontSize: Typography.sizes.subtitle,
        fontWeight: Typography.weights.bold,
    },
    portionTotalMacros: {
        marginTop: 4,
        fontSize: Typography.sizes.caption,
    },
    portionActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    portionBtnSecondary: {
        flex: 1,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    portionBtnSecondaryText: {
        fontWeight: Typography.weights.medium,
        fontSize: Typography.sizes.body,
    },
    portionBtnPrimary: {
        flex: 1,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
        minHeight: 48,
    },
    portionBtnGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: BorderRadius.sm,
    },
    portionBtnPrimaryText: {
        color: '#FFF',
        fontWeight: Typography.weights.bold,
        fontSize: Typography.sizes.body,
    },

    // ── Toast ──
    toast: {
        position: 'absolute',
        bottom: 40,
        left: Spacing.md,
        right: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.card,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
    },
    toastError: {
        borderColor: Colors.error + '55',
        backgroundColor: Colors.error + '12',
    },
    toastText: {
        flex: 1,
        fontSize: Typography.sizes.body,
        color: colors.text,
        fontWeight: Typography.weights.medium,
    },
});

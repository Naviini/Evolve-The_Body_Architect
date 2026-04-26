/**
 * Diary Screen — Daily Food Log
 *
 * Full CRUD: create → add-meal, edit → bottom sheet modal,
 * delete → direct (no blocking Alert), undo/redo history stack.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Animated,
    Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Colors,
    Spacing,
    BorderRadius,
    Typography,
    Shadows,
    MealIcons,
    MealLabels,
} from '@/constants/theme';
import {
    getMealEntriesByDate,
    deleteMealEntry,
    restoreMealEntry,
    updateMealEntry,
    getDailyCalorieGoalForUser,
} from '@/src/lib/database';
import { useAuth } from '@/src/contexts/AuthContext';
import { MealEntry, MealType } from '@/src/types';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';

// ── constants ────────────────────────────────────────────────
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

type HistoryAction =
    | { kind: 'delete'; entry: MealEntry }
    | { kind: 'update'; before: MealEntry; after: Partial<MealEntry> };

// ════════════════════════════════════════════════════════════
// Main Screen
// ════════════════════════════════════════════════════════════
export default function DiaryScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
    const { user } = useAuth();
    const router = useRouter();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [meals, setMeals] = useState<MealEntry[]>([]);
    const [calorieGoal, setCalorieGoal] = useState(2000);
    const [expandedMeal, setExpandedMeal] = useState<MealType | null>('breakfast');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // undo / redo
    const [past, setPast] = useState<HistoryAction[]>([]);
    const [future, setFuture] = useState<HistoryAction[]>([]);

    // edit modal
    const [editEntry, setEditEntry] = useState<MealEntry | null>(null);
    const [editName, setEditName] = useState('');
    const [editCals, setEditCals] = useState('');
    const [editProtein, setEditProtein] = useState('');
    const [editCarbs, setEditCarbs] = useState('');
    const [editFat, setEditFat] = useState('');
    const [editServings, setEditServings] = useState('');
    const [editMealType, setEditMealType] = useState<MealType>('breakfast');
    const [editSaving, setEditSaving] = useState(false);

    // toast
    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toastAnim = useRef(new Animated.Value(0)).current;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const userId = user?.id || 'demo-user';

    // ── helpers ──────────────────────────────────────────────
    const isToday = dateStr === new Date().toISOString().split('T')[0];

    const navigateDate = (dir: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + dir);
        setSelectedDate(d);
    };

    const formatDate = (date: Date) => {
        if (isToday) return 'Today';
        const yest = new Date(); yest.setDate(yest.getDate() - 1);
        if (date.toISOString().split('T')[0] === yest.toISOString().split('T')[0])
            return 'Yesterday';
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    // ── data ─────────────────────────────────────────────────
    const loadMeals = useCallback(async () => {
        try {
            const [data, goal] = await Promise.all([
                getMealEntriesByDate(userId, dateStr),
                getDailyCalorieGoalForUser(userId),
            ]);
            setMeals(data);
            setCalorieGoal(goal);
        } catch (e) {
            console.error('loadMeals error:', e);
        } finally {
            setLoading(false);
        }
    }, [userId, dateStr]);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        loadMeals();
    }, [loadMeals]));

    const onRefresh = async () => {
        setRefreshing(true);
        await loadMeals();
        setRefreshing(false);
    };

    // ── toast ─────────────────────────────────────────────────
    const showToast = (msg: string) => {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastAnim.stopAnimation();
        Animated.sequence([
            Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.delay(2800),
            Animated.timing(toastAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
        ]).start(() => setToast(null));
    };

    // ── history ───────────────────────────────────────────────
    const pushHistory = (action: HistoryAction) => {
        setPast(p => [...p, action]);
        setFuture([]);
    };

    // ── DELETE — no Alert, executes immediately ───────────────
    const handleDelete = async (entry: MealEntry) => {
        try {
            await deleteMealEntry(entry.id, userId);
            pushHistory({ kind: 'delete', entry });
            await loadMeals();
            showToast(`"${entry.food_name}" deleted`);
        } catch (e) {
            console.error('delete error:', e);
        }
    };

    // ── UNDO ──────────────────────────────────────────────────
    const handleUndo = async () => {
        const action = past[past.length - 1];
        if (!action) return;
        try {
            if (action.kind === 'delete') {
                await restoreMealEntry(action.entry.id, userId);
                showToast('Restored!');
            } else {
                await updateMealEntry(action.before.id, userId, {
                    food_name: action.before.food_name,
                    meal_type: action.before.meal_type,
                    servings: action.before.servings,
                    calories: action.before.calories,
                    protein_g: action.before.protein_g,
                    carbs_g: action.before.carbs_g,
                    fat_g: action.before.fat_g,
                });
                showToast('Edit reverted');
            }
            setPast(p => p.slice(0, -1));
            setFuture(f => [action, ...f]);
            await loadMeals();
        } catch (e) {
            console.error('undo error:', e);
        }
    };

    // ── REDO ──────────────────────────────────────────────────
    const handleRedo = async () => {
        const action = future[0];
        if (!action) return;
        try {
            if (action.kind === 'delete') {
                await deleteMealEntry(action.entry.id, userId);
                showToast('Deleted again');
            } else {
                await updateMealEntry(action.before.id, userId, action.after);
                showToast('Edit re-applied');
            }
            setFuture(f => f.slice(1));
            setPast(p => [...p, action]);
            await loadMeals();
        } catch (e) {
            console.error('redo error:', e);
        }
    };

    // ── EDIT ──────────────────────────────────────────────────
    const openEdit = (entry: MealEntry) => {
        setEditEntry(entry);
        setEditName(entry.food_name);
        setEditCals(String(entry.calories));
        setEditProtein(String(entry.protein_g));
        setEditCarbs(String(entry.carbs_g));
        setEditFat(String(entry.fat_g));
        setEditServings(String(entry.servings));
        setEditMealType(entry.meal_type);
    };

    const handleSaveEdit = async () => {
        if (!editEntry) return;
        if (!editName.trim() || !editCals) {
            Alert.alert('Missing fields', 'Food name and calories are required.');
            return;
        }
        setEditSaving(true);
        try {
            const updated: Partial<MealEntry> = {
                food_name: editName.trim(),
                meal_type: editMealType,
                servings: parseFloat(editServings) || 1,
                calories: parseFloat(editCals) || 0,
                protein_g: parseFloat(editProtein) || 0,
                carbs_g: parseFloat(editCarbs) || 0,
                fat_g: parseFloat(editFat) || 0,
            };
            pushHistory({ kind: 'update', before: editEntry, after: updated });
            await updateMealEntry(editEntry.id, userId, updated);
            await loadMeals();
            setEditEntry(null);
            showToast('Entry updated ✓');
        } catch (e) {
            Alert.alert('Error', 'Could not save changes.');
        } finally {
            setEditSaving(false);
        }
    };

    // ── totals ────────────────────────────────────────────────
    const getMealsByType = (t: MealType) => meals.filter(m => m.meal_type === t);
    const totalCals = meals.reduce((s, m) => s + m.calories * m.servings, 0);
    const totalProtein = meals.reduce((s, m) => s + m.protein_g * m.servings, 0);
    const totalCarbs = meals.reduce((s, m) => s + m.carbs_g * m.servings, 0);
    const totalFat = meals.reduce((s, m) => s + m.fat_g * m.servings, 0);
    const proteinGoal = Math.round((calorieGoal * 0.30) / 4);
    const carbsGoal = Math.round((calorieGoal * 0.40) / 4);
    const fatGoal = Math.round((calorieGoal * 0.30) / 9);
    const typeCals = (t: MealType) => getMealsByType(t).reduce((s, m) => s + m.calories * m.servings, 0);
    const calorieProgress = Math.min(totalCals / calorieGoal, 1);
    const remaining = Math.max(calorieGoal - totalCals, 0);

    // ════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════
    return (
        <View style={styles.container}>

            {/* ── Header ──────────────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Food Diary</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={[styles.historyBtn, past.length === 0 && styles.historyBtnOff]}
                        onPress={handleUndo}
                        disabled={past.length === 0}
                    >
                        <Ionicons name="arrow-undo" size={18}
                            color={past.length > 0 ? Colors.primary : colors.textTertiary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.historyBtn, future.length === 0 && styles.historyBtnOff]}
                        onPress={handleRedo}
                        disabled={future.length === 0}
                    >
                        <Ionicons name="arrow-redo" size={18}
                            color={future.length > 0 ? Colors.primary : colors.textTertiary} />
                    </TouchableOpacity>
                    <Text style={styles.headerCals}>{Math.round(totalCals)} kcal</Text>
                </View>
            </View>

            {/* ── Date nav ────────────────────────────────── */}
            <View style={styles.dateNav}>
                <TouchableOpacity onPress={() => navigateDate(-1)} style={styles.dateBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.dateCenter}>
                    <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                    <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => navigateDate(1)}
                    style={styles.dateBtn}
                    disabled={isToday}
                >
                    <Ionicons name="chevron-forward" size={24}
                        color={isToday ? colors.textTertiary : colors.text} />
                </TouchableOpacity>
            </View>

            {/* ── Scroll body ─────────────────────────────── */}
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                {/* Summary card */}
                <LinearGradient
                    colors={[colors.surfaceLight, colors.card]}
                    style={styles.summaryCard}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryCol}>
                            <Text style={[styles.summaryNum, { color: Colors.primary }]}>
                                {Math.round(totalCals)}
                            </Text>
                            <Text style={styles.summaryLbl}>Eaten</Text>
                        </View>
                        <View style={styles.summaryCircle}>
                            <Text style={styles.summaryCircleNum}>{Math.round(remaining)}</Text>
                            <Text style={styles.summaryCircleLbl}>left</Text>
                        </View>
                        <View style={styles.summaryCol}>
                            <Text style={[styles.summaryNum, { color: colors.textSecondary }]}>
                                {calorieGoal}
                            </Text>
                            <Text style={styles.summaryLbl}>Goal</Text>
                        </View>
                    </View>

                    <View style={styles.progressTrack}>
                        <LinearGradient
                            colors={calorieProgress >= 1
                                ? ['#FF5252', '#FF8A80']
                                : [Colors.primary, Colors.accent]}
                            style={[styles.progressFill, { width: `${calorieProgress * 100}%` }]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        />
                    </View>
                    <Text style={styles.progressLbl}>
                        {Math.round(calorieProgress * 100)}% of daily goal
                    </Text>

                    <View style={styles.macroRow}>
                        <MacroBar label="Protein" value={totalProtein} goal={proteinGoal} color={Colors.protein} />
                        <MacroBar label="Carbs" value={totalCarbs} goal={carbsGoal} color={Colors.carbs} />
                        <MacroBar label="Fat" value={totalFat} goal={fatGoal} color={Colors.fat} />
                    </View>
                </LinearGradient>

                {/* Loading */}
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>Loading meals…</Text>
                    </View>
                ) : (
                    <>
                        {/* Empty day */}
                        {meals.length === 0 && (
                            <View style={styles.emptyDay}>
                                <Text style={{ fontSize: 40 }}>🍽️</Text>
                                <Text style={styles.emptyDayTitle}>Nothing logged yet</Text>
                                <Text style={styles.emptyDayText}>
                                    Tap an "Add" button below to log your first meal.
                                </Text>
                            </View>
                        )}

                        {/* Meal sections */}
                        {MEAL_TYPES.map((type) => {
                            const typeMeals = getMealsByType(type);
                            const cals = typeCals(type);
                            const isExpanded = expandedMeal === type;
                            const color = Colors[type as keyof typeof Colors] as string;

                            return (
                                <View key={type} style={styles.section}>
                                    {/* Section header */}
                                    <TouchableOpacity
                                        style={styles.sectionHeader}
                                        onPress={() => setExpandedMeal(isExpanded ? null : type)}
                                        activeOpacity={0.75}
                                    >
                                        <View style={styles.sectionLeft}>
                                            <View style={[styles.iconBg, { backgroundColor: color + '28' }]}>
                                                <Text style={{ fontSize: 22 }}>{MealIcons[type]}</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.sectionTitle}>{MealLabels[type]}</Text>
                                                <Text style={styles.sectionSub}>
                                                    {typeMeals.length} {typeMeals.length === 1 ? 'item' : 'items'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.sectionRight}>
                                            <Text style={[styles.sectionCals,
                                            { color: cals > 0 ? color : colors.textTertiary }]}>
                                                {Math.round(cals)} kcal
                                            </Text>
                                            <Ionicons
                                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                size={18} color={colors.textTertiary}
                                            />
                                        </View>
                                    </TouchableOpacity>

                                    {/* Entries (only when expanded) */}
                                    {isExpanded && (
                                        <View style={styles.entriesContainer}>
                                            {typeMeals.length === 0 ? (
                                                <View style={styles.emptyEntry}>
                                                    <Ionicons name="restaurant-outline" size={16}
                                                        color={colors.textTertiary} />
                                                    <Text style={styles.emptyEntryText}>
                                                        No items yet — add one below
                                                    </Text>
                                                </View>
                                            ) : (
                                                typeMeals.map((entry) => (
                                                    <EntryRow
                                                        key={entry.id}
                                                        entry={entry}
                                                        color={color}
                                                        onEdit={() => openEdit(entry)}
                                                        onDelete={() => handleDelete(entry)}
                                                    />
                                                ))
                                            )}

                                            {/* ── Add button ── */}
                                            <TouchableOpacity
                                                style={[styles.addBtn, { borderColor: color + '60' }]}
                                                onPress={() => router.push({
                                                    pathname: '/add-meal',
                                                    params: { mealType: type, date: dateStr },
                                                })}
                                                activeOpacity={0.75}
                                            >
                                                <Ionicons name="add-circle-outline" size={20} color={color} />
                                                <Text style={[styles.addBtnText, { color }]}>
                                                    Add {MealLabels[type]}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </>
                )}

                <View style={{ height: 130 }} />
            </ScrollView>

            {/* ── Toast ────────────────────────────────────── */}
            {toast !== null && (
                <Animated.View
                    style={[
                        styles.toast,
                        {
                            opacity: toastAnim,
                            transform: [{
                                translateY: toastAnim.interpolate({
                                    inputRange: [0, 1], outputRange: [20, 0],
                                }),
                            }],
                        },
                    ]}
                >
                    <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                    <Text style={styles.toastText}>{toast}</Text>
                    {past.length > 0 && (
                        <Pressable onPress={handleUndo} style={styles.undoBtn}>
                            <Text style={styles.undoBtnText}>UNDO</Text>
                        </Pressable>
                    )}
                </Animated.View>
            )}

            {/* ── Edit modal ───────────────────────────────── */}
            {editEntry !== null && (
                <EditModal
                    entry={editEntry}
                    name={editName} setName={setEditName}
                    cals={editCals} setCals={setEditCals}
                    protein={editProtein} setProtein={setEditProtein}
                    carbs={editCarbs} setCarbs={setEditCarbs}
                    fat={editFat} setFat={setEditFat}
                    servings={editServings} setServings={setEditServings}
                    mealType={editMealType} setMealType={setEditMealType}
                    saving={editSaving}
                    onSave={handleSaveEdit}
                    onClose={() => setEditEntry(null)}
                />
            )}
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// EntryRow — single meal log item with EDIT + DELETE
// ════════════════════════════════════════════════════════════
function EntryRow({
    entry, color, onEdit, onDelete,
}: {
    entry: MealEntry; color: string;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const colors = useThemeColors();
    const er = useAppStyles(createErStyles);
    return (
        <View style={er.row}>
            {/* Left: food info */}
            <Pressable style={er.info} onPress={onEdit} android_ripple={{ color: Colors.primary + '20' }}>
                <Text style={er.name} numberOfLines={1}>{entry.food_name}</Text>
                <Text style={er.detail}>
                    {entry.servings} serving{entry.servings !== 1 ? 's' : ''}
                    {'  '}P {Math.round(entry.protein_g * entry.servings)}g
                    {'  '}C {Math.round(entry.carbs_g * entry.servings)}g
                    {'  '}F {Math.round(entry.fat_g * entry.servings)}g
                </Text>
            </Pressable>

            {/* Calories */}
            <View style={er.calsWrap}>
                <Text style={er.cals}>{Math.round(entry.calories * entry.servings)}</Text>
                <Text style={er.unit}>kcal</Text>
            </View>

            {/* Edit */}
            <TouchableOpacity
                style={er.btn}
                onPress={onEdit}
                activeOpacity={0.6}
            >
                <Ionicons name="pencil-outline" size={17} color={Colors.primary} />
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
                style={[er.btn, er.deleteBtn]}
                onPress={onDelete}
                activeOpacity={0.6}
            >
                <Ionicons name="trash-outline" size={17} color={Colors.error} />
            </TouchableOpacity>
        </View>
    );
}

const createErStyles = (colors: any) => StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 4,
    },
    info: { flex: 1 },
    name: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    },
    detail: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 2,
    },
    calsWrap: {
        alignItems: 'flex-end',
        minWidth: 44,
    },
    cals: {
        fontSize: 15,
        color: colors.text,
        fontWeight: '700',
    },
    unit: {
        fontSize: 10,
        color: colors.textTertiary,
    },
    btn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceLight,
    },
    deleteBtn: {
        backgroundColor: Colors.error + '18',
    },
});

// ════════════════════════════════════════════════════════════
// MacroBar
// ════════════════════════════════════════════════════════════
function MacroBar({ label, value, goal, color }: {
    label: string; value: number; goal: number; color: string;
}) {
  const colors = useThemeColors();
  const mb = useAppStyles(createMbStyles);
    const pct = Math.min(value / goal, 1);
    return (
        <View style={mb.wrap}>
            <View style={mb.labelRow}>
                <Text style={mb.label}>{label}</Text>
                <Text style={[mb.val, { color }]}>{Math.round(value)}g</Text>
            </View>
            <View style={mb.track}>
                <View style={[mb.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
            </View>
            <Text style={mb.goal}>/{goal}g</Text>
        </View>
    );
}
const createMbStyles = (colors: any) => StyleSheet.create({
    wrap: { flex: 1 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
    label: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
    val: { fontSize: 12, fontWeight: '700' },
    track: { height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3 },
    goal: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
});

// ════════════════════════════════════════════════════════════
// EditModal — bottom sheet
// ════════════════════════════════════════════════════════════
function EditModal({
    entry, saving,
    name, setName, cals, setCals,
    protein, setProtein, carbs, setCarbs,
    fat, setFat, servings, setServings,
    mealType, setMealType,
    onSave, onClose,
}: {
    entry: MealEntry; saving: boolean;
    name: string; setName: (v: string) => void;
    cals: string; setCals: (v: string) => void;
    protein: string; setProtein: (v: string) => void;
    carbs: string; setCarbs: (v: string) => void;
    fat: string; setFat: (v: string) => void;
    servings: string; setServings: (v: string) => void;
    mealType: MealType; setMealType: (v: MealType) => void;
    onSave: () => void; onClose: () => void;
}) {
    const colors = useThemeColors();
    const em = useAppStyles(createEmStyles);
    const totalCalPreview = (parseFloat(cals) || 0) * (parseFloat(servings) || 1);

    return (
        <Modal visible animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={em.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={em.sheet}>
                    {/* handle */}
                    <View style={em.handle} />

                    {/* header */}
                    <View style={em.hdr}>
                        <TouchableOpacity onPress={onClose} style={em.hdrBtn}>
                            <Ionicons name="close" size={20} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={em.hdrTitle}>Edit Entry</Text>
                        <TouchableOpacity
                            onPress={onSave}
                            style={em.saveBtn}
                            disabled={saving}
                        >
                            {saving
                                ? <ActivityIndicator size="small" color="#FFF" />
                                : <Text style={em.saveTxt}>Save</Text>
                            }
                        </TouchableOpacity>
                    </View>

                    {/* Live calorie preview banner */}
                    <LinearGradient
                        colors={[Colors.primary + '22', Colors.accent + '11']}
                        style={em.preview}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                        <Text style={em.previewLbl}>Total calories for this entry</Text>
                        <Text style={em.previewVal}>{Math.round(totalCalPreview)} kcal</Text>
                    </LinearGradient>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={em.body}
                    >
                        {/* Food name */}
                        <Text style={em.lbl}>Food Name</Text>
                        <TextInput
                            style={em.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Grilled Chicken"
                            placeholderTextColor={colors.textTertiary}
                        />

                        {/* Servings + Calories */}
                        <View style={em.row2}>
                            <View style={{ flex: 1 }}>
                                <Text style={em.lbl}>Servings</Text>
                                <TextInput
                                    style={em.input}
                                    value={servings}
                                    onChangeText={setServings}
                                    keyboardType="decimal-pad"
                                    placeholder="1"
                                    placeholderTextColor={colors.textTertiary}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={em.lbl}>Calories (per serving)</Text>
                                <TextInput
                                    style={em.input}
                                    value={cals}
                                    onChangeText={setCals}
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                    placeholderTextColor={colors.textTertiary}
                                />
                            </View>
                        </View>

                        {/* Macros */}
                        <Text style={em.sectionLbl}>Macros per serving</Text>
                        <View style={em.row3}>
                            <View style={{ flex: 1 }}>
                                <Text style={[em.lbl, { color: Colors.protein }]}>Protein (g)</Text>
                                <TextInput style={em.input} value={protein} onChangeText={setProtein}
                                    keyboardType="decimal-pad" placeholder="0"
                                    placeholderTextColor={colors.textTertiary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[em.lbl, { color: Colors.carbs }]}>Carbs (g)</Text>
                                <TextInput style={em.input} value={carbs} onChangeText={setCarbs}
                                    keyboardType="decimal-pad" placeholder="0"
                                    placeholderTextColor={colors.textTertiary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[em.lbl, { color: Colors.fat }]}>Fat (g)</Text>
                                <TextInput style={em.input} value={fat} onChangeText={setFat}
                                    keyboardType="decimal-pad" placeholder="0"
                                    placeholderTextColor={colors.textTertiary} />
                            </View>
                        </View>

                        {/* Meal type */}
                        <Text style={em.sectionLbl}>Move to meal</Text>
                        <View style={em.chips}>
                            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(t => {
                                const active = mealType === t;
                                const c = Colors[t as keyof typeof Colors] as string;
                                return (
                                    <TouchableOpacity
                                        key={t}
                                        style={[
                                            em.chip,
                                            active && { borderColor: c, backgroundColor: c + '28' },
                                        ]}
                                        onPress={() => setMealType(t)}
                                    >
                                        <Text style={{ fontSize: 14 }}>{MealIcons[t]}</Text>
                                        <Text style={[em.chipTxt, active && { color: c, fontWeight: '700' }]}>
                                            {MealLabels[t]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Macro preview */}
                        <View style={em.macroPreview}>
                            <View style={em.macroPill}>
                                <Text style={[em.macroPillVal, { color: Colors.protein }]}>
                                    {Math.round((parseFloat(protein) || 0) * (parseFloat(servings) || 1))}g
                                </Text>
                                <Text style={em.macroPillLbl}>Protein</Text>
                            </View>
                            <View style={em.macroPill}>
                                <Text style={[em.macroPillVal, { color: Colors.carbs }]}>
                                    {Math.round((parseFloat(carbs) || 0) * (parseFloat(servings) || 1))}g
                                </Text>
                                <Text style={em.macroPillLbl}>Carbs</Text>
                            </View>
                            <View style={em.macroPill}>
                                <Text style={[em.macroPillVal, { color: Colors.fat }]}>
                                    {Math.round((parseFloat(fat) || 0) * (parseFloat(servings) || 1))}g
                                </Text>
                                <Text style={em.macroPillLbl}>Fat</Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const createEmStyles = (colors: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '93%',
        paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    },
    handle: {
        width: 40, height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginTop: 10, marginBottom: 2,
    },
    hdr: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    hdrBtn: {
        width: 36, height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center', alignItems: 'center',
    },
    hdrTitle: {
        fontSize: 17,
        color: colors.text,
        fontWeight: '700',
    },
    saveBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 10,
        paddingHorizontal: 18,
        paddingVertical: 8,
        minWidth: 64,
        alignItems: 'center',
    },
    saveTxt: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    preview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    previewLbl: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    previewVal: {
        fontSize: 20,
        color: Colors.primary,
        fontWeight: '700',
    },
    body: { padding: 16, gap: 2 },
    lbl: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
        marginBottom: 4,
        marginTop: 10,
    },
    sectionLbl: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 9,
        color: colors.text,
        fontSize: 14,
    },
    row2: { flexDirection: 'row', gap: 10 },
    row3: { flexDirection: 'row', gap: 8 },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceLight,
    },
    chipTxt: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    macroPreview: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    macroPill: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    macroPillVal: {
        fontSize: 16,
        fontWeight: '700',
    },
    macroPillLbl: {
        fontSize: 10,
        color: colors.textTertiary,
        marginTop: 2,
    },
});

// ════════════════════════════════════════════════════════════
// Page styles
// ════════════════════════════════════════════════════════════
const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    headerTitle: {
        fontSize: Typography.sizes.heading,
        color: colors.text,
        fontWeight: Typography.weights.bold,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    historyBtn: {
        width: 34, height: 34,
        borderRadius: 17,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: colors.border,
    },
    historyBtnOff: { opacity: 0.35 },
    headerCals: {
        fontSize: Typography.sizes.bodyLarge,
        color: Colors.primary,
        fontWeight: Typography.weights.bold,
        marginLeft: 4,
    },

    dateNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: Spacing.md,
        marginVertical: Spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dateBtn: { padding: 12 },
    dateCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: Typography.sizes.bodyLarge,
        color: colors.text,
        fontWeight: Typography.weights.semibold,
    },

    scroll: { paddingHorizontal: Spacing.md, paddingTop: 4 },

    // Summary
    summaryCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...Shadows.medium,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    summaryCol: { alignItems: 'center', flex: 1 },
    summaryNum: { fontSize: 22, fontWeight: '700' },
    summaryLbl: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    summaryCircle: {
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 50,
        width: 84, height: 84,
        justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.primary,
    },
    summaryCircleNum: { fontSize: 20, color: colors.text, fontWeight: '700' },
    summaryCircleLbl: { fontSize: 10, color: colors.textTertiary },
    progressTrack: {
        height: 7, borderRadius: 4,
        backgroundColor: colors.border,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressFill: { height: '100%', borderRadius: 4 },
    progressLbl: {
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    macroRow: { flexDirection: 'row', gap: Spacing.sm },

    // Loading
    loadingWrap: { alignItems: 'center', paddingVertical: 48, gap: 10 },
    loadingText: { fontSize: 14, color: colors.textTertiary },

    // Empty day
    emptyDay: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        gap: 8,
    },
    emptyDayTitle: { fontSize: 18, color: colors.text, fontWeight: '600' },
    emptyDayText: { fontSize: 13, color: colors.textTertiary, textAlign: 'center', lineHeight: 20 },

    // Meal section
    section: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 10,
        overflow: 'hidden',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
    },
    sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBg: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { fontSize: 16, color: colors.text, fontWeight: '600' },
    sectionSub: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionCals: { fontSize: 16, fontWeight: '700' },

    entriesContainer: {
        paddingHorizontal: Spacing.md,
        paddingBottom: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    emptyEntry: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    emptyEntryText: { fontSize: 13, color: colors.textTertiary },

    // Add button
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        marginTop: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    addBtnText: { fontSize: 14, fontWeight: '500' },

    // Toast
    toast: {
        position: 'absolute',
        bottom: 100,
        left: Spacing.md,
        right: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.card,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        ...Shadows.large,
    },
    toastText: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
    undoBtn: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: Colors.primary + '28',
    },
    undoBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
});

/**
 * Profile Setup — Multi-step Health & Lifestyle Onboarding
 *
 * 9 conversational steps that collect:
 * 1. Basics (gender, age, height, weight)
 * 2. Activity & routine
 * 3. Diet & food habits
 * 4. Health & medical
 * 5. Lifestyle & personal
 * 6. Your thoughts (free text)
 * 7. Dream goals
 * 8. Body measurements (waist / hip / neck / wrist)
 * 9. Review & finish
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Animated,
    Platform,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { saveOnboardingProfile, getOnboardingProfile } from '@/src/lib/database';
import {
    BiologicalGender, GenderIdentity, ActivityLevel, WorkType,
    DietType, SnackingHabit, HealthLevel, SmokingStatus,
    AlcoholFrequency, MaritalStatus, PregnancyStatus, FitnessLevel,
    StressLevel,
} from '@/src/types';

const TOTAL_STEPS = 9;

// ── Step metadata ──────────────────────────────────────────
const STEP_META = [
    { icon: '👤', title: 'About You', sub: 'Let\'s start with the basics', gradient: ['#6C63FF', '#8B83FF'] as const },
    { icon: '🏃', title: 'Your Routine', sub: 'Tell us about your daily life', gradient: ['#00D2FF', '#6C63FF'] as const },
    { icon: '🥗', title: 'Your Diet', sub: 'What does your diet look like?', gradient: ['#00E676', '#00D2FF'] as const },
    { icon: '🏥', title: 'Your Health', sub: 'Any health details we should know?', gradient: ['#FF6B6B', '#FFD93D'] as const },
    { icon: '🌙', title: 'Your Lifestyle', sub: 'A few lifestyle questions', gradient: ['#FF9F43', '#FF6B81'] as const },
    { icon: '💭', title: 'Your Thoughts', sub: 'Anything you\'d like to share', gradient: ['#6C63FF', '#00D2FF'] as const },
    { icon: '⭐', title: 'Your Dream Self', sub: 'What do you want to achieve?', gradient: ['#FFD93D', '#FF6B6B'] as const },
    { icon: '📏', title: 'Body Measurements', sub: 'Helps us detect your body type accurately', gradient: ['#00E676', '#00D2FF'] as const },
    { icon: '✅', title: 'All Set!', sub: 'Review your profile', gradient: ['#00E676', '#6C63FF'] as const },
];

// ════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════
export default function ProfileSetupScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ mode?: string; userId?: string }>();
    const isEditMode = params.mode === 'edit';
    const editUserId = params.userId ?? 'onboarding-temp';

    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(isEditMode);
    const progressAnim = useRef(new Animated.Value(0)).current;

    // ── Form state ──────────────────────────────────────────
    // Step 1: Basics
    const [bioGender, setBioGender] = useState<BiologicalGender | null>(null);
    const [genderIdentity, setGenderIdentity] = useState<GenderIdentity | null>(null);
    const [age, setAge] = useState('');
    const [heightCm, setHeightCm] = useState('');
    const [weightKg, setWeightKg] = useState('');
    const [nationality, setNationality] = useState('');
    const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);

    // Step 2: Routine
    const [workType, setWorkType] = useState<WorkType | null>(null);
    const [wakeTime, setWakeTime] = useState('07:00');
    const [sleepTime, setSleepTime] = useState('23:00');
    const [commuteType, setCommuteType] = useState('');
    const [exerciseFreq, setExerciseFreq] = useState('');

    // Step 3: Diet
    const [dietType, setDietType] = useState<DietType | null>(null);
    const [mealsPerDay, setMealsPerDay] = useState('3');
    const [snackHabit, setSnackHabit] = useState<SnackingHabit | null>(null);
    const [waterGlasses, setWaterGlasses] = useState('8');
    const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
    const [cuisinePrefs, setCuisinePrefs] = useState<string[]>([]);

    // Step 4: Health
    const [bloodSugar, setBloodSugar] = useState<HealthLevel | null>(null);
    const [cholesterol, setCholesterol] = useState<HealthLevel | null>(null);
    const [conditions, setConditions] = useState<string[]>([]);
    const [medications, setMedications] = useState('');
    const [familyHistory, setFamilyHistory] = useState<string[]>([]);

    // Step 5: Lifestyle
    const [smokingStatus, setSmokingStatus] = useState<SmokingStatus | null>(null);
    const [alcoholFreq, setAlcoholFreq] = useState<AlcoholFrequency | null>(null);
    const [sleepHours, setSleepHours] = useState('7');
    const [stressLevel, setStressLevel] = useState<StressLevel | null>(null);
    const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | null>(null);
    const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus | null>(null);
    const [numChildren, setNumChildren] = useState('');
    const [childrenNotes, setChildrenNotes] = useState('');

    // Step 6: Thoughts
    const [personalNotes, setPersonalNotes] = useState('');

    // Step 7: Goals
    const [dreamWeight, setDreamWeight] = useState('');
    const [dreamFitness, setDreamFitness] = useState<FitnessLevel | null>(null);
    const [dreamFoodHabits, setDreamFoodHabits] = useState<string[]>([]);
    const [dreamRoutine, setDreamRoutine] = useState('');
    const [dreamHabits, setDreamHabits] = useState<string[]>([]);

    // Step 8: Body Measurements
    const [waistCm, setWaistCm] = useState('');
    const [hipCm, setHipCm] = useState('');
    const [neckCm, setNeckCm] = useState('');
    const [wristCm, setWristCm] = useState('');

    // ── Load existing profile when editing ──────────────────
    useEffect(() => {
        if (!isEditMode) return;
        getOnboardingProfile(editUserId).then(profile => {
            if (!profile) { setLoadingProfile(false); return; }
            // Step 1
            if (profile.biological_gender) setBioGender(profile.biological_gender as BiologicalGender);
            if (profile.gender_identity) setGenderIdentity(profile.gender_identity as GenderIdentity);
            if (profile.age) setAge(String(profile.age));
            if (profile.height_cm) setHeightCm(String(profile.height_cm));
            if (profile.weight_kg) setWeightKg(String(profile.weight_kg));
            if (profile.nationality_or_race) setNationality(profile.nationality_or_race);
            if (profile.activity_level) setActivityLevel(profile.activity_level as ActivityLevel);
            // Step 2
            if (profile.work_type) setWorkType(profile.work_type as WorkType);
            if (profile.wake_time) setWakeTime(profile.wake_time);
            if (profile.sleep_time) setSleepTime(profile.sleep_time);
            if (profile.commute_type) setCommuteType(profile.commute_type);
            if (profile.exercise_frequency) setExerciseFreq(profile.exercise_frequency);
            // Step 3
            if (profile.diet_type) setDietType(profile.diet_type as DietType);
            if (profile.meals_per_day) setMealsPerDay(String(profile.meals_per_day));
            if (profile.snacking_habit) setSnackHabit(profile.snacking_habit as SnackingHabit);
            if (profile.water_intake_glasses) setWaterGlasses(String(profile.water_intake_glasses));
            if (profile.food_allergies?.length) setFoodAllergies(profile.food_allergies);
            if (profile.cuisine_preferences?.length) setCuisinePrefs(profile.cuisine_preferences);
            // Step 4
            if (profile.blood_sugar_level) setBloodSugar(profile.blood_sugar_level as HealthLevel);
            if (profile.cholesterol_level) setCholesterol(profile.cholesterol_level as HealthLevel);
            if (profile.health_conditions?.length) setConditions(profile.health_conditions);
            if (profile.medications) setMedications(profile.medications);
            if (profile.family_history?.length) setFamilyHistory(profile.family_history);
            // Step 5
            if (profile.smoking_status) setSmokingStatus(profile.smoking_status as SmokingStatus);
            if (profile.alcohol_frequency) setAlcoholFreq(profile.alcohol_frequency as AlcoholFrequency);
            if (profile.sleep_hours) setSleepHours(String(profile.sleep_hours));
            if (profile.stress_level) setStressLevel(profile.stress_level as StressLevel);
            if (profile.marital_status) setMaritalStatus(profile.marital_status as MaritalStatus);
            if (profile.pregnancy_status) setPregnancyStatus(profile.pregnancy_status as PregnancyStatus);
            if (profile.num_children) setNumChildren(String(profile.num_children));
            if (profile.children_notes) setChildrenNotes(profile.children_notes);
            // Step 6
            if (profile.personal_notes) setPersonalNotes(profile.personal_notes);
            // Step 7
            if (profile.dream_weight_kg) setDreamWeight(String(profile.dream_weight_kg));
            if (profile.dream_fitness_level) setDreamFitness(profile.dream_fitness_level as FitnessLevel);
            if (profile.dream_food_habits?.length) setDreamFoodHabits(profile.dream_food_habits);
            if (profile.dream_daily_routine) setDreamRoutine(profile.dream_daily_routine);
            if (profile.dream_special_habits?.length) setDreamHabits(profile.dream_special_habits);
            // Step 8
            if (profile.waist_cm) setWaistCm(String(profile.waist_cm));
            if (profile.hip_cm) setHipCm(String(profile.hip_cm));
            if (profile.neck_cm) setNeckCm(String(profile.neck_cm));
            if (profile.wrist_cm) setWristCm(String(profile.wrist_cm));
            setLoadingProfile(false);
        }).catch(() => setLoadingProfile(false));
    }, []);

    // ── Navigation ──────────────────────────────────────────
    const animateProgress = useCallback((toStep: number) => {
        Animated.timing(progressAnim, {
            toValue: toStep / (TOTAL_STEPS - 1),
            duration: 350,
            useNativeDriver: false,
        }).start();
    }, [progressAnim]);

    const goNext = () => {
        if (step < TOTAL_STEPS - 1) {
            const next = step + 1;
            setStep(next);
            animateProgress(next);
        }
    };

    const goBack = () => {
        if (step > 0) {
            const prev = step - 1;
            setStep(prev);
            animateProgress(prev);
        }
    };

    const jumpTo = (s: number) => {
        setStep(s);
        animateProgress(s);
    };

    // ── Save ─────────────────────────────────────────────────
    const handleFinish = async () => {
        setSaving(true);
        try {
            await saveOnboardingProfile(editUserId, {
                biological_gender: bioGender,
                gender_identity: genderIdentity,
                age: parseInt(age) || null,
                height_cm: parseFloat(heightCm) || null,
                weight_kg: parseFloat(weightKg) || null,
                nationality_or_race: nationality || null,
                activity_level: activityLevel,
                work_type: workType,
                wake_time: wakeTime || null,
                sleep_time: sleepTime || null,
                commute_type: commuteType || null,
                exercise_frequency: exerciseFreq || null,
                diet_type: dietType,
                meals_per_day: parseInt(mealsPerDay) || null,
                snacking_habit: snackHabit,
                water_intake_glasses: parseInt(waterGlasses) || null,
                food_allergies: foodAllergies,
                cuisine_preferences: cuisinePrefs,
                blood_sugar_level: bloodSugar,
                cholesterol_level: cholesterol,
                health_conditions: conditions,
                medications: medications || null,
                family_history: familyHistory,
                smoking_status: smokingStatus,
                alcohol_frequency: alcoholFreq,
                sleep_hours: parseFloat(sleepHours) || null,
                stress_level: stressLevel,
                marital_status: maritalStatus,
                pregnancy_status: pregnancyStatus,
                num_children: parseInt(numChildren) || null,
                children_notes: childrenNotes || null,
                personal_notes: personalNotes || null,
                dream_weight_kg: parseFloat(dreamWeight) || null,
                dream_fitness_level: dreamFitness,
                dream_food_habits: dreamFoodHabits,
                dream_daily_routine: dreamRoutine || null,
                dream_special_habits: dreamHabits,
                waist_cm: parseFloat(waistCm) || null,
                hip_cm: parseFloat(hipCm) || null,
                neck_cm: parseFloat(neckCm) || null,
                wrist_cm: parseFloat(wristCm) || null,
            });
            if (isEditMode) {
                // Return to home after editing
                router.replace('/(tabs)');
            } else {
                router.replace('/(auth)/register');
            }
        } catch (e) {
            console.error('Save error', e);
            Alert.alert('Oops', 'Could not save your profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // ── Render ───────────────────────────────────────────────
    const meta = STEP_META[step];

    if (loadingProfile) {
        return (
            <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={{ color: Colors.dark.textSecondary, marginTop: 12 }}>Loading your profile...</Text>
            </View>
        );
    }

    return (
        <View style={s.container}>
            {/* ── Progress bar ──────────────────────────────── */}
            <View style={s.progressWrap}>
                <View style={s.progressTrack}>
                    <Animated.View
                        style={[
                            s.progressFill,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%'],
                                }),
                            },
                        ]}
                    />
                </View>
                <Text style={s.progressLabel}>Step {step + 1} of {TOTAL_STEPS}</Text>
            </View>

            {/* ── Step header ───────────────────────────────── */}
            <View style={s.stepHeader}>
                <Text style={s.stepIcon}>{meta.icon}</Text>
                <Text style={s.stepTitle}>{meta.title}</Text>
                <Text style={s.stepSub}>{meta.sub}</Text>
            </View>

            {/* ── Step content ──────────────────────────────── */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={s.scrollBody}
                    contentContainerStyle={s.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {step === 0 && (
                        <StepBasics
                            bioGender={bioGender} setBioGender={setBioGender}
                            genderIdentity={genderIdentity} setGenderIdentity={setGenderIdentity}
                            age={age} setAge={setAge}
                            heightCm={heightCm} setHeightCm={setHeightCm}
                            weightKg={weightKg} setWeightKg={setWeightKg}
                            nationality={nationality} setNationality={setNationality}
                            activityLevel={activityLevel} setActivityLevel={setActivityLevel}
                        />
                    )}
                    {step === 1 && (
                        <StepRoutine
                            workType={workType} setWorkType={setWorkType}
                            wakeTime={wakeTime} setWakeTime={setWakeTime}
                            sleepTime={sleepTime} setSleepTime={setSleepTime}
                            commuteType={commuteType} setCommuteType={setCommuteType}
                            exerciseFreq={exerciseFreq} setExerciseFreq={setExerciseFreq}
                        />
                    )}
                    {step === 2 && (
                        <StepDiet
                            dietType={dietType} setDietType={setDietType}
                            mealsPerDay={mealsPerDay} setMealsPerDay={setMealsPerDay}
                            snackHabit={snackHabit} setSnackHabit={setSnackHabit}
                            waterGlasses={waterGlasses} setWaterGlasses={setWaterGlasses}
                            foodAllergies={foodAllergies} setFoodAllergies={setFoodAllergies}
                            cuisinePrefs={cuisinePrefs} setCuisinePrefs={setCuisinePrefs}
                        />
                    )}
                    {step === 3 && (
                        <StepHealth
                            bloodSugar={bloodSugar} setBloodSugar={setBloodSugar}
                            cholesterol={cholesterol} setCholesterol={setCholesterol}
                            conditions={conditions} setConditions={setConditions}
                            medications={medications} setMedications={setMedications}
                            familyHistory={familyHistory} setFamilyHistory={setFamilyHistory}
                        />
                    )}
                    {step === 4 && (
                        <StepLifestyle
                            smokingStatus={smokingStatus} setSmokingStatus={setSmokingStatus}
                            alcoholFreq={alcoholFreq} setAlcoholFreq={setAlcoholFreq}
                            sleepHours={sleepHours} setSleepHours={setSleepHours}
                            stressLevel={stressLevel} setStressLevel={setStressLevel}
                            maritalStatus={maritalStatus} setMaritalStatus={setMaritalStatus}
                            pregnancyStatus={pregnancyStatus} setPregnancyStatus={setPregnancyStatus}
                            numChildren={numChildren} setNumChildren={setNumChildren}
                            childrenNotes={childrenNotes} setChildrenNotes={setChildrenNotes}
                        />
                    )}
                    {step === 5 && (
                        <StepThoughts
                            personalNotes={personalNotes} setPersonalNotes={setPersonalNotes}
                        />
                    )}
                    {step === 6 && (
                        <StepGoals
                            dreamWeight={dreamWeight} setDreamWeight={setDreamWeight}
                            dreamFitness={dreamFitness} setDreamFitness={setDreamFitness}
                            dreamFoodHabits={dreamFoodHabits} setDreamFoodHabits={setDreamFoodHabits}
                            dreamRoutine={dreamRoutine} setDreamRoutine={setDreamRoutine}
                            dreamHabits={dreamHabits} setDreamHabits={setDreamHabits}
                            weightKg={weightKg} heightCm={heightCm}
                        />
                    )}
                    {step === 7 && (
                        <StepMeasurements
                            isFemale={bioGender === 'female'}
                            waistCm={waistCm} setWaistCm={setWaistCm}
                            hipCm={hipCm} setHipCm={setHipCm}
                            neckCm={neckCm} setNeckCm={setNeckCm}
                            wristCm={wristCm} setWristCm={setWristCm}
                            onSkip={goNext}
                        />
                    )}
                    {step === 8 && (
                        <StepReview
                            data={{
                                bioGender, genderIdentity, age, heightCm, weightKg, nationality,
                                activityLevel, workType, wakeTime, sleepTime, commuteType,
                                exerciseFreq, dietType, mealsPerDay, snackHabit, waterGlasses,
                                foodAllergies, cuisinePrefs, bloodSugar, cholesterol, conditions,
                                medications, familyHistory, smokingStatus, alcoholFreq, sleepHours,
                                stressLevel, maritalStatus, pregnancyStatus, numChildren,
                                childrenNotes, personalNotes, dreamWeight, dreamFitness,
                                dreamFoodHabits, dreamRoutine, dreamHabits,
                                waistCm, hipCm, neckCm, wristCm,
                            }}
                            onEdit={jumpTo}
                        />
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Bottom nav ─────────────────────────────────── */}
            <View style={s.bottomNav}>
                {step > 0 ? (
                    <TouchableOpacity onPress={goBack} style={s.backBtn}>
                        <Ionicons name="arrow-back" size={20} color={Colors.dark.text} />
                        <Text style={s.backBtnText}>Back</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                        <Ionicons name="arrow-back" size={20} color={Colors.dark.textTertiary} />
                    </TouchableOpacity>
                )}

                {step < TOTAL_STEPS - 1 ? (
                    <TouchableOpacity onPress={goNext} activeOpacity={0.85}>
                        <LinearGradient
                            colors={meta.gradient}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={s.nextBtn}
                        >
                            <Text style={s.nextBtnText}>Continue</Text>
                            <Ionicons name="arrow-forward" size={18} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={handleFinish} disabled={saving} activeOpacity={0.85}>
                        <LinearGradient
                            colors={isEditMode ? ['#6C63FF', '#8B83FF'] : ['#00E676', '#00D2FF']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={s.nextBtn}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Text style={s.nextBtnText}>
                                        {isEditMode ? 'Save Changes' : 'Finish & Sign Up'}
                                    </Text>
                                    <Ionicons
                                        name={isEditMode ? 'checkmark' : 'checkmark-circle'}
                                        size={18} color="#FFF"
                                    />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Shared UI helpers
// ════════════════════════════════════════════════════════════
function SectionLabel({ text }: { text: string }) {
    return <Text style={s.sectionLabel}>{text}</Text>;
}

function PillPicker<T extends string>({
    options,
    selected,
    onSelect,
    labels,
    icons,
}: {
    options: T[];
    selected: T | null;
    onSelect: (v: T) => void;
    labels?: Record<T, string>;
    icons?: Record<T, string>;
}) {
    return (
        <View style={s.pillRow}>
            {options.map(opt => {
                const active = selected === opt;
                return (
                    <TouchableOpacity
                        key={opt}
                        style={[s.pill, active && s.pillActive]}
                        onPress={() => onSelect(opt)}
                    >
                        {icons?.[opt] && <Text style={{ fontSize: 16 }}>{icons[opt]}</Text>}
                        <Text style={[s.pillText, active && s.pillTextActive]}>
                            {labels?.[opt] ?? opt.charAt(0).toUpperCase() + opt.slice(1).replace(/_/g, ' ')}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

function MultiChipPicker({
    options,
    selected,
    onToggle,
}: {
    options: string[];
    selected: string[];
    onToggle: (v: string) => void;
}) {
    return (
        <View style={s.pillRow}>
            {options.map(opt => {
                const active = selected.includes(opt);
                return (
                    <TouchableOpacity
                        key={opt}
                        style={[s.pill, active && s.pillActive]}
                        onPress={() => onToggle(opt)}
                    >
                        <Ionicons
                            name={active ? 'checkmark-circle' : 'add-circle-outline'}
                            size={14}
                            color={active ? Colors.primary : Colors.dark.textTertiary}
                        />
                        <Text style={[s.pillText, active && s.pillTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

function toggleItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
}

function FormInput({
    label, value, onChangeText, keyboardType, placeholder, multiline,
}: {
    label: string; value: string; onChangeText: (v: string) => void;
    keyboardType?: 'default' | 'numeric' | 'decimal-pad';
    placeholder?: string; multiline?: boolean;
}) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={s.inputLabel}>{label}</Text>
            <TextInput
                style={[s.input, multiline && { height: 90, textAlignVertical: 'top' }]}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType || 'default'}
                placeholder={placeholder}
                placeholderTextColor={Colors.dark.textTertiary}
                multiline={multiline}
            />
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 8: Body Measurements
// ════════════════════════════════════════════════════════════
function StepMeasurements({ isFemale, waistCm, setWaistCm, hipCm, setHipCm,
    neckCm, setNeckCm, wristCm, setWristCm, onSkip }: any) {
    return (
        <View>
            {/* Accuracy notice */}
            <View style={s.measureTip}>
                <Text style={s.measureTipIcon}>📏</Text>
                <View style={{ flex: 1 }}>
                    <Text style={s.measureTipTitle}>Boost Detection Accuracy</Text>
                    <Text style={s.measureTipBody}>
                        These measurements enable the US Navy body fat formula (~85% accuracy).
                        Use a soft tape measure — pull snug but not tight.
                    </Text>
                </View>
            </View>

            {/* Waist */}
            <SectionLabel text="Waist (cm)" />
            <Text style={s.measureHint}>
                {isFemale ? 'Narrowest point of your waist' : 'Around the navel / belly button'}
            </Text>
            <FormInput
                label="" value={waistCm} onChangeText={setWaistCm}
                keyboardType="decimal-pad" placeholder="e.g. 80"
            />

            {/* Hips — females only */}
            {isFemale && (
                <>
                    <SectionLabel text="Hips (cm)" />
                    <Text style={s.measureHint}>Widest point of your hips / buttocks</Text>
                    <FormInput
                        label="" value={hipCm} onChangeText={setHipCm}
                        keyboardType="decimal-pad" placeholder="e.g. 95"
                    />
                </>
            )}

            {/* Neck */}
            <SectionLabel text="Neck (cm)" />
            <Text style={s.measureHint}>
                Just below the Adam's apple (larynx)
            </Text>
            <FormInput
                label="" value={neckCm} onChangeText={setNeckCm}
                keyboardType="decimal-pad" placeholder="e.g. 37"
            />

            {/* Wrist */}
            <SectionLabel text="Wrist (cm)" />
            <Text style={s.measureHint}>
                At the narrowest point (above the wrist bone)
            </Text>
            <FormInput
                label="" value={wristCm} onChangeText={setWristCm}
                keyboardType="decimal-pad" placeholder="e.g. 16"
            />

            {/* Skip link */}
            <TouchableOpacity onPress={onSkip} style={s.skipLink}>
                <Text style={s.skipLinkText}>Skip for now — I'll add these later</Text>
            </TouchableOpacity>
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 1: Basics
// ════════════════════════════════════════════════════════════
function StepBasics({ bioGender, setBioGender, genderIdentity, setGenderIdentity,
    age, setAge, heightCm, setHeightCm, weightKg, setWeightKg,
    nationality, setNationality, activityLevel, setActivityLevel }: any) {

    const bmi = (parseFloat(weightKg) && parseFloat(heightCm))
        ? (parseFloat(weightKg) / ((parseFloat(heightCm) / 100) ** 2)).toFixed(1)
        : null;

    return (
        <View>
            <SectionLabel text="Biological Gender" />
            <PillPicker
                options={['male', 'female', 'intersex'] as BiologicalGender[]}
                selected={bioGender}
                onSelect={setBioGender}
                icons={{ male: '♂️', female: '♀️', intersex: '⚧' }}
            />

            <SectionLabel text="Gender Identity" />
            <PillPicker
                options={['man', 'woman', 'non_binary', 'prefer_not_to_say', 'other'] as GenderIdentity[]}
                selected={genderIdentity}
                onSelect={setGenderIdentity}
                labels={{ man: 'Man', woman: 'Woman', non_binary: 'Non-binary', prefer_not_to_say: 'Prefer not to say', other: 'Other' }}
            />

            <View style={s.row2}>
                <View style={{ flex: 1 }}>
                    <FormInput label="Age" value={age} onChangeText={setAge} keyboardType="numeric" placeholder="25" />
                </View>
                <View style={{ flex: 1 }}>
                    <FormInput label="Nationality / Race" value={nationality} onChangeText={setNationality} placeholder="e.g. Asian" />
                </View>
            </View>

            <View style={s.row2}>
                <View style={{ flex: 1 }}>
                    <FormInput label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" placeholder="170" />
                </View>
                <View style={{ flex: 1 }}>
                    <FormInput label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholder="70" />
                </View>
            </View>

            {bmi && (
                <View style={s.bmiCard}>
                    <Text style={s.bmiLabel}>Your BMI</Text>
                    <Text style={[s.bmiVal, {
                        color: parseFloat(bmi) < 18.5 ? Colors.warning
                            : parseFloat(bmi) < 25 ? Colors.success
                                : parseFloat(bmi) < 30 ? Colors.warning : Colors.error
                    }]}>{bmi}</Text>
                    <Text style={s.bmiDesc}>
                        {parseFloat(bmi) < 18.5 ? 'Underweight' : parseFloat(bmi) < 25 ? 'Normal' : parseFloat(bmi) < 30 ? 'Overweight' : 'Obese'}
                    </Text>
                </View>
            )}

            <SectionLabel text="Activity Level" />
            <PillPicker
                options={['sedentary', 'light', 'moderate', 'active', 'very_active'] as ActivityLevel[]}
                selected={activityLevel}
                onSelect={setActivityLevel}
                icons={{ sedentary: '🪑', light: '🚶', moderate: '🏃', active: '🏋️', very_active: '🔥' }}
                labels={{ sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', active: 'Active', very_active: 'Very Active' }}
            />
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 2: Routine
// ════════════════════════════════════════════════════════════
function StepRoutine({ workType, setWorkType, wakeTime, setWakeTime,
    sleepTime, setSleepTime, commuteType, setCommuteType,
    exerciseFreq, setExerciseFreq }: any) {
    return (
        <View>
            <SectionLabel text="What type of work do you do?" />
            <PillPicker
                options={['desk', 'standing', 'physical', 'student', 'retired', 'other'] as WorkType[]}
                selected={workType}
                onSelect={setWorkType}
                icons={{ desk: '💻', standing: '🧑‍🍳', physical: '🏗️', student: '📚', retired: '🏡', other: '🔧' }}
                labels={{ desk: 'Desk Job', standing: 'Standing', physical: 'Physical Labour', student: 'Student', retired: 'Retired', other: 'Other' }}
            />

            <View style={s.row2}>
                <View style={{ flex: 1 }}>
                    <FormInput label="Wake Up Time" value={wakeTime} onChangeText={setWakeTime} placeholder="07:00" />
                </View>
                <View style={{ flex: 1 }}>
                    <FormInput label="Bed Time" value={sleepTime} onChangeText={setSleepTime} placeholder="23:00" />
                </View>
            </View>

            <SectionLabel text="How do you commute?" />
            <PillPicker
                options={['Walk', 'Bicycle', 'Public Transit', 'Drive', 'Work from Home']}
                selected={commuteType}
                onSelect={setCommuteType}
                icons={{ Walk: '🚶', Bicycle: '🚲', 'Public Transit': '🚌', Drive: '🚗', 'Work from Home': '🏠' }}
            />

            <SectionLabel text="How often do you exercise?" />
            <PillPicker
                options={['Never', '1-2x/week', '3-4x/week', '5+/week', 'Daily']}
                selected={exerciseFreq}
                onSelect={setExerciseFreq}
                icons={{ Never: '😴', '1-2x/week': '🏃', '3-4x/week': '💪', '5+/week': '🏋️', Daily: '🔥' }}
            />
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 3: Diet
// ════════════════════════════════════════════════════════════
function StepDiet({ dietType, setDietType, mealsPerDay, setMealsPerDay,
    snackHabit, setSnackHabit, waterGlasses, setWaterGlasses,
    foodAllergies, setFoodAllergies, cuisinePrefs, setCuisinePrefs }: any) {
    return (
        <View>
            <SectionLabel text="What's your diet type?" />
            <PillPicker
                options={['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'other'] as DietType[]}
                selected={dietType}
                onSelect={setDietType}
                icons={{ omnivore: '🍖', vegetarian: '🥬', vegan: '🌱', pescatarian: '🐟', keto: '🥑', paleo: '🦴', other: '🍽️' }}
                labels={{ omnivore: 'Omnivore', vegetarian: 'Vegetarian', vegan: 'Vegan', pescatarian: 'Pescatarian', keto: 'Keto', paleo: 'Paleo', other: 'Other' }}
            />

            <View style={s.row2}>
                <View style={{ flex: 1 }}>
                    <FormInput label="Meals per day" value={mealsPerDay} onChangeText={setMealsPerDay} keyboardType="numeric" placeholder="3" />
                </View>
                <View style={{ flex: 1 }}>
                    <FormInput label="Water (glasses/day)" value={waterGlasses} onChangeText={setWaterGlasses} keyboardType="numeric" placeholder="8" />
                </View>
            </View>

            <SectionLabel text="How often do you snack?" />
            <PillPicker
                options={['never', 'sometimes', 'often', 'always'] as SnackingHabit[]}
                selected={snackHabit}
                onSelect={setSnackHabit}
                icons={{ never: '🚫', sometimes: '🤏', often: '🍪', always: '🍫' }}
            />

            <SectionLabel text="Any food allergies?" />
            <MultiChipPicker
                options={['Gluten', 'Dairy', 'Nuts', 'Eggs', 'Soy', 'Shellfish', 'Fish', 'Wheat', 'None']}
                selected={foodAllergies}
                onToggle={(v) => setFoodAllergies(toggleItem(foodAllergies, v))}
            />

            <SectionLabel text="Cuisine preferences" />
            <MultiChipPicker
                options={['Asian', 'Mediterranean', 'Latin', 'Indian', 'Middle Eastern', 'Western', 'African', 'Japanese', 'No Preference']}
                selected={cuisinePrefs}
                onToggle={(v) => setCuisinePrefs(toggleItem(cuisinePrefs, v))}
            />
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 4: Health
// ════════════════════════════════════════════════════════════
function StepHealth({ bloodSugar, setBloodSugar, cholesterol, setCholesterol,
    conditions, setConditions, medications, setMedications,
    familyHistory, setFamilyHistory }: any) {
    return (
        <View>
            <SectionLabel text="Blood Sugar Level" />
            <PillPicker
                options={['normal', 'borderline', 'high', 'low', 'unknown'] as HealthLevel[]}
                selected={bloodSugar}
                onSelect={setBloodSugar}
                icons={{ normal: '✅', borderline: '⚠️', high: '🔴', low: '🔵', unknown: '❓' }}
                labels={{ normal: 'Normal', borderline: 'Borderline', high: 'High', low: 'Low', unknown: "Don't Know" }}
            />

            <SectionLabel text="Cholesterol Level" />
            <PillPicker
                options={['normal', 'borderline', 'high', 'low', 'unknown'] as HealthLevel[]}
                selected={cholesterol}
                onSelect={setCholesterol}
                icons={{ normal: '✅', borderline: '⚠️', high: '🔴', low: '🔵', unknown: '❓' }}
                labels={{ normal: 'Normal', borderline: 'Borderline', high: 'High', low: 'Low', unknown: "Don't Know" }}
            />

            <SectionLabel text="Any existing conditions?" />
            <MultiChipPicker
                options={['Diabetes', 'Hypertension', 'Heart Disease', 'PCOS', 'Thyroid', 'Asthma', 'Arthritis', 'Depression', 'Anxiety', 'IBS', 'None']}
                selected={conditions}
                onToggle={(v) => setConditions(toggleItem(conditions, v))}
            />

            <FormInput
                label="Current Medications (if any)"
                value={medications}
                onChangeText={setMedications}
                placeholder="e.g. Metformin, Levothyroxine"
            />

            <SectionLabel text="Family health history" />
            <MultiChipPicker
                options={['Diabetes', 'Heart Disease', 'Cancer', 'Hypertension', 'Obesity', 'Stroke', 'None / Unknown']}
                selected={familyHistory}
                onToggle={(v) => setFamilyHistory(toggleItem(familyHistory, v))}
            />
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 5: Lifestyle
// ════════════════════════════════════════════════════════════
function StepLifestyle({ smokingStatus, setSmokingStatus, alcoholFreq, setAlcoholFreq,
    sleepHours, setSleepHours, stressLevel, setStressLevel,
    maritalStatus, setMaritalStatus, pregnancyStatus, setPregnancyStatus,
    numChildren, setNumChildren, childrenNotes, setChildrenNotes }: any) {
    return (
        <View>
            <SectionLabel text="Smoking" />
            <PillPicker
                options={['never', 'former', 'occasionally', 'daily'] as SmokingStatus[]}
                selected={smokingStatus}
                onSelect={setSmokingStatus}
                icons={{ never: '🚫', former: '🔙', occasionally: '🚬', daily: '💨' }}
                labels={{ never: 'Never', former: 'Former', occasionally: 'Occasionally', daily: 'Daily' }}
            />

            <SectionLabel text="Alcohol" />
            <PillPicker
                options={['never', 'rarely', 'weekly', 'daily'] as AlcoholFrequency[]}
                selected={alcoholFreq}
                onSelect={setAlcoholFreq}
                icons={{ never: '🚫', rarely: '🍷', weekly: '🍺', daily: '🥃' }}
                labels={{ never: 'Never', rarely: 'Rarely', weekly: 'Weekly', daily: 'Daily' }}
            />

            <FormInput label="Average sleep (hours/night)" value={sleepHours} onChangeText={setSleepHours} keyboardType="decimal-pad" placeholder="7" />

            <SectionLabel text="Stress Level" />
            <View style={s.stressRow}>
                {([1, 2, 3, 4, 5] as StressLevel[]).map(lvl => {
                    const active = stressLevel === lvl;
                    const emojis = ['😊', '🙂', '😐', '😟', '😰'];
                    return (
                        <TouchableOpacity
                            key={lvl}
                            style={[s.stressItem, active && s.stressItemActive]}
                            onPress={() => setStressLevel(lvl)}
                        >
                            <Text style={{ fontSize: 24 }}>{emojis[lvl - 1]}</Text>
                            <Text style={[s.stressLbl, active && { color: Colors.primary }]}>{lvl}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <SectionLabel text="Relationship Status" />
            <PillPicker
                options={['single', 'married', 'divorced', 'widowed', 'other'] as MaritalStatus[]}
                selected={maritalStatus}
                onSelect={setMaritalStatus}
            />

            <SectionLabel text="About Pregnancy & Kids" />
            <PillPicker
                options={['not_applicable', 'trying', 'pregnant', 'have_kids'] as PregnancyStatus[]}
                selected={pregnancyStatus}
                onSelect={setPregnancyStatus}
                labels={{ not_applicable: 'Not Applicable', trying: 'Trying for Kids', pregnant: 'Currently Pregnant', have_kids: 'Have Kids' }}
                icons={{ not_applicable: '—', trying: '🤞', pregnant: '🤰', have_kids: '👨‍👩‍👧' }}
            />

            {(pregnancyStatus === 'have_kids') && (
                <>
                    <FormInput label="How many kids?" value={numChildren} onChangeText={setNumChildren} keyboardType="numeric" placeholder="2" />
                    <FormInput label="Anything to share about kids & health?" value={childrenNotes} onChangeText={setChildrenNotes} placeholder="Optional" multiline />
                </>
            )}
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 6: Thoughts
// ════════════════════════════════════════════════════════════
function StepThoughts({ personalNotes, setPersonalNotes }: any) {
    return (
        <View>
            <View style={s.thoughtsCard}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>💬</Text>
                <Text style={s.thoughtsTitle}>Share Your Thoughts</Text>
                <Text style={s.thoughtsDesc}>
                    This is your space. Tell us anything about yourself, your body, or your health journey that you think is important. Everything is confidential.
                </Text>
            </View>

            <TextInput
                style={s.thoughtsInput}
                value={personalNotes}
                onChangeText={setPersonalNotes}
                placeholder="I've been struggling with... / I want you to know that... / My biggest challenge is..."
                placeholderTextColor={Colors.dark.textTertiary}
                multiline
                textAlignVertical="top"
            />

            <View style={s.thoughtsHint}>
                <Ionicons name="lock-closed" size={14} color={Colors.dark.textTertiary} />
                <Text style={s.thoughtsHintText}>This information is private and secure</Text>
            </View>
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 7: Goals
// ════════════════════════════════════════════════════════════
function StepGoals({ dreamWeight, setDreamWeight, dreamFitness, setDreamFitness,
    dreamFoodHabits, setDreamFoodHabits, dreamRoutine, setDreamRoutine,
    dreamHabits, setDreamHabits, weightKg, heightCm }: any) {

    const h = parseFloat(heightCm) / 100;
    const dreamBmi = (parseFloat(dreamWeight) && h)
        ? (parseFloat(dreamWeight) / (h * h)).toFixed(1)
        : null;

    return (
        <View>
            <View style={s.row2}>
                <View style={{ flex: 1 }}>
                    <FormInput label="Dream Weight (kg)" value={dreamWeight} onChangeText={setDreamWeight} keyboardType="decimal-pad" placeholder="65" />
                </View>
                <View style={{ flex: 1 }}>
                    {dreamBmi && (
                        <View style={s.bmiCard}>
                            <Text style={s.bmiLabel}>Dream BMI</Text>
                            <Text style={[s.bmiVal, {
                                color: parseFloat(dreamBmi) < 18.5 ? Colors.warning
                                    : parseFloat(dreamBmi) < 25 ? Colors.success
                                        : parseFloat(dreamBmi) < 30 ? Colors.warning : Colors.error
                            }]}>{dreamBmi}</Text>
                            <Text style={s.bmiDesc}>
                                {parseFloat(dreamBmi) < 18.5 ? 'Underweight' : parseFloat(dreamBmi) < 25 ? 'Healthy ✓' : parseFloat(dreamBmi) < 30 ? 'Overweight' : 'Obese'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* BMI guidance */}
            {h > 0 && (
                <View style={s.bmiGuide}>
                    <Ionicons name="information-circle" size={16} color={Colors.accent} />
                    <Text style={s.bmiGuideText}>
                        Healthy weight range for your height: {(18.5 * h * h).toFixed(0)} – {(24.9 * h * h).toFixed(0)} kg
                    </Text>
                </View>
            )}

            <SectionLabel text="Dream Fitness Level" />
            <PillPicker
                options={['beginner', 'intermediate', 'advanced', 'athlete'] as FitnessLevel[]}
                selected={dreamFitness}
                onSelect={setDreamFitness}
                icons={{ beginner: '🌱', intermediate: '💪', advanced: '🏋️', athlete: '🏆' }}
                labels={{ beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', athlete: 'Athlete' }}
            />

            <SectionLabel text="Dream Food Habits" />
            <MultiChipPicker
                options={['Eat More Greens', 'Less Sugar', 'Cook at Home', 'Meal Prep', 'More Protein', 'Less Processed Food', 'Eat Mindfully', 'Try New Cuisines']}
                selected={dreamFoodHabits}
                onToggle={(v) => setDreamFoodHabits(toggleItem(dreamFoodHabits, v))}
            />

            <SectionLabel text="Dream Habits to Build" />
            <MultiChipPicker
                options={['Morning Exercise', 'Meditate Daily', 'Read More', 'Sleep 8 Hours', 'Drink More Water', 'No Smoking', 'Less Screen Time', 'Walk 10k Steps']}
                selected={dreamHabits}
                onToggle={(v) => setDreamHabits(toggleItem(dreamHabits, v))}
            />

            <FormInput
                label="Dream Daily Routine (optional)"
                value={dreamRoutine}
                onChangeText={setDreamRoutine}
                placeholder="e.g. Wake at 6, workout, healthy breakfast..."
                multiline
            />
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 8: Review
// ════════════════════════════════════════════════════════════
function ReviewCard({ title, icon, stepIdx, items, onEdit }: {
    title: string; icon: string; stepIdx: number;
    items: { label: string; value: string }[];
    onEdit: (s: number) => void;
}) {
    return (
        <View style={s.reviewCard}>
            <View style={s.reviewCardHeader}>
                <Text style={{ fontSize: 18 }}>{icon}</Text>
                <Text style={s.reviewCardTitle}>{title}</Text>
                <TouchableOpacity onPress={() => onEdit(stepIdx)} style={s.reviewEditBtn}>
                    <Ionicons name="pencil" size={14} color={Colors.primary} />
                    <Text style={s.reviewEditText}>Edit</Text>
                </TouchableOpacity>
            </View>
            {items.filter(i => i.value).map((item, idx) => (
                <View key={idx} style={s.reviewRow}>
                    <Text style={s.reviewLabel}>{item.label}</Text>
                    <Text style={s.reviewValue}>{item.value}</Text>
                </View>
            ))}
            {items.every(i => !i.value) && (
                <Text style={s.reviewEmpty}>No info provided — tap Edit to add</Text>
            )}
        </View>
    );
}

function StepReview({ data, onEdit }: { data: any; onEdit: (s: number) => void }) {
    const fmt = (v: any) => v ? String(v) : '';
    const fmtArr = (arr: string[]) => arr.length > 0 ? arr.join(', ') : '';

    return (
        <View>
            <View style={s.reviewBanner}>
                <Text style={{ fontSize: 28 }}>🎉</Text>
                <Text style={s.reviewBannerTitle}>You're almost there!</Text>
                <Text style={s.reviewBannerSub}>Review your profile below. Tap Edit on any section to make changes.</Text>
            </View>

            <ReviewCard title="Basics" icon="👤" stepIdx={0} onEdit={onEdit} items={[
                { label: 'Gender', value: fmt(data.bioGender) },
                { label: 'Identity', value: fmt(data.genderIdentity) },
                { label: 'Age', value: fmt(data.age) },
                { label: 'Height', value: data.heightCm ? `${data.heightCm} cm` : '' },
                { label: 'Weight', value: data.weightKg ? `${data.weightKg} kg` : '' },
                { label: 'Nationality', value: fmt(data.nationality) },
                { label: 'Activity', value: fmt(data.activityLevel) },
            ]} />

            <ReviewCard title="Routine" icon="🏃" stepIdx={1} onEdit={onEdit} items={[
                { label: 'Work Type', value: fmt(data.workType) },
                { label: 'Wake Time', value: fmt(data.wakeTime) },
                { label: 'Sleep Time', value: fmt(data.sleepTime) },
                { label: 'Commute', value: fmt(data.commuteType) },
                { label: 'Exercise', value: fmt(data.exerciseFreq) },
            ]} />

            <ReviewCard title="Diet" icon="🥗" stepIdx={2} onEdit={onEdit} items={[
                { label: 'Diet Type', value: fmt(data.dietType) },
                { label: 'Meals/Day', value: fmt(data.mealsPerDay) },
                { label: 'Snacking', value: fmt(data.snackHabit) },
                { label: 'Water', value: data.waterGlasses ? `${data.waterGlasses} glasses` : '' },
                { label: 'Allergies', value: fmtArr(data.foodAllergies) },
                { label: 'Cuisines', value: fmtArr(data.cuisinePrefs) },
            ]} />

            <ReviewCard title="Health" icon="🏥" stepIdx={3} onEdit={onEdit} items={[
                { label: 'Blood Sugar', value: fmt(data.bloodSugar) },
                { label: 'Cholesterol', value: fmt(data.cholesterol) },
                { label: 'Conditions', value: fmtArr(data.conditions) },
                { label: 'Medications', value: fmt(data.medications) },
                { label: 'Family History', value: fmtArr(data.familyHistory) },
            ]} />

            <ReviewCard title="Lifestyle" icon="🌙" stepIdx={4} onEdit={onEdit} items={[
                { label: 'Smoking', value: fmt(data.smokingStatus) },
                { label: 'Alcohol', value: fmt(data.alcoholFreq) },
                { label: 'Sleep', value: data.sleepHours ? `${data.sleepHours} hrs` : '' },
                { label: 'Stress', value: data.stressLevel ? `${data.stressLevel}/5` : '' },
                { label: 'Status', value: fmt(data.maritalStatus) },
                { label: 'Pregnancy', value: fmt(data.pregnancyStatus) },
                { label: 'Kids', value: fmt(data.numChildren) },
            ]} />

            <ReviewCard title="Thoughts" icon="💭" stepIdx={5} onEdit={onEdit} items={[
                { label: 'Personal Notes', value: fmt(data.personalNotes) },
            ]} />

            <ReviewCard title="Dream Goals" icon="⭐" stepIdx={6} onEdit={onEdit} items={[
                { label: 'Dream Weight', value: data.dreamWeight ? `${data.dreamWeight} kg` : '' },
                { label: 'Fitness Level', value: fmt(data.dreamFitness) },
                { label: 'Food Habits', value: fmtArr(data.dreamFoodHabits) },
                { label: 'Daily Routine', value: fmt(data.dreamRoutine) },
                { label: 'Habits', value: fmtArr(data.dreamHabits) },
            ]} />
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.dark.background },

    // Progress
    progressWrap: {
        paddingTop: Platform.OS === 'ios' ? 56 : 38,
        paddingHorizontal: Spacing.lg,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    progressTrack: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.dark.border,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: Colors.primary,
    },
    progressLabel: {
        fontSize: 12,
        color: Colors.dark.textTertiary,
        fontWeight: '500',
        minWidth: 62,
        textAlign: 'right',
    },

    // Step header
    stepHeader: {
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    stepIcon: { fontSize: 40, marginBottom: 4 },
    stepTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: Colors.dark.text,
        letterSpacing: -0.5,
    },
    stepSub: {
        fontSize: 14,
        color: Colors.dark.textSecondary,
        marginTop: 4,
    },

    // Scroll
    scrollBody: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 8 },

    // Shared
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.dark.textSecondary,
        marginTop: 18,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    row2: { flexDirection: 'row', gap: 10 },
    inputLabel: {
        fontSize: 12,
        color: Colors.dark.textSecondary,
        fontWeight: '500',
        marginBottom: 4,
    },
    input: {
        backgroundColor: Colors.dark.surface,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 9,
        color: Colors.dark.text,
        fontSize: 14,
    },

    // Pills
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        backgroundColor: Colors.dark.surface,
    },
    pillActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '1A',
    },
    pillText: {
        fontSize: 13,
        color: Colors.dark.textSecondary,
        fontWeight: '500',
    },
    pillTextActive: {
        color: Colors.primary,
        fontWeight: '700',
    },

    // BMI
    bmiCard: {
        backgroundColor: Colors.dark.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        padding: Spacing.md,
        alignItems: 'center',
        marginTop: 8,
    },
    bmiLabel: {
        fontSize: 11,
        color: Colors.dark.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    bmiVal: {
        fontSize: 28,
        fontWeight: '800',
        marginVertical: 2,
    },
    bmiDesc: {
        fontSize: 12,
        color: Colors.dark.textSecondary,
        fontWeight: '500',
    },
    bmiGuide: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        marginBottom: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: Colors.accent + '12',
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.accent + '30',
    },
    bmiGuideText: {
        flex: 1,
        fontSize: 12,
        color: Colors.accent,
        fontWeight: '500',
    },

    // Stress
    stressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    stressItem: {
        flex: 1,
        alignItems: 'center',
        padding: 10,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        backgroundColor: Colors.dark.surface,
    },
    stressItemActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '1A',
    },
    stressLbl: {
        fontSize: 12,
        color: Colors.dark.textTertiary,
        marginTop: 4,
        fontWeight: '600',
    },

    // Thoughts
    thoughtsCard: {
        backgroundColor: Colors.dark.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        padding: Spacing.lg,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    thoughtsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.dark.text,
        marginBottom: 6,
    },
    thoughtsDesc: {
        fontSize: 14,
        color: Colors.dark.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    thoughtsInput: {
        backgroundColor: Colors.dark.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        padding: Spacing.md,
        color: Colors.dark.text,
        fontSize: 14,
        lineHeight: 22,
        height: 180,
        textAlignVertical: 'top',
    },
    thoughtsHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        justifyContent: 'center',
    },
    thoughtsHintText: {
        fontSize: 12,
        color: Colors.dark.textTertiary,
    },

    // Review
    reviewBanner: {
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        gap: 4,
    },
    reviewBannerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.dark.text,
    },
    reviewBannerSub: {
        fontSize: 13,
        color: Colors.dark.textSecondary,
        textAlign: 'center',
    },
    reviewCard: {
        backgroundColor: Colors.dark.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        marginBottom: 10,
        overflow: 'hidden',
    },
    reviewCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.border,
    },
    reviewCardTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.dark.text,
    },
    reviewEditBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: Colors.primary + '1A',
    },
    reviewEditText: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
    },
    reviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.dark.border,
    },
    reviewLabel: {
        fontSize: 13,
        color: Colors.dark.textSecondary,
        flex: 1,
    },
    reviewValue: {
        fontSize: 13,
        color: Colors.dark.text,
        fontWeight: '600',
        flex: 1.5,
        textAlign: 'right',
    },
    reviewEmpty: {
        padding: 12,
        fontSize: 12,
        color: Colors.dark.textTertiary,
        fontStyle: 'italic',
        textAlign: 'center',
    },

    // Bottom nav
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 16,
        borderTopWidth: 1,
        borderTopColor: Colors.dark.border,
        backgroundColor: Colors.dark.background,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 10,
        paddingHorizontal: 6,
    },
    backBtnText: {
        fontSize: 15,
        color: Colors.dark.text,
        fontWeight: '500',
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: BorderRadius.lg,
    },
    nextBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    // Measurement step
    measureTip: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,230,118,0.1)',
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(0,230,118,0.25)',
        padding: Spacing.md,
        gap: Spacing.sm,
        marginBottom: Spacing.md,
        alignItems: 'flex-start',
    },
    measureTipIcon: { fontSize: 28 },
    measureTipTitle: {
        fontSize: Typography.sizes.bodyLarge,
        color: Colors.success,
        fontWeight: Typography.weights.semibold,
        marginBottom: 3,
    },
    measureTipBody: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textSecondary,
        lineHeight: 18,
    },
    measureHint: {
        fontSize: Typography.sizes.caption,
        color: Colors.dark.textTertiary,
        marginTop: -6,
        marginBottom: 6,
        paddingLeft: 2,
    },
    skipLink: {
        alignSelf: 'center',
        paddingVertical: Spacing.md,
        marginTop: Spacing.sm,
    },
    skipLinkText: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textTertiary,
        textDecorationLine: 'underline',
    },
});

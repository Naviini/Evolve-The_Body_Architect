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

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
    Modal,
    FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { saveOnboardingProfile, getOnboardingProfile } from '@/src/lib/database';
import {
    BiologicalGender, GenderIdentity, ActivityLevel, WorkType,
    DietType, SnackingHabit, HealthLevel, SmokingStatus,
    AlcoholFrequency, MaritalStatus, PregnancyStatus, FitnessLevel,
    StressLevel, DreamBodyStyle,
} from '@/src/types';

type OnboardingPageKey =
    | 'basics'
    | 'routine'
    | 'diet_a'
    | 'diet_b'
    | 'health_a'
    | 'health_b'
    | 'lifestyle_a'
    | 'lifestyle_b'
    | 'thoughts'
    | 'goals_a'
    | 'goals_b'
    | 'goals_c'
    | 'measurements_a'
    | 'review';

const ONBOARDING_PAGES: Array<{ key: OnboardingPageKey; metaIdx: number; sectionIdx: number }> = [
    { key: 'basics', metaIdx: 0, sectionIdx: 0 },
    { key: 'routine', metaIdx: 1, sectionIdx: 1 },
    { key: 'diet_a', metaIdx: 2, sectionIdx: 2 },
    { key: 'diet_b', metaIdx: 2, sectionIdx: 2 },
    { key: 'health_a', metaIdx: 3, sectionIdx: 3 },
    { key: 'health_b', metaIdx: 3, sectionIdx: 3 },
    { key: 'lifestyle_a', metaIdx: 4, sectionIdx: 4 },
    { key: 'lifestyle_b', metaIdx: 4, sectionIdx: 4 },
    { key: 'thoughts', metaIdx: 5, sectionIdx: 5 },
    { key: 'goals_a', metaIdx: 6, sectionIdx: 6 },
    { key: 'goals_b', metaIdx: 6, sectionIdx: 6 },
    { key: 'goals_c', metaIdx: 6, sectionIdx: 6 },
    { key: 'measurements_a', metaIdx: 7, sectionIdx: 7 },
    { key: 'review', metaIdx: 8, sectionIdx: 8 },
];

const TOTAL_STEPS = ONBOARDING_PAGES.length;

const ONBOARDING_THEME = {
    bg: '#050A1D',
    surface: '#171E3F',
    surfaceSoft: '#202A56',
    border: '#2B366C',
    accent: '#6A64FF',
    accentStrong: '#8E9DFF',
    textMuted: '#9AA7D6',
    textSoft: '#7D89BA',
};

const STEP_GRADIENT = ['#5E68FF', '#7C89FF'] as const;

const SELECTABLE_HIGHLIGHT_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
    ['#2C9EEA', '#4DB7F2'],
    ['#F0A54A', '#F7BE67'],
    ['#6C7CFF', '#8A6EF0'],
    ['#FF7291', '#FF8F71'],
    ['#2FBF97', '#47C8B2'],
    ['#4E88FF', '#5EA2FF'],
];

function getSelectableHighlightGradient(index: number): readonly [string, string] {
    return SELECTABLE_HIGHLIGHT_GRADIENTS[index % SELECTABLE_HIGHLIGHT_GRADIENTS.length];
}

type WeightUnit = 'kg' | 'lb';
type HeightUnit = 'cm' | 'm' | 'ft' | 'in';
type LengthUnit = 'cm' | 'in';

function toKg(value: number, unit: WeightUnit): number {
    if (unit === 'lb') return value * 0.45359237;
    return value;
}

function fromKg(value: number, unit: WeightUnit): number {
    if (unit === 'lb') return value / 0.45359237;
    return value;
}

function toCm(value: number, unit: HeightUnit | LengthUnit): number {
    if (unit === 'm') return value * 100;
    if (unit === 'ft') return value * 30.48;
    if (unit === 'in') return value * 2.54;
    return value;
}

function fromCm(value: number, unit: HeightUnit | LengthUnit): number {
    if (unit === 'm') return value / 100;
    if (unit === 'ft') return value / 30.48;
    if (unit === 'in') return value / 2.54;
    return value;
}

function parseNumberOrNull(v: string): number | null {
    const parsed = parseFloat(v);
    return Number.isFinite(parsed) ? parsed : null;
}

function formatConverted(value: number): string {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.00$/, '');
}

// ── Step metadata ──────────────────────────────────────────
const STEP_META: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; gradient: readonly [string, string] }> = [
    { icon: 'person-outline', title: 'About You', sub: 'Let\'s start with the basics', gradient: STEP_GRADIENT },
    { icon: 'walk-outline', title: 'Your Routine', sub: 'Tell us about your daily life', gradient: STEP_GRADIENT },
    { icon: 'restaurant-outline', title: 'Your Diet', sub: 'What does your diet look like?', gradient: STEP_GRADIENT },
    { icon: 'medkit-outline', title: 'Your Health', sub: 'Any health details we should know?', gradient: STEP_GRADIENT },
    { icon: 'moon-outline', title: 'Your Lifestyle', sub: 'A few lifestyle questions', gradient: STEP_GRADIENT },
    { icon: 'chatbubble-ellipses-outline', title: 'Your Thoughts', sub: 'Anything you\'d like to share', gradient: STEP_GRADIENT },
    { icon: 'trophy-outline', title: 'Your Dream Self', sub: 'What do you want to achieve?', gradient: STEP_GRADIENT },
    { icon: 'resize-outline', title: 'Body Measurements', sub: 'Helps us detect your body type accurately', gradient: STEP_GRADIENT },
    { icon: 'checkmark-done-outline', title: 'All Set!', sub: 'Review your profile', gradient: STEP_GRADIENT },
];

const STEP_COACH_MILESTONES: Partial<Record<number, string>> = {
    1: 'Nice work. We just unlocked your routine personalization.',
    3: 'Great progress. Your diet profile is complete.',
    5: 'Excellent. Your health insights are now ready.',
    7: 'Great momentum. Lifestyle mapping is complete.',
    11: 'Awesome. Your dream transformation planner is unlocked.',
    13: 'Beautiful finish. Your full personal plan is ready.',
};

const COACH_VOICE_MUTED_KEY = '@coach_voice_muted';

type CoachSpeechVoice = {
    identifier?: string;
    language?: string;
    name?: string;
    quality?: string;
};

function pickBestCoachVoice(voices: CoachSpeechVoice[]): string | undefined {
    if (!voices?.length) return undefined;

    const scoreVoice = (voice: CoachSpeechVoice): number => {
        const language = (voice.language ?? '').toLowerCase();
        const name = (voice.name ?? '').toLowerCase();
        const identifier = (voice.identifier ?? '').toLowerCase();
        const quality = (voice.quality ?? '').toLowerCase();

        let score = 0;
        if (language.startsWith('en-us')) score += 10;
        else if (language.startsWith('en')) score += 6;

        if (quality.includes('enhanced') || quality.includes('premium')) score += 8;
        if (name.includes('siri') || identifier.includes('siri')) score += 5;
        if (name.includes('natural') || identifier.includes('natural')) score += 4;
        if (name.includes('neural') || identifier.includes('neural')) score += 4;
        if (name.includes('google') || identifier.includes('google')) score += 2;

        return score;
    };

    const sorted = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
    return sorted[0]?.identifier;
}

function getBmiZone(bmiValue: string | number): {
    label: string;
    valueColor: string;
    borderColor: string;
    bgColor: string;
    labelColor: string;
} {
    const value = typeof bmiValue === 'number' ? bmiValue : parseFloat(bmiValue);

    if (value < 18.5) {
        return {
            label: 'Underweight',
            valueColor: '#F6C177',
            borderColor: '#7A5A2B',
            bgColor: '#2A2117',
            labelColor: '#E7C795',
        };
    }

    if (value < 25) {
        return {
            label: 'Normal',
            valueColor: '#7EE2A8',
            borderColor: '#2D6E50',
            bgColor: '#162B22',
            labelColor: '#BFEBD2',
        };
    }

    if (value < 30) {
        return {
            label: 'Overweight',
            valueColor: '#F3A963',
            borderColor: '#8A5E2E',
            bgColor: '#2E2116',
            labelColor: '#E7C29C',
        };
    }

    return {
        label: 'Obese',
        valueColor: '#FF8B97',
        borderColor: '#8E3F4D',
        bgColor: '#331B23',
        labelColor: '#F2BEC7',
    };
}

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
    const [coachVoiceMuted, setCoachVoiceMuted] = useState(false);
    const [coachVoicePrefLoaded, setCoachVoicePrefLoaded] = useState(false);
    const [coachVoiceReady, setCoachVoiceReady] = useState(false);
    const [coachVoiceId, setCoachVoiceId] = useState<string | undefined>(undefined);
    const coachSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    // Step 7b: Dream Body Simulation
    const [dreamBodyStyle, setDreamBodyStyle] = useState<DreamBodyStyle | null>(null);
    const [dreamBodyDescription, setDreamBodyDescription] = useState('');
    const [targetBFPercent, setTargetBFPercent] = useState('');

    // Step 8: Body Measurements
    const [waistCm, setWaistCm] = useState('');
    const [hipCm, setHipCm] = useState('');
    const [neckCm, setNeckCm] = useState('');
    const [wristCm, setWristCm] = useState('');

    // Unit preferences for measurement inputs
    const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
    const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
    const [lengthUnit, setLengthUnit] = useState<LengthUnit>('cm');

    const convertWeightValue = (value: string, from: WeightUnit, to: WeightUnit) => {
        const parsed = parseNumberOrNull(value);
        if (parsed === null) return value;
        return formatConverted(fromKg(toKg(parsed, from), to));
    };

    const convertHeightValue = (value: string, from: HeightUnit, to: HeightUnit) => {
        const parsed = parseNumberOrNull(value);
        if (parsed === null) return value;
        return formatConverted(fromCm(toCm(parsed, from), to));
    };

    const convertLengthValue = (value: string, from: LengthUnit, to: LengthUnit) => {
        const parsed = parseNumberOrNull(value);
        if (parsed === null) return value;
        return formatConverted(fromCm(toCm(parsed, from), to));
    };

    const handleWeightUnitChange = (next: WeightUnit) => {
        if (next === weightUnit) return;
        setWeightKg(prev => convertWeightValue(prev, weightUnit, next));
        setDreamWeight(prev => convertWeightValue(prev, weightUnit, next));
        setWeightUnit(next);
    };

    const handleHeightUnitChange = (next: HeightUnit) => {
        if (next === heightUnit) return;
        setHeightCm(prev => convertHeightValue(prev, heightUnit, next));
        setHeightUnit(next);
    };

    const handleLengthUnitChange = (next: LengthUnit) => {
        if (next === lengthUnit) return;
        setWaistCm(prev => convertLengthValue(prev, lengthUnit, next));
        setHipCm(prev => convertLengthValue(prev, lengthUnit, next));
        setNeckCm(prev => convertLengthValue(prev, lengthUnit, next));
        setWristCm(prev => convertLengthValue(prev, lengthUnit, next));
        setLengthUnit(next);
    };

    const toggleCoachVoice = async () => {
        const nextMuted = !coachVoiceMuted;
        setCoachVoiceMuted(nextMuted);
        try {
            await AsyncStorage.setItem(COACH_VOICE_MUTED_KEY, String(nextMuted));
        } catch {
            // Ignore preference persistence errors
        }
        if (nextMuted) {
            Speech.stop();
        }
    };

    useEffect(() => {
        let mounted = true;

        AsyncStorage.getItem(COACH_VOICE_MUTED_KEY)
            .then((value) => {
                if (!mounted) return;
                setCoachVoiceMuted(value === 'true');
            })
            .catch(() => {
                // Keep default if preference read fails
            })
            .finally(() => {
                if (mounted) setCoachVoicePrefLoaded(true);
            });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        Speech.getAvailableVoicesAsync()
            .then((voices) => {
                if (!mounted) return;
                const selectedVoice = pickBestCoachVoice(voices as CoachSpeechVoice[]);
                setCoachVoiceId(selectedVoice);
            })
            .catch(() => {
                // Fallback to default system voice
            })
            .finally(() => {
                if (mounted) setCoachVoiceReady(true);
            });

        return () => {
            mounted = false;
        };
    }, []);

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

    const jumpTo = (sectionIdx: number) => {
        const pageIndex = ONBOARDING_PAGES.findIndex(page => page.sectionIdx === sectionIdx);
        const target = pageIndex >= 0 ? pageIndex : 0;
        setStep(target);
        animateProgress(target);
    };

    // ── Save ─────────────────────────────────────────────────
    const handleFinish = async () => {
        setSaving(true);
        try {
            await saveOnboardingProfile(editUserId, {
                biological_gender: bioGender,
                gender_identity: genderIdentity,
                age: parseInt(age) || null,
                height_cm: (() => {
                    const n = parseNumberOrNull(heightCm);
                    return n === null ? null : toCm(n, heightUnit);
                })(),
                weight_kg: (() => {
                    const n = parseNumberOrNull(weightKg);
                    return n === null ? null : toKg(n, weightUnit);
                })(),
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
                dream_weight_kg: (() => {
                    const n = parseNumberOrNull(dreamWeight);
                    return n === null ? null : toKg(n, weightUnit);
                })(),
                dream_fitness_level: dreamFitness,
                dream_food_habits: dreamFoodHabits,
                dream_daily_routine: dreamRoutine || null,
                dream_special_habits: dreamHabits,
                waist_cm: (() => {
                    const n = parseNumberOrNull(waistCm);
                    return n === null ? null : toCm(n, lengthUnit);
                })(),
                hip_cm: (() => {
                    const n = parseNumberOrNull(hipCm);
                    return n === null ? null : toCm(n, lengthUnit);
                })(),
                neck_cm: (() => {
                    const n = parseNumberOrNull(neckCm);
                    return n === null ? null : toCm(n, lengthUnit);
                })(),
                wrist_cm: (() => {
                    const n = parseNumberOrNull(wristCm);
                    return n === null ? null : toCm(n, lengthUnit);
                })(),
            });
            if (isEditMode) {
                // Return to home after editing
                router.replace('/(tabs)');
            } else {
                router.push('/(auth)/register');
            }
        } catch (e) {
            console.error('Save error', e);
            Alert.alert('Oops', 'Could not save your profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // ── Render ───────────────────────────────────────────────
    const currentPage = ONBOARDING_PAGES[step]?.key ?? 'basics';
    const meta = STEP_META[ONBOARDING_PAGES[step]?.metaIdx ?? 0];
    const milestoneMessage = STEP_COACH_MILESTONES[step] ?? null;
    const coachIntroSpeech = currentPage === 'basics'
        ? "Hi there, I'm your future fitness and emotionally intelligent coach. Let's do this together."
        : null;
    const coachNarrationSegments = useMemo(
        () => [
            coachIntroSpeech,
            milestoneMessage ?? 'Keep going. You are building your custom fitness profile.',
        ].filter((segment): segment is string => Boolean(segment)),
        [coachIntroSpeech, milestoneMessage],
    );

    useEffect(() => {
        if (!coachVoicePrefLoaded || !coachVoiceReady || coachVoiceMuted || loadingProfile) return;

        Speech.stop();
        let cancelled = false;
        let idx = 0;

        const speakNextSegment = () => {
            if (cancelled || idx >= coachNarrationSegments.length) return;

            const segment = coachNarrationSegments[idx];
            const isIntro = idx === 0 && !!coachIntroSpeech;
            idx += 1;

            Speech.speak(segment, {
                language: 'en-US',
                voice: coachVoiceId,
                pitch: isIntro ? 1.06 : 1.02,
                rate: isIntro ? 0.84 : 0.89,
                onDone: () => {
                    if (cancelled || idx >= coachNarrationSegments.length) return;
                    coachSpeechTimerRef.current = setTimeout(speakNextSegment, 220);
                },
                onError: () => {
                    if (cancelled || idx >= coachNarrationSegments.length) return;
                    coachSpeechTimerRef.current = setTimeout(speakNextSegment, 180);
                },
            });
        };

        speakNextSegment();

        return () => {
            cancelled = true;
            if (coachSpeechTimerRef.current) {
                clearTimeout(coachSpeechTimerRef.current);
                coachSpeechTimerRef.current = null;
            }
            Speech.stop();
        };
    }, [coachVoicePrefLoaded, coachVoiceReady, coachVoiceMuted, loadingProfile, coachNarrationSegments, coachVoiceId, coachIntroSpeech]);

    if (loadingProfile) {
        return (
            <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={ONBOARDING_THEME.accent} />
                <Text style={{ color: ONBOARDING_THEME.textMuted, marginTop: 12 }}>Loading your profile...</Text>
            </View>
        );
    }

    return (
        <View style={s.container}>
            <View pointerEvents="none" style={s.bgOrbTop} />
            <View pointerEvents="none" style={s.bgOrbBottom} />

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
                <TouchableOpacity style={s.voiceToggleBtn} onPress={toggleCoachVoice} activeOpacity={0.85}>
                    <Ionicons
                        name={coachVoiceMuted ? 'volume-mute' : 'volume-high'}
                        size={14}
                        color={coachVoiceMuted ? ONBOARDING_THEME.textSoft : ONBOARDING_THEME.accentStrong}
                    />
                </TouchableOpacity>
            </View>

            {/* ── Step header ───────────────────────────────── */}
            <View style={s.stepHeader}>
                <View style={s.stepIconWrap}>
                    <Ionicons name={meta.icon} size={28} color={ONBOARDING_THEME.accentStrong} />
                </View>
                <View style={s.stepTextWrap}>
                    <Text style={s.stepTitle}>{meta.title}</Text>
                    <Text style={s.stepSub}>{meta.sub}</Text>
                </View>
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
                    {currentPage === 'basics' && (
                        <StepBasics
                            bioGender={bioGender} setBioGender={setBioGender}
                            genderIdentity={genderIdentity} setGenderIdentity={setGenderIdentity}
                            age={age} setAge={setAge}
                            heightCm={heightCm} setHeightCm={setHeightCm}
                            weightKg={weightKg} setWeightKg={setWeightKg}
                            heightUnit={heightUnit} onHeightUnitChange={handleHeightUnitChange}
                            weightUnit={weightUnit} onWeightUnitChange={handleWeightUnitChange}
                            nationality={nationality} setNationality={setNationality}
                            activityLevel={activityLevel} setActivityLevel={setActivityLevel}
                        />
                    )}
                    {currentPage === 'routine' && (
                        <StepRoutine
                            workType={workType} setWorkType={setWorkType}
                            wakeTime={wakeTime} setWakeTime={setWakeTime}
                            sleepTime={sleepTime} setSleepTime={setSleepTime}
                            commuteType={commuteType} setCommuteType={setCommuteType}
                            exerciseFreq={exerciseFreq} setExerciseFreq={setExerciseFreq}
                        />
                    )}
                    {(currentPage === 'diet_a' || currentPage === 'diet_b') && (
                        <StepDiet
                            page={currentPage === 'diet_a' ? 1 : 2}
                            dietType={dietType} setDietType={setDietType}
                            mealsPerDay={mealsPerDay} setMealsPerDay={setMealsPerDay}
                            snackHabit={snackHabit} setSnackHabit={setSnackHabit}
                            waterGlasses={waterGlasses} setWaterGlasses={setWaterGlasses}
                            foodAllergies={foodAllergies} setFoodAllergies={setFoodAllergies}
                            cuisinePrefs={cuisinePrefs} setCuisinePrefs={setCuisinePrefs}
                        />
                    )}
                    {(currentPage === 'health_a' || currentPage === 'health_b') && (
                        <StepHealth
                            page={currentPage === 'health_a' ? 1 : 2}
                            bloodSugar={bloodSugar} setBloodSugar={setBloodSugar}
                            cholesterol={cholesterol} setCholesterol={setCholesterol}
                            conditions={conditions} setConditions={setConditions}
                            medications={medications} setMedications={setMedications}
                            familyHistory={familyHistory} setFamilyHistory={setFamilyHistory}
                        />
                    )}
                    {(currentPage === 'lifestyle_a' || currentPage === 'lifestyle_b') && (
                        <StepLifestyle
                            page={currentPage === 'lifestyle_a' ? 1 : 2}
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
                    {currentPage === 'thoughts' && (
                        <StepThoughts
                            personalNotes={personalNotes} setPersonalNotes={setPersonalNotes}
                        />
                    )}
                    {(currentPage === 'goals_a' || currentPage === 'goals_b' || currentPage === 'goals_c') && (
                        <StepGoals
                            page={currentPage === 'goals_a' ? 1 : currentPage === 'goals_b' ? 2 : 3}
                            dreamWeight={dreamWeight} setDreamWeight={setDreamWeight}
                            dreamFitness={dreamFitness} setDreamFitness={setDreamFitness}
                            dreamFoodHabits={dreamFoodHabits} setDreamFoodHabits={setDreamFoodHabits}
                            dreamRoutine={dreamRoutine} setDreamRoutine={setDreamRoutine}
                            dreamHabits={dreamHabits} setDreamHabits={setDreamHabits}
                            weightKg={weightKg} heightCm={heightCm}
                            weightUnit={weightUnit}
                            heightUnit={heightUnit}
                            onWeightUnitChange={handleWeightUnitChange}
                            dreamBodyStyle={dreamBodyStyle} setDreamBodyStyle={setDreamBodyStyle}
                            dreamBodyDescription={dreamBodyDescription} setDreamBodyDescription={setDreamBodyDescription}
                            targetBFPercent={targetBFPercent} setTargetBFPercent={setTargetBFPercent}
                        />
                    )}
                    {currentPage === 'measurements_a' && (
                        <StepMeasurements
                            isFemale={bioGender === 'female'}
                            waistCm={waistCm} setWaistCm={setWaistCm}
                            hipCm={hipCm} setHipCm={setHipCm}
                            neckCm={neckCm} setNeckCm={setNeckCm}
                            wristCm={wristCm} setWristCm={setWristCm}
                            lengthUnit={lengthUnit}
                            onLengthUnitChange={handleLengthUnitChange}
                            onSkip={goNext}
                        />
                    )}
                    {currentPage === 'review' && (
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
                                heightUnit, weightUnit, lengthUnit,
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
                        <Ionicons name="arrow-back" size={20} color="#E8EDFF" />
                        <Text style={s.backBtnText}>Back</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => {
                            if (isEditMode) {
                                router.back();
                                return;
                            }
                            router.replace('/(auth)/onboarding' as any);
                        }}
                        style={s.backBtn}
                    >
                        <Ionicons name="arrow-back" size={20} color={ONBOARDING_THEME.textSoft} />
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
                            colors={STEP_GRADIENT}
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

function SelectableGradientOverlay({
    active,
    colors,
    borderRadius,
}: {
    active: boolean;
    colors: readonly [string, string];
    borderRadius: number;
}) {
    const overlayOpacity = useRef(new Animated.Value(active ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(overlayOpacity, {
            toValue: active ? 1 : 0,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, [active, overlayOpacity]);

    return (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: overlayOpacity }]}>
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, borderRadius }}
            />
        </Animated.View>
    );
}

function PillPicker<T extends string>({
    options,
    selected,
    onSelect,
    labels,
    icons,
    iconColors,
    emphasizeIcons,
    justified = true,
    columns,
}: {
    options: T[];
    selected: T | null;
    onSelect: (v: T) => void;
    labels?: Record<T, string>;
    icons?: Record<T, string>;
    iconColors?: Partial<Record<T, string>>;
    emphasizeIcons?: boolean;
    justified?: boolean;
    columns?: 2 | 3;
}) {
    const isTwoColumn = columns === 2;

    return (
        <View style={[s.pillRow, justified && s.pillRowJustified]}>
            {options.map((opt, idx) => {
                const active = selected === opt;
                const activeGradient = getSelectableHighlightGradient(idx);
                return (
                    <TouchableOpacity
                        key={opt}
                        style={[s.pill, justified && s.pillJustified, isTwoColumn && s.pillTwoColumn, active && s.pillActive]}
                        onPress={() => onSelect(opt)}
                        activeOpacity={0.9}
                    >
                        <SelectableGradientOverlay active={active} colors={activeGradient} borderRadius={24} />

                        <View style={s.pillContent}>
                            {icons?.[opt] && (
                                emphasizeIcons ? (
                                    <View style={[s.pillIconBadge, active && s.pillIconBadgeActive]}>
                                        <Text style={[s.pillIconBadgeText, { color: active ? '#FFFFFF' : (iconColors?.[opt] ?? ONBOARDING_THEME.accentStrong) }]}>{icons[opt]}</Text>
                                    </View>
                                ) : (
                                    <Text style={{ fontSize: 16 }}>{icons[opt]}</Text>
                                )
                            )}
                            <Text style={[s.pillText, (justified || isTwoColumn) && s.pillTextCentered, active && s.pillTextActive]}>
                                {labels?.[opt] ?? opt.charAt(0).toUpperCase() + opt.slice(1).replace(/_/g, ' ')}
                            </Text>
                        </View>
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
    justified = true,
    columns,
}: {
    options: string[];
    selected: string[];
    onToggle: (v: string) => void;
    justified?: boolean;
    columns?: 2 | 3;
}) {
    const isTwoColumn = columns === 2;

    return (
        <View style={[s.pillRow, justified && s.pillRowJustified]}>
            {options.map((opt, idx) => {
                const active = selected.includes(opt);
                const activeGradient = getSelectableHighlightGradient(idx);
                return (
                    <TouchableOpacity
                        key={opt}
                        style={[s.pill, justified && s.pillJustified, isTwoColumn && s.pillTwoColumn, active && s.pillActive]}
                        onPress={() => onToggle(opt)}
                        activeOpacity={0.9}
                    >
                        <SelectableGradientOverlay active={active} colors={activeGradient} borderRadius={24} />

                        <View style={s.pillContent}>
                            <Ionicons
                                name={active ? 'checkmark-circle' : 'add-circle-outline'}
                                size={14}
                                color={active ? '#FFFFFF' : ONBOARDING_THEME.textSoft}
                            />
                            <Text style={[s.pillText, (justified || isTwoColumn) && s.pillTextCentered, active && s.pillTextActive]}>{opt}</Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

function toggleItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
}

function parseTimeString(value: string, fallback: string): Date {
    const source = value || fallback;
    const match = source.match(/^(\d{1,2}):(\d{2})$/);
    const date = new Date();

    if (match) {
        const hours = Math.max(0, Math.min(23, parseInt(match[1], 10)));
        const minutes = Math.max(0, Math.min(59, parseInt(match[2], 10)));
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    date.setHours(7, 0, 0, 0);
    return date;
}

function formatTimeString(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function ClockTimeInput({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    const [pickerVisible, setPickerVisible] = useState(false);
    const [iosTimeValue, setIosTimeValue] = useState<Date>(() => parseTimeString(value, placeholder));

    const openPicker = () => {
        if (Platform.OS === 'ios') {
            setIosTimeValue(parseTimeString(value, placeholder));
        }
        setPickerVisible(true);
    };

    const closePicker = () => setPickerVisible(false);

    const handleAndroidChange = (event: any, selectedDate?: Date) => {
        setPickerVisible(false);
        if (event?.type === 'set' && selectedDate) {
            onChange(formatTimeString(selectedDate));
        }
    };

    return (
        <View style={{ marginBottom: 16 }}>
            <View style={s.inputLabelRow}>
                <Text style={s.inputLabel}>{label}</Text>
            </View>

            <TouchableOpacity style={s.timeInputButton} activeOpacity={0.85} onPress={openPicker}>
                <Text style={[s.timeInputText, !value && s.timeInputPlaceholder]}>{value || placeholder}</Text>
                <Ionicons name="time-outline" size={18} color={ONBOARDING_THEME.textMuted} />
            </TouchableOpacity>

            {pickerVisible && Platform.OS === 'android' && (
                <DateTimePicker
                    value={parseTimeString(value, placeholder)}
                    mode="time"
                    is24Hour
                    display="clock"
                    onChange={handleAndroidChange}
                />
            )}

            {pickerVisible && Platform.OS === 'ios' && (
                <View style={s.timePickerInlineWrap}>
                    <DateTimePicker
                        value={iosTimeValue}
                        mode="time"
                        is24Hour
                        display="spinner"
                        onChange={(_, selectedDate) => {
                            if (selectedDate) {
                                setIosTimeValue(selectedDate);
                            }
                        }}
                    />
                    <TouchableOpacity
                        style={s.timePickerDoneBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                            onChange(formatTimeString(iosTimeValue));
                            closePicker();
                        }}
                    >
                        <Text style={s.timePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

function FormInput({
    label, value, onChangeText, keyboardType, placeholder, multiline,
    unitValue, unitOptions, onUnitChange,
}: {
    label: string; value: string; onChangeText: (v: string) => void;
    keyboardType?: 'default' | 'numeric' | 'decimal-pad';
    placeholder?: string; multiline?: boolean;
    unitValue?: string; unitOptions?: string[]; onUnitChange?: (v: string) => void;
}) {
    const [unitModalVisible, setUnitModalVisible] = useState(false);
    const hasUnitSelector = !!(unitValue && unitOptions && onUnitChange);
    const hasLabelRow = !!label;
    const unitDisplayValue = unitValue ? unitValue.toUpperCase() : '';

    return (
        <View style={{ marginBottom: 16 }}>
            {hasLabelRow && (
                <View style={s.inputLabelRow}>
                    {!!label && <Text style={s.inputLabel}>{label}</Text>}
                </View>
            )}

            <View style={s.inputControlWrap}>
                <TextInput
                    style={[
                        s.input,
                        hasUnitSelector && !multiline && s.inputWithUnit,
                        multiline && { height: 90, textAlignVertical: 'top' },
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType || 'default'}
                    placeholder={placeholder}
                    placeholderTextColor={ONBOARDING_THEME.textSoft}
                    multiline={multiline}
                />

                {hasUnitSelector && !multiline && (
                    <TouchableOpacity
                        style={s.inputUnitChip}
                        onPress={() => setUnitModalVisible(true)}
                        activeOpacity={0.85}
                    >
                        <Text style={s.inputUnitChipText}>({unitDisplayValue})</Text>
                        <Ionicons name="chevron-down" size={13} color={ONBOARDING_THEME.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {hasUnitSelector && (
                <Modal visible={unitModalVisible} transparent animationType="fade">
                    <TouchableOpacity style={s.unitModalBackdrop} activeOpacity={1} onPress={() => setUnitModalVisible(false)}>
                        <View style={s.unitModalCard}>
                            {unitOptions.map((opt) => {
                                const active = unitValue === opt;
                                return (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[s.unitOption, active && s.unitOptionActive]}
                                        onPress={() => {
                                            onUnitChange(opt);
                                            setUnitModalVisible(false);
                                        }}
                                    >
                                        <Text style={[s.unitOptionText, active && s.unitOptionTextActive]}>{opt.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
        </View>
    );
}

const NATIONALITY_OPTIONS = [
    'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan', 'Antiguans', 'Argentinean', 'Armenian',
    'Australian', 'Austrian', 'Azerbaijani', 'Bahamian', 'Bahraini', 'Bangladeshi', 'Barbadian', 'Barbudans', 'Batswana',
    'Belarusian', 'Belgian', 'Belizean', 'Beninese', 'Bhutanese', 'Bolivian', 'Bosnian', 'Brazilian', 'British',
    'Bruneian', 'Bulgarian', 'Burkinabe', 'Burmese', 'Burundian', 'Cambodian', 'Cameroonian', 'Canadian', 'Cape Verdean',
    'Central African', 'Chadian', 'Chilean', 'Chinese', 'Colombian', 'Comoran', 'Congolese', 'Costa Rican', 'Croatian',
    'Cuban', 'Cypriot', 'Czech', 'Danish', 'Djiboutian', 'Dominican', 'Dutch', 'East Timorese', 'Ecuadorean',
    'Egyptian', 'Emirian', 'Equatorial Guinean', 'Eritrean', 'Estonian', 'Ethiopian', 'Fijian', 'Filipino', 'Finnish',
    'French', 'Gabonese', 'Gambian', 'Georgian', 'German', 'Ghanaian', 'Greek', 'Grenadian', 'Guatemalan',
    'Guinea-Bissauan', 'Guinean', 'Guyanese', 'Haitian', 'Herzegovinian', 'Honduran', 'Hungarian', 'I-Kiribati', 'Icelander',
    'Indian', 'Indonesian', 'Iranian', 'Iraqi', 'Irish', 'Israeli', 'Italian', 'Ivorian', 'Jamaican', 'Japanese',
    'Jordanian', 'Kazakhstani', 'Kenyan', 'Kittian and Nevisian', 'Kuwaiti', 'Kyrgyz', 'Laotian', 'Latvian', 'Lebanese',
    'Liberian', 'Libyan', 'Liechtensteiner', 'Lithuanian', 'Luxembourger', 'Macedonian', 'Malagasy', 'Malawian', 'Malaysian',
    'Maldivan', 'Malian', 'Maltese', 'Marshallese', 'Mauritanian', 'Mauritian', 'Mexican', 'Micronesian', 'Moldovan',
    'Monacan', 'Mongolian', 'Moroccan', 'Mosotho', 'Motswana', 'Mozambican', 'Namibian', 'Nauruan', 'Nepalese',
    'New Zealander', 'Nicaraguan', 'Nigerian', 'Nigerien', 'North Korean', 'Northern Irish', 'Norwegian', 'Omani',
    'Pakistani', 'Palauan', 'Palestinian', 'Panamanian', 'Papua New Guinean', 'Paraguayan', 'Peruvian', 'Polish',
    'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Rwandan', 'Saint Lucian', 'Salvadoran', 'Samoan', 'San Marinese',
    'Sao Tomean', 'Saudi', 'Scottish', 'Senegalese', 'Serbian', 'Seychellois', 'Sierra Leonean', 'Singaporean',
    'Slovakian', 'Slovenian', 'Solomon Islander', 'Somali', 'South African', 'South Korean', 'Spanish', 'Sri Lankan',
    'Sudanese', 'Surinamer', 'Swazi', 'Swedish', 'Swiss', 'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian', 'Thai',
    'Togolese', 'Tongan', 'Trinidadian or Tobagonian', 'Tunisian', 'Turkish', 'Tuvaluan', 'Ugandan', 'Ukrainian',
    'Uruguayan', 'Uzbekistani', 'Venezuelan', 'Vietnamese', 'Welsh', 'Yemenite', 'Zambian', 'Zimbabwean',
    'African American', 'Asian', 'Caucasian', 'Hispanic', 'Latino', 'Middle Eastern', 'Native American', 'Pacific Islander', 'Mixed', 'Other'
].sort();

function SearchableDropdown({
    label, value, onSelect, placeholder, options, labels, inlineLabel
}: {
    label: string; value: string; onSelect: (v: string) => void; placeholder?: string; options: string[]; labels?: Record<string, string>; inlineLabel?: boolean
}) {
    const [modalVisible, setModalVisible] = useState(false);
    const [search, setSearch] = useState('');

    const getDisplayLabel = (opt: string) => labels?.[opt] ?? opt;

    const filteredOptions = options.filter(opt => {
        const normalizedSearch = search.toLowerCase();
        return opt.toLowerCase().includes(normalizedSearch) || getDisplayLabel(opt).toLowerCase().includes(normalizedSearch);
    });

    return (
        <View style={[{ marginBottom: 16 }, inlineLabel && s.inlineDropdownRow]}>
            {!inlineLabel && <Text style={[s.inputLabel, s.inputLabelStandalone]}>{label}</Text>}

            {inlineLabel && <Text style={s.inlineDropdownLabel}>{label}</Text>}

            <View style={inlineLabel ? s.inlineDropdownControlWrap : undefined}>
                <TouchableOpacity
                    style={[s.input, { justifyContent: 'center' }]}
                    onPress={() => { setModalVisible(true); setSearch(''); }}
                >
                    <Text style={{ color: value ? '#F1F4FF' : ONBOARDING_THEME.textSoft }}>
                        {value ? getDisplayLabel(value) : placeholder}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={ONBOARDING_THEME.textSoft} style={{ position: 'absolute', right: 12, top: 14 }} />
                </TouchableOpacity>
            </View>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: ONBOARDING_THEME.surface, height: '70%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, borderColor: ONBOARDING_THEME.border }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <Text style={{ color: '#EEF2FF', fontSize: 18, fontWeight: 'bold' }}>Select {label}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close" size={24} color="#EEF2FF" />
                            </TouchableOpacity>
                        </View>
                        
                        <TextInput
                            style={[s.input, { marginBottom: 15 }]}
                            placeholder="Search..."
                            placeholderTextColor={ONBOARDING_THEME.textSoft}
                            value={search}
                            onChangeText={setSearch}
                        />

                        <FlatList
                            data={filteredOptions}
                            keyExtractor={item => item}
                            renderItem={({item}) => (
                                <TouchableOpacity 
                                    style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: ONBOARDING_THEME.border }}
                                    onPress={() => { onSelect(item); setModalVisible(false); }}
                                >
                                    <Text style={{ color: '#EEF2FF', fontSize: 16, fontWeight: value === item ? 'bold' : 'normal' }}>
                                        {getDisplayLabel(item)}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={{ color: ONBOARDING_THEME.textSoft, textAlign: 'center', marginTop: 20 }}>No options found</Text>}
                            keyboardShouldPersistTaps="handled"
                        />
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 8: Body Measurements
// ════════════════════════════════════════════════════════════
function StepMeasurements({ isFemale, waistCm, setWaistCm, hipCm, setHipCm,
    neckCm, setNeckCm, wristCm, setWristCm, lengthUnit, onLengthUnitChange, onSkip }: any) {
    return (
        <View>
            <View style={s.measureTip}>
                <Text style={s.measureTipIcon}>📏</Text>
                <View style={{ flex: 1 }}>
                    <Text style={s.measureTipTitle}>Boost Detection Accuracy</Text>
                    <Text style={s.measureTipBody}>
                        Use a soft tape measure - pull snug but not tight.
                    </Text>
                </View>
            </View>

            <SectionLabel text="Waist" />
            <Text style={s.measureHint}>
                {isFemale ? 'Narrowest point of your waist' : 'Around the navel / belly button'}
            </Text>
            <FormInput
                label="" value={waistCm} onChangeText={setWaistCm}
                keyboardType="decimal-pad" placeholder={lengthUnit === 'cm' ? 'e.g. 80' : 'e.g. 31.5'}
                unitValue={lengthUnit}
                unitOptions={['cm', 'in']}
                onUnitChange={(v) => onLengthUnitChange(v as LengthUnit)}
            />

            {isFemale && (
                <>
                    <SectionLabel text="Hips" />
                    <Text style={s.measureHint}>Widest point of your hips / buttocks</Text>
                    <FormInput
                        label="" value={hipCm} onChangeText={setHipCm}
                        keyboardType="decimal-pad" placeholder={lengthUnit === 'cm' ? 'e.g. 95' : 'e.g. 37.4'}
                        unitValue={lengthUnit}
                        unitOptions={['cm', 'in']}
                        onUnitChange={(v) => onLengthUnitChange(v as LengthUnit)}
                    />
                </>
            )}

            <SectionLabel text="Neck" />
            <Text style={s.measureHint}>
                Just below the Adam's apple (larynx)
            </Text>
            <FormInput
                label="" value={neckCm} onChangeText={setNeckCm}
                keyboardType="decimal-pad" placeholder={lengthUnit === 'cm' ? 'e.g. 37' : 'e.g. 14.6'}
                unitValue={lengthUnit}
                unitOptions={['cm', 'in']}
                onUnitChange={(v) => onLengthUnitChange(v as LengthUnit)}
            />

            <SectionLabel text="Wrist" />
            <Text style={s.measureHint}>
                At the narrowest point (above the wrist bone)
            </Text>
            <FormInput
                label="" value={wristCm} onChangeText={setWristCm}
                keyboardType="decimal-pad" placeholder={lengthUnit === 'cm' ? 'e.g. 16' : 'e.g. 6.3'}
                unitValue={lengthUnit}
                unitOptions={['cm', 'in']}
                onUnitChange={(v) => onLengthUnitChange(v as LengthUnit)}
            />

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
    heightUnit, onHeightUnitChange, weightUnit, onWeightUnitChange,
    nationality, setNationality, activityLevel, setActivityLevel }: any) {

    const parsedWeight = parseNumberOrNull(weightKg);
    const parsedHeight = parseNumberOrNull(heightCm);
    const weightInKg = parsedWeight === null ? null : toKg(parsedWeight, weightUnit);
    const heightInCm = parsedHeight === null ? null : toCm(parsedHeight, heightUnit);

    const bmi = (weightInKg && heightInCm)
        ? (weightInKg / ((heightInCm / 100) ** 2)).toFixed(1)
        : null;
    const bmiZone = bmi ? getBmiZone(bmi) : null;

    return (
        <View>
            <SectionLabel text="Biological Gender" />
            <PillPicker
                options={['male', 'female', 'intersex'] as BiologicalGender[]}
                selected={bioGender}
                onSelect={setBioGender}
                icons={{ male: '♂️', female: '♀️', intersex: '⚧' }}
                iconColors={{ male: '#73A6FF', female: '#F97AD0', intersex: '#A9B9FF' }}
                emphasizeIcons
                justified
            />

            <View style={s.topicGap}>
                <SearchableDropdown
                    label="Gender Identity"
                    inlineLabel
                    options={[
                        'man',
                        'woman',
                        'non_binary',
                        'agender',
                        'genderfluid',
                        'genderqueer',
                        'trans_man',
                        'trans_woman',
                        'bigender',
                        'demiboy',
                        'demigirl',
                        'questioning',
                        'prefer_not_to_say',
                        'other',
                    ] as GenderIdentity[]}
                    value={genderIdentity || ''}
                    onSelect={(v) => setGenderIdentity(v as GenderIdentity)}
                    placeholder="Select gender identity"
                    labels={{
                        man: 'Man',
                        woman: 'Woman',
                        non_binary: 'Non-binary',
                        agender: 'Agender',
                        genderfluid: 'Genderfluid',
                        genderqueer: 'Genderqueer',
                        trans_man: 'Trans man',
                        trans_woman: 'Trans woman',
                        bigender: 'Bigender',
                        demiboy: 'Demiboy',
                        demigirl: 'Demigirl',
                        questioning: 'Questioning',
                        prefer_not_to_say: 'Prefer not to say',
                        other: 'Other',
                    }}
                />
            </View>

            <View style={s.row2}>
                <View style={s.rowField}>
                    <FormInput label="Age" value={age} onChangeText={setAge} keyboardType="numeric" placeholder="25" />
                </View>
                <View style={s.rowField}>
                    <SearchableDropdown
                        label="Nationality / Race"
                        value={nationality}
                        onSelect={setNationality}
                        placeholder="e.g. Asian"
                        options={NATIONALITY_OPTIONS}
                    />
                </View>
            </View>

            <View style={s.row2}>
                <View style={s.rowField}>
                    <FormInput
                        label="Height"
                        value={heightCm}
                        onChangeText={setHeightCm}
                        keyboardType="decimal-pad"
                        placeholder={heightUnit === 'cm' ? '170' : heightUnit === 'm' ? '1.70' : heightUnit === 'ft' ? '5.7' : '67'}
                        unitValue={heightUnit}
                        unitOptions={['cm', 'm', 'ft', 'in']}
                        onUnitChange={(v) => onHeightUnitChange(v as HeightUnit)}
                    />
                </View>
                <View style={s.rowField}>
                    <FormInput
                        label="Weight"
                        value={weightKg}
                        onChangeText={setWeightKg}
                        keyboardType="decimal-pad"
                        placeholder={weightUnit === 'kg' ? '70' : '154'}
                        unitValue={weightUnit}
                        unitOptions={['kg', 'lb']}
                        onUnitChange={(v) => onWeightUnitChange(v as WeightUnit)}
                    />
                </View>
            </View>

            {bmi && bmiZone && (
                <View style={[s.bmiCard, { borderColor: bmiZone.borderColor, backgroundColor: bmiZone.bgColor }]}>
                    <Text style={[s.bmiLabel, { color: bmiZone.labelColor }]}>Your BMI</Text>
                    <Text style={[s.bmiVal, { color: bmiZone.valueColor }]}>{bmi}</Text>
                    <Text style={[s.bmiDesc, { color: bmiZone.valueColor }]}>{bmiZone.label}</Text>
                </View>
            )}

            <SectionLabel text="Activity Level" />
            <PillPicker
                options={['sedentary', 'light', 'moderate', 'active', 'very_active'] as ActivityLevel[]}
                selected={activityLevel}
                onSelect={setActivityLevel}
                icons={{ sedentary: '🪑', light: '🚶', moderate: '🏃', active: '🏋️', very_active: '🔥' }}
                labels={{ sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', active: 'Active', very_active: 'Very Active' }}
                justified
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
                options={['desk', 'standing', 'retired', 'student', 'physical', 'other'] as WorkType[]}
                selected={workType}
                onSelect={setWorkType}
                icons={{ desk: '💻', standing: '🧑‍🍳', physical: '🏗️', student: '📚', retired: '🏡', other: '🔧' }}
                labels={{ desk: 'Desk Job', standing: 'Standing', physical: 'Physical Labour', student: 'Student', retired: 'Retired', other: 'Other' }}
            />

            <View style={[s.row2, s.topicGap]}>
                <View style={s.rowField}>
                    <ClockTimeInput label="Wake Up Time" value={wakeTime} onChange={setWakeTime} placeholder="07:00" />
                </View>
                <View style={s.rowField}>
                    <ClockTimeInput label="Bed Time" value={sleepTime} onChange={setSleepTime} placeholder="23:00" />
                </View>
            </View>

            <SectionLabel text="How do you commute?" />
            <PillPicker
                options={['Walk', 'Bicycle', 'Drive', 'Public Transit', 'Work from Home']}
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
function StepDiet({ page, dietType, setDietType, mealsPerDay, setMealsPerDay,
    snackHabit, setSnackHabit, waterGlasses, setWaterGlasses,
    foodAllergies, setFoodAllergies, cuisinePrefs, setCuisinePrefs }: any) {
    if (page === 2) {
        return (
            <View>
                <SectionLabel text="Any food allergies?" />
                <MultiChipPicker
                    options={['Gluten', 'Dairy', 'Nuts', 'Eggs', 'Soy', 'Shellfish', 'Fish', 'Wheat', 'None']}
                    selected={foodAllergies}
                    onToggle={(v) => setFoodAllergies(toggleItem(foodAllergies, v))}
                />

                <SectionLabel text="Cuisine preferences" />
                <MultiChipPicker
                    options={['Sri Lankan', 'Asian', 'Indian', 'Middle Eastern', 'Western', 'African', 'Japanese', 'Latin', 'Other', 'No Preference']}
                    selected={cuisinePrefs}
                    onToggle={(v) => setCuisinePrefs(toggleItem(cuisinePrefs, v))}
                    justified={true}
                />
            </View>
        );
    }

    return (
        <View>
            <SectionLabel text="What's your diet type?" />
            <PillPicker
                options={['omnivore', 'keto', 'pescatarian', 'vegetarian', 'paleo', 'vegan', 'mediterranean', 'other'] as DietType[]}
                selected={dietType}
                onSelect={setDietType}
                icons={{ omnivore: '🍖', keto: '🥑', pescatarian: '🐟', vegetarian: '🥬', paleo: '🦴', vegan: '🌱', mediterranean: '🫒', other: '🍽️' }}
                labels={{ omnivore: 'Omnivore', keto: 'Keto', pescatarian: 'Pescatarian', vegetarian: 'Vegetarian', paleo: 'Paleo', vegan: 'Vegan', mediterranean: 'Mediterranean', other: 'Other' }}
            />

            <View style={[s.row2, s.topicGap]}>
                <View style={s.rowField}>
                    <FormInput label="Meals per day" value={mealsPerDay} onChangeText={setMealsPerDay} keyboardType="numeric" placeholder="3" />
                </View>
                <View style={s.rowField}>
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
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 4: Health
// ════════════════════════════════════════════════════════════
function StepHealth({ page, bloodSugar, setBloodSugar, cholesterol, setCholesterol,
    conditions, setConditions, medications, setMedications,
    familyHistory, setFamilyHistory }: any) {
    if (page === 2) {
        return (
            <View>
                <FormInput
                    label="Current Medications (if any)"
                    value={medications}
                    onChangeText={setMedications}
                    placeholder="e.g. Metformin, Levothyroxine"
                />

                <SectionLabel text="Family health history" />
                <MultiChipPicker
                    options={['Diabetes', 'Heart Disease', 'Cancer', 'Hypertension', 'Obesity', 'Stroke', 'Other', 'None / Unknown']}
                    selected={familyHistory}
                    onToggle={(v) => setFamilyHistory(toggleItem(familyHistory, v))}
                    columns={2}
                />
            </View>
        );
    }

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
                options={['Diabetes', 'Asthma', 'Heart Disease', 'PCOS', 'Thyroid', 'IBS', 'Arthritis', 'Depression', 'Anxiety', 'Hypertension', 'None']}
                selected={conditions}
                onToggle={(v) => setConditions(toggleItem(conditions, v))}
            />
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 5: Lifestyle
// ════════════════════════════════════════════════════════════
function StepLifestyle({ page, smokingStatus, setSmokingStatus, alcoholFreq, setAlcoholFreq,
    sleepHours, setSleepHours, stressLevel, setStressLevel,
    maritalStatus, setMaritalStatus, pregnancyStatus, setPregnancyStatus,
    numChildren, setNumChildren, childrenNotes, setChildrenNotes }: any) {
    if (page === 2) {
        return (
            <View>
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
                    columns={2}
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

    return (
        <View>
            <SectionLabel text="Stress Level" />
            <View style={s.stressRow}>
                {([1, 2, 3, 4, 5] as StressLevel[]).map((lvl, idx) => {
                    const active = stressLevel === lvl;
                    const emojis = ['😊', '🙂', '😐', '😟', '😰'];
                    const activeGradient = getSelectableHighlightGradient(idx + 1);
                    return (
                        <TouchableOpacity
                            key={lvl}
                            style={[s.stressItem, active && s.stressItemActive]}
                            onPress={() => setStressLevel(lvl)}
                            activeOpacity={0.9}
                        >
                            <SelectableGradientOverlay active={active} colors={activeGradient} borderRadius={BorderRadius.md} />

                            <View style={s.stressItemContent}>
                                <Text style={{ fontSize: 24 }}>{emojis[lvl - 1]}</Text>
                                <Text style={[s.stressLbl, active && s.stressLblActive]}>{lvl}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={s.topicGap}>
                <FormInput label="Average sleep (hours/night)" value={sleepHours} onChangeText={setSleepHours} keyboardType="decimal-pad" placeholder="7" />
            </View>

            <SectionLabel text="Smoking" />
            <PillPicker
                options={['never', 'former', 'occasionally', 'daily'] as SmokingStatus[]}
                selected={smokingStatus}
                onSelect={setSmokingStatus}
                icons={{ never: '🚫', former: '🔙', occasionally: '🚬', daily: '💨' }}
                labels={{ never: 'Never', former: 'Former', occasionally: 'Occasionally', daily: 'Daily' }}
                columns={2}
            />

            <SectionLabel text="Alcohol" />
            <PillPicker
                options={['never', 'rarely', 'weekly', 'daily'] as AlcoholFrequency[]}
                selected={alcoholFreq}
                onSelect={setAlcoholFreq}
                icons={{ never: '🚫', rarely: '🍷', weekly: '🍺', daily: '🥃' }}
                labels={{ never: 'Never', rarely: 'Rarely', weekly: 'Weekly', daily: 'Daily' }}
            />
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
                placeholderTextColor={ONBOARDING_THEME.textSoft}
                multiline
                textAlignVertical="top"
            />

            <View style={s.thoughtsHint}>
                <Ionicons name="lock-closed" size={14} color={ONBOARDING_THEME.textSoft} />
                <Text style={s.thoughtsHintText}>This information is private and secure</Text>
            </View>
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Step 7: Goals
// ════════════════════════════════════════════════════════════
function StepGoals({ page, dreamWeight, setDreamWeight, dreamFitness, setDreamFitness,
    dreamFoodHabits, setDreamFoodHabits, dreamRoutine, setDreamRoutine,
    dreamHabits, setDreamHabits, weightKg, heightCm,
    weightUnit, heightUnit, onWeightUnitChange,
    dreamBodyStyle, setDreamBodyStyle, dreamBodyDescription, setDreamBodyDescription,
    targetBFPercent, setTargetBFPercent }: any) {

    const isFemale = false; // This component receives all props via 'any', so we use a placeholder
    const parsedHeight = parseNumberOrNull(heightCm);
    const parsedDreamWeight = parseNumberOrNull(dreamWeight);
    const h = parsedHeight === null ? null : toCm(parsedHeight, heightUnit) / 100;
    const dreamWeightKg = parsedDreamWeight === null ? null : toKg(parsedDreamWeight, weightUnit);
    const dreamBmi = (dreamWeightKg && h)
        ? (dreamWeightKg / (h * h)).toFixed(1)
        : null;
    const dreamBmiZone = dreamBmi ? getBmiZone(dreamBmi) : null;

    if (page === 2) {
        return (
            <View>
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

                <View style={s.topicGap}>
                    <FormInput
                        label="Dream Daily Routine (optional)"
                        value={dreamRoutine}
                        onChangeText={setDreamRoutine}
                        placeholder="e.g. Wake at 6, workout, healthy breakfast..."
                        multiline
                    />
                </View>
            </View>
        );
    }

    if (page === 3) {
        return (
            <View>
                <SectionLabel text="Dream Body Style" />
                <PillPicker
                    options={['lean_athletic', 'toned', 'muscular', 'slim', 'swimmer', 'runner', 'powerlifter', 'custom'] as DreamBodyStyle[]}
                    selected={dreamBodyStyle}
                    onSelect={setDreamBodyStyle}
                    columns={2}
                    icons={{
                        lean_athletic: '🏃', toned: '✨', muscular: '💪', slim: '🌿',
                        swimmer: '🏊', runner: '🏅', powerlifter: '🏋️', custom: '🎨',
                    }}
                    labels={{
                        lean_athletic: 'Lean & Athletic', toned: 'Toned', muscular: 'Muscular',
                        slim: 'Slim', swimmer: 'Swimmer', runner: 'Runner',
                        powerlifter: 'Powerlifter', custom: 'Custom',
                    }}
                />

                <View style={s.topicGap}>
                    <FormInput
                        label="Describe your dream body (optional)"
                        value={dreamBodyDescription}
                        onChangeText={setDreamBodyDescription}
                        placeholder="e.g. Lean and defined with visible abs, strong arms..."
                        multiline
                    />
                </View>

                <FormInput
                    label="Target Body Fat % (optional)"
                    value={targetBFPercent}
                    onChangeText={setTargetBFPercent}
                    keyboardType="decimal-pad"
                    placeholder={isFemale ? 'e.g. 20' : 'e.g. 12'}
                />

                {targetBFPercent && (
                    <View style={s.bfGuide}>
                        <Ionicons name="information-circle" size={14} color={ONBOARDING_THEME.accentStrong} />
                        <Text style={s.bfGuideText}>
                            {isFemale
                                ? 'Healthy range for women: 18–28%. Athletic: 14–20%.'
                                : 'Healthy range for men: 10–20%. Athletic: 6–14%.'}
                        </Text>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View>
            <View style={s.row2}>
                <View style={s.rowField}>
                    <FormInput
                        label="Dream Weight"
                        value={dreamWeight}
                        onChangeText={setDreamWeight}
                        keyboardType="decimal-pad"
                        placeholder={weightUnit === 'kg' ? '65' : '143'}
                        unitValue={weightUnit}
                        unitOptions={['kg', 'lb']}
                        onUnitChange={(v) => onWeightUnitChange(v as WeightUnit)}
                    />
                </View>
                <View style={s.rowField}>
                    {dreamBmi && dreamBmiZone && (
                        <View style={[s.bmiCard, { borderColor: dreamBmiZone.borderColor, backgroundColor: dreamBmiZone.bgColor }]}>
                            <Text style={[s.bmiLabel, { color: dreamBmiZone.labelColor }]}>Dream BMI</Text>
                            <Text style={[s.bmiVal, { color: dreamBmiZone.valueColor }]}>{dreamBmi}</Text>
                            <Text style={[s.bmiDesc, { color: dreamBmiZone.valueColor }]}>{dreamBmiZone.label}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* BMI guidance */}
            {h !== null && h > 0 && (
                <View style={s.bmiGuide}>
                    <Ionicons name="information-circle" size={16} color={ONBOARDING_THEME.accentStrong} />
                    <Text style={s.bmiGuideText}>
                        Healthy weight range for your height: {formatConverted(fromKg(18.5 * h * h, weightUnit))} – {formatConverted(fromKg(24.9 * h * h, weightUnit))} {weightUnit}
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
                columns={2}
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
                    <Ionicons name="pencil" size={14} color={ONBOARDING_THEME.accentStrong} />
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
            <ReviewCard title="Basics" icon="👤" stepIdx={0} onEdit={onEdit} items={[
                { label: 'Gender', value: fmt(data.bioGender) },
                { label: 'Identity', value: fmt(data.genderIdentity) },
                { label: 'Age', value: fmt(data.age) },
                { label: 'Height', value: data.heightCm ? `${data.heightCm} ${data.heightUnit ?? 'cm'}` : '' },
                { label: 'Weight', value: data.weightKg ? `${data.weightKg} ${data.weightUnit ?? 'kg'}` : '' },
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
                { label: 'Dream Weight', value: data.dreamWeight ? `${data.dreamWeight} ${data.weightUnit ?? 'kg'}` : '' },
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
    container: { flex: 1, backgroundColor: ONBOARDING_THEME.bg },
    bgOrbTop: {
        position: 'absolute',
        top: -120,
        right: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: ONBOARDING_THEME.accent,
        opacity: 0.14,
    },
    bgOrbBottom: {
        position: 'absolute',
        bottom: -150,
        left: -120,
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: ONBOARDING_THEME.accentStrong,
        opacity: 0.08,
    },

    // Progress
    progressWrap: {
        paddingTop: Platform.OS === 'ios' ? 44 : 28,
        paddingHorizontal: Spacing.lg,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressTrack: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: ONBOARDING_THEME.surfaceSoft,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: ONBOARDING_THEME.accent,
    },
    progressLabel: {
        fontSize: 12,
        color: ONBOARDING_THEME.textSoft,
        fontWeight: '500',
        minWidth: 62,
        textAlign: 'right',
    },
    voiceToggleBtn: {
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        backgroundColor: ONBOARDING_THEME.surface,
    },

    // Step header
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        gap: 14,
        paddingBottom: Spacing.md,
    },
    stepIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ONBOARDING_THEME.surface,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
    },
    stepTextWrap: {
        flex: 1,
        justifyContent: 'center',
        minHeight: 80,
    },
    stepTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#E8ECFF',
        letterSpacing: -0.5,
    },
    stepSub: {
        fontSize: 14,
        color: ONBOARDING_THEME.textMuted,
        marginTop: 2,
    },

    // Scroll
    scrollBody: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 8 },

    // Shared
    sectionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#EEF2FF',
        marginTop: 20,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    topicGap: {
        marginTop: 12,
    },
    row2: { flexDirection: 'row', gap: 14 },
    rowField: {
        flex: 1,
        minWidth: 0,
    },
    inputLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        minHeight: 20,
    },
    inputLabel: {
        fontSize: 15,
        color: '#EEF2FF',
        fontWeight: '700',
    },
    inputLabelStandalone: {
        marginBottom: 8,
    },
    inlineDropdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    inlineDropdownLabel: {
        fontSize: 15,
        color: '#EEF2FF',
        fontWeight: '700',
        minWidth: 132,
    },
    inlineDropdownControlWrap: {
        flex: 1,
    },
    inputControlWrap: {
        position: 'relative',
        justifyContent: 'center',
    },
    inputWithUnit: {
        paddingRight: 108,
    },
    inputUnitChip: {
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: [{ translateY: -16 }],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 12,
        minWidth: 86,
        height: 32,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        backgroundColor: ONBOARDING_THEME.surfaceSoft,
    },
    inputUnitChipText: {
        fontSize: 13,
        color: ONBOARDING_THEME.textMuted,
        fontWeight: '700',
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    input: {
        backgroundColor: ONBOARDING_THEME.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 13 : 10,
        color: '#F1F4FF',
        fontSize: 14,
    },
    timeInputButton: {
        backgroundColor: ONBOARDING_THEME.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        paddingHorizontal: 12,
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    timeInputText: {
        fontSize: 14,
        color: '#F1F4FF',
        fontWeight: '500',
    },
    timeInputPlaceholder: {
        color: ONBOARDING_THEME.textSoft,
    },
    timePickerInlineWrap: {
        marginTop: 8,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        backgroundColor: ONBOARDING_THEME.surface,
        paddingHorizontal: 8,
        paddingTop: 6,
        paddingBottom: 10,
    },
    timePickerDoneBtn: {
        alignSelf: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: ONBOARDING_THEME.accent + '22',
    },
    timePickerDoneText: {
        fontSize: 13,
        fontWeight: '700',
        color: ONBOARDING_THEME.accentStrong,
    },
    unitModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    unitModalCard: {
        width: '100%',
        maxWidth: 240,
        backgroundColor: ONBOARDING_THEME.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        padding: 8,
    },
    unitOption: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    unitOptionActive: {
        backgroundColor: ONBOARDING_THEME.accent + '22',
    },
    unitOptionText: {
        fontSize: 14,
        color: ONBOARDING_THEME.textMuted,
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    unitOptionTextActive: {
        color: ONBOARDING_THEME.accentStrong,
        fontWeight: '700',
    },

    // Pills
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    pillRowJustified: {
        justifyContent: 'space-between',
    },
    pill: {
        position: 'relative',
        overflow: 'hidden',
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        backgroundColor: ONBOARDING_THEME.surface,
    },
    pillContent: {
        zIndex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    pillActiveOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
        opacity: 0.88,
    },
    pillJustified: {
        flexBasis: '31%',
        flexGrow: 1,
        justifyContent: 'center',
    },
    pillTwoColumn: {
        flexBasis: '48%',
        flexGrow: 0,
        justifyContent: 'center',
    },
    pillIconBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ONBOARDING_THEME.surfaceSoft,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
    },
    pillIconBadgeActive: {
        borderColor: 'rgba(255,255,255,0.62)',
        backgroundColor: 'rgba(10,14,32,0.22)',
    },
    pillIconBadgeText: {
        fontSize: 16,
        fontWeight: '700',
    },
    pillActive: {
        borderColor: 'transparent',
        shadowColor: '#7DA6FF',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    pillText: {
        fontSize: 14,
        color: ONBOARDING_THEME.textMuted,
        fontWeight: '500',
    },
    pillTextCentered: {
        textAlign: 'center',
    },
    pillTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },

    // BMI
    bmiCard: {
        backgroundColor: ONBOARDING_THEME.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        padding: Spacing.md,
        alignItems: 'center',
        marginTop: 8,
    },
    bmiLabel: {
        fontSize: 12,
        color: '#EEF2FF',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    bmiVal: {
        fontSize: 28,
        fontWeight: '800',
        marginVertical: 2,
    },
    bmiDesc: {
        fontSize: 12,
        color: ONBOARDING_THEME.textMuted,
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
        backgroundColor: ONBOARDING_THEME.surfaceSoft,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
    },
    bmiGuideText: {
        flex: 1,
        fontSize: 12,
        color: ONBOARDING_THEME.accentStrong,
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
        position: 'relative',
        overflow: 'hidden',
        padding: 10,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        backgroundColor: ONBOARDING_THEME.surface,
    },
    stressItemContent: {
        zIndex: 1,
        alignItems: 'center',
    },
    stressItemActiveOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: BorderRadius.md,
        opacity: 0.88,
    },
    stressItemActive: {
        borderColor: 'transparent',
        shadowColor: '#7DA6FF',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 4,
    },
    stressLbl: {
        fontSize: 12,
        color: ONBOARDING_THEME.textSoft,
        marginTop: 4,
        fontWeight: '600',
    },
    stressLblActive: {
        color: '#FFFFFF',
    },

    // Thoughts
    thoughtsCard: {
        backgroundColor: ONBOARDING_THEME.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        padding: Spacing.lg,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    thoughtsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#EEF2FF',
        letterSpacing: 0.2,
        marginBottom: 6,
    },
    thoughtsDesc: {
        fontSize: 14,
        color: ONBOARDING_THEME.textMuted,
        textAlign: 'center',
        lineHeight: 22,
    },
    thoughtsInput: {
        backgroundColor: ONBOARDING_THEME.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        padding: Spacing.md,
        color: '#F1F4FF',
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
        color: ONBOARDING_THEME.textSoft,
    },

    // Review
    reviewCard: {
        backgroundColor: ONBOARDING_THEME.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        marginBottom: 10,
        overflow: 'hidden',
    },
    reviewCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: ONBOARDING_THEME.border,
    },
    reviewCardTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#EEF2FF',
        letterSpacing: 0.2,
    },
    reviewEditBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: ONBOARDING_THEME.accent + '20',
    },
    reviewEditText: {
        fontSize: 12,
        color: ONBOARDING_THEME.accentStrong,
        fontWeight: '600',
    },
    reviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: ONBOARDING_THEME.border,
    },
    reviewLabel: {
        fontSize: 13,
        color: ONBOARDING_THEME.textMuted,
        flex: 1,
    },
    reviewValue: {
        fontSize: 13,
        color: '#E9EEFF',
        fontWeight: '600',
        flex: 1.5,
        textAlign: 'right',
    },
    reviewEmpty: {
        padding: 12,
        fontSize: 12,
        color: ONBOARDING_THEME.textSoft,
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
        borderTopColor: ONBOARDING_THEME.border,
        backgroundColor: ONBOARDING_THEME.bg,
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
        color: '#E8EDFF',
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
        backgroundColor: ONBOARDING_THEME.surfaceSoft,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        padding: Spacing.md,
        gap: Spacing.sm,
        marginBottom: Spacing.md,
        alignItems: 'flex-start',
    },
    measureTipIcon: { fontSize: 28 },
    measureTipTitle: {
        fontSize: 15,
        color: '#EEF2FF',
        fontWeight: '700',
        letterSpacing: 0.2,
        marginBottom: 3,
    },
    measureTipBody: {
        fontSize: Typography.sizes.body,
        color: ONBOARDING_THEME.textMuted,
        lineHeight: 18,
    },
    measureHint: {
        fontSize: Typography.sizes.caption,
        color: ONBOARDING_THEME.textSoft,
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
        color: ONBOARDING_THEME.textMuted,
        textDecorationLine: 'underline',
    },

    bfGuide: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: ONBOARDING_THEME.surface,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: ONBOARDING_THEME.border,
        marginTop: -6,
        marginBottom: Spacing.sm,
    },
    bfGuideText: {
        fontSize: Typography.sizes.caption,
        color: ONBOARDING_THEME.accentStrong,
        flex: 1,
    },
});

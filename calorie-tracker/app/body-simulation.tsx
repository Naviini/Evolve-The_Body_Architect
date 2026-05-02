/**
 * Body Simulation Screen — "Your Transformation Journey"
 *
 * Immersive full-screen experience showing the user's body evolution
 * from their current state through milestone phases to their dream body.
 *
 * Features:
 *   - Phase timeline (swipeable pills)
 *   - Animated body silhouette morphing between phases
 *   - Stats panel (weight, body fat, daily calories)
 *   - Diet & workout focus cards per phase
 *   - Motivational messages
 *   - Compare mode (current vs selected)
 *   - Optional photo upload
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    Platform,
    ActivityIndicator,
    Dimensions,
    Alert,
    Image,
    Modal,
    FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUserHealthProfileForProcessing, saveBodyPhoto, getBodyPhotos, purgeStaleBlobPhotos } from '@/src/lib/database';
import { generateBodySimulation, inferDreamBodyStyle } from '@/src/lib/bodySimulationEngine';
import BodySilhouette from '@/components/BodySilhouette';
import BodyModel3D from '@/components/BodyModel3D';
import { MilestonePhase, OnboardingProfile, BodyPhotoRecord } from '@/src/types';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { analyzeBodyPhoto, BodyPhotoAnalysis } from '@/src/lib/bodyPhotoAnalysis';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Phase accent colors ────────────────────────────────────
const PHASE_COLORS = [
    '#6B7280', // Current — grey
    '#3B82F6', // Month 1 — blue
    '#8B5CF6', // Month 3 — purple
    '#F59E0B', // Month 6 — amber
    '#EF4444', // Year 1 — red
    '#10B981', // Dream — green
];

const PHASE_GRADIENTS: readonly [string, string][] = [
    ['#374151', '#1F2937'],
    ['#1E40AF', '#3B82F6'],
    ['#6D28D9', '#8B5CF6'],
    ['#D97706', '#F59E0B'],
    ['#DC2626', '#EF4444'],
    ['#059669', '#10B981'],
];

// ════════════════════════════════════════════════════════════
// Main Screen
// ════════════════════════════════════════════════════════════

export default function BodySimulationScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [phases, setPhases] = useState<MilestonePhase[]>([]);
    const [selectedPhase, setSelectedPhase] = useState(0);
    const [compareMode, setCompareMode] = useState(false);
    const [profile, setProfile] = useState<OnboardingProfile | null>(null);
    const [photosByPhase, setPhotosByPhase] = useState<Record<number, BodyPhotoRecord[]>>({});
    const [photoUploading, setPhotoUploading] = useState(false);
    const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<BodyPhotoAnalysis | null>(null);
    const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
    const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
    const slideAnim = useRef(new Animated.Value(0)).current;
    const timelineRef = useRef<ScrollView>(null);

    const gender = profile?.biological_gender === 'female' ? 'female' : 'male';

    // ── Load data ───────────────────────────────────────────
    useEffect(() => {
        const uid = user?.id ?? 'onboarding-temp';
        // Remove any stale blob: URIs left over from previous browser sessions
        purgeStaleBlobPhotos(uid).catch(() => {});
        Promise.all([
            getUserHealthProfileForProcessing(uid),
            getBodyPhotos(uid),
        ]).then(([p, photos]) => {
                if (p) {
                    setProfile(p);
                    const dreamStyle = inferDreamBodyStyle(p.dream_daily_routine);
                    const result = generateBodySimulation({
                        profile: p,
                        dreamBodyStyle: dreamStyle,
                        targetBFPercent: null,
                    });
                    setPhases(result);
                }
                // Group all valid (non-blob) photos by phase
                const grouped = photos
                    .filter(photo => !photo.localUri.startsWith('blob:'))
                    .reduce<Record<number, BodyPhotoRecord[]>>((acc, photo) => {
                        if (!acc[photo.phase]) acc[photo.phase] = [];
                        acc[photo.phase].push(photo);
                        return acc;
                    }, {});
                setPhotosByPhase(grouped);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // ── Phase transitions ───────────────────────────────────
    const selectPhase = useCallback((idx: number) => {
        setSelectedPhase(idx);
        Animated.spring(slideAnim, {
            toValue: idx,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
        }).start();
    }, [slideAnim]);

    // ── Photo helpers ────────────────────────────────────────
    const persistPhoto = useCallback(async (localUri: string) => {
        const uid = user?.id ?? 'onboarding-temp';
        setPhotoUploading(true);
        try {
            const savedId = await saveBodyPhoto({
                id: undefined as unknown as string,
                userId: uid,
                localUri,
                dateTaken: new Date().toISOString().split('T')[0],
                phase: selectedPhase,
                notes: null,
            });

            const newRecord: BodyPhotoRecord = {
                id: savedId,
                userId: uid,
                localUri,
                dateTaken: new Date().toISOString().split('T')[0],
                phase: selectedPhase,
                notes: null,
                createdAt: new Date().toISOString(),
            };

            // Prepend the new photo to its phase bucket
            setPhotosByPhase(prev => ({
                ...prev,
                [selectedPhase]: [newRecord, ...(prev[selectedPhase] ?? [])],
            }));

            // Kick off AI analysis in the background
            setAnalyzingPhoto(true);
            setAiAnalysis(null);
            analyzeBodyPhoto(localUri)
                .then(result => setAiAnalysis(result))
                .catch(() => null)
                .finally(() => setAnalyzingPhoto(false));
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('Failed to save body photo:', msg);
            Alert.alert('Save failed', 'Your photo was kept on this device but could not be uploaded. It will retry when you are online.');
        } finally {
            setPhotoUploading(false);
        }
    }, [user?.id, selectedPhase]);

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Grant gallery access to upload your body photo.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.8,
            allowsEditing: true,
            aspect: [3, 4],
        });
        if (!result.canceled && result.assets?.[0]) {
            await persistPhoto(result.assets[0].uri);
        }
    };

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Grant camera access to take a body photo.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
            aspect: [3, 4],
        });
        if (!result.canceled && result.assets?.[0]) {
            await persistPhoto(result.assets[0].uri);
        }
    };

    // ── Current phase data ──────────────────────────────────
    const currentPhaseData = phases[selectedPhase];
    const phase0Data = phases[0];
    const accentColor = PHASE_COLORS[selectedPhase] ?? Colors.primary;
    const gradientPair = PHASE_GRADIENTS[selectedPhase] ?? ['#374151', '#1F2937'];

    // ── Loading / empty states ──────────────────────────────
    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Generating your body simulation...</Text>
            </View>
        );
    }

    if (!phases.length || !profile) {
        return (
            <View style={[styles.container, styles.center, { padding: Spacing.xl }]}>
                <Text style={{ fontSize: 56 }}>🏋️</Text>
                <Text style={styles.emptyTitle}>Complete Your Profile</Text>
                <Text style={styles.emptyBody}>
                    We need your body measurements and goals to generate your transformation simulation.
                </Text>
                <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => router.push(`/(auth)/profile-setup?mode=edit&userId=${user?.id ?? 'onboarding-temp'}` as any)}
                >
                    <Text style={styles.emptyBtnText}>Set Up Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                    <Text style={styles.backLinkText}>← Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* ── Header ──────────────────────────────────────── */}
            <LinearGradient
                colors={gradientPair as [string, string]}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Your Transformation</Text>
                    <Text style={styles.headerSubtitle}>
                        {currentPhaseData?.label ?? 'Journey'}
                    </Text>
                </View>
                <View style={styles.headerButtons}>
                    {/* 2D/3D Toggle */}
                    <TouchableOpacity
                        onPress={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
                        style={[styles.compareToggle, viewMode === '3d' && styles.compareToggleActive]}
                    >
                        <Ionicons
                            name={viewMode === '3d' ? 'cube' : 'cube-outline'}
                            size={20}
                            color={viewMode === '3d' ? accentColor : '#FFF'}
                        />
                    </TouchableOpacity>
                    {/* Compare Toggle */}
                    <TouchableOpacity
                        onPress={() => setCompareMode(!compareMode)}
                        style={[styles.compareToggle, compareMode && styles.compareToggleActive]}
                    >
                        <Ionicons
                            name={compareMode ? 'git-compare' : 'git-compare-outline'}
                            size={20}
                            color={compareMode ? accentColor : '#FFF'}
                        />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Phase Timeline ──────────────────────────── */}
                <ScrollView
                    ref={timelineRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.timelineContent}
                    style={styles.Timeline}
                >
                    {phases.map((phase, idx) => {
                        const isActive = idx === selectedPhase;
                        const color = PHASE_COLORS[idx] ?? Colors.primary;
                        return (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => selectPhase(idx)}
                                style={[
                                    styles.timelinePill,
                                    isActive && { backgroundColor: color, borderColor: color },
                                ]}
                            >
                                <View style={[styles.timelineDot, { backgroundColor: color }]} />
                                <Text style={[
                                    styles.timelineLabel,
                                    isActive && styles.timelineLabelActive,
                                ]}>
                                    {phase.label}
                                </Text>
                                {idx < phases.length - 1 && (
                                    <View style={[styles.timelineConnector, { backgroundColor: PHASE_COLORS[idx + 1] + '40' }]} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* ── Motivational Message ────────────────────── */}
                <View style={[styles.motivationCard, { borderColor: accentColor + '40' }]}>
                    <Text style={styles.motivationText}>
                        {currentPhaseData?.motivationalMessage}
                    </Text>
                </View>

                {/* ── Body Visualization (2D/3D) ────────────────── */}
                <View style={styles.silhouetteSection}>
                    {compareMode && phase0Data ? (
                        <View style={styles.compareRow}>
                            <View style={styles.compareItem}>
                                <Text style={styles.compareLabel}>Current</Text>
                                {viewMode === '3d' ? (
                                    <BodyModel3D
                                        params={phase0Data.bodyParams}
                                        gender={gender}
                                        size={200}
                                        accentColor={PHASE_COLORS[0]}
                                        autoRotate
                                    />
                                ) : (
                                    <BodySilhouette
                                        params={phase0Data.bodyParams}
                                        gender={gender}
                                        size={200}
                                        accentColor={PHASE_COLORS[0]}
                                        showGlow={false}
                                    />
                                )}
                                <Text style={styles.compareWeight}>{phase0Data.estimatedWeightKg} kg</Text>
                            </View>
                            <View style={styles.compareDivider}>
                                <Ionicons name="arrow-forward" size={20} color={accentColor} />
                            </View>
                            <View style={styles.compareItem}>
                                <Text style={[styles.compareLabel, { color: accentColor }]}>
                                    {currentPhaseData?.label}
                                </Text>
                                {viewMode === '3d' ? (
                                    <BodyModel3D
                                        params={currentPhaseData?.bodyParams ?? phase0Data.bodyParams}
                                        gender={gender}
                                        size={200}
                                        accentColor={accentColor}
                                        autoRotate
                                    />
                                ) : (
                                    <BodySilhouette
                                        params={currentPhaseData?.bodyParams ?? phase0Data.bodyParams}
                                        gender={gender}
                                        size={200}
                                        accentColor={accentColor}
                                    />
                                )}
                                <Text style={[styles.compareWeight, { color: accentColor }]}>
                                    {currentPhaseData?.estimatedWeightKg} kg
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.singleSilhouette}>
                            {viewMode === '3d' ? (
                                <BodyModel3D
                                    params={currentPhaseData?.bodyParams ?? phase0Data?.bodyParams ?? {
                                        shoulderWidth: 0.5, chestWidth: 0.45, waistWidth: 0.35,
                                        hipWidth: 0.4, armSize: 0.35, legSize: 0.4,
                                        muscleTone: 0.3, bodyFatOverlay: 0.3,
                                    }}
                                    gender={gender}
                                    size={340}
                                    accentColor={accentColor}
                                />
                            ) : (
                                <BodySilhouette
                                    params={currentPhaseData?.bodyParams ?? phase0Data?.bodyParams ?? {
                                        shoulderWidth: 0.5, chestWidth: 0.45, waistWidth: 0.35,
                                        hipWidth: 0.4, armSize: 0.35, legSize: 0.4,
                                        muscleTone: 0.3, bodyFatOverlay: 0.3,
                                    }}
                                    gender={gender}
                                    size={320}
                                    accentColor={accentColor}
                                />
                            )}
                        </View>
                    )}
                </View>

                {/* ── Stats Row ───────────────────────────────── */}
                <View style={styles.statsRow}>
                    <StatCard
                        label="Weight"
                        value={`${currentPhaseData?.estimatedWeightKg ?? '--'}`}
                        unit="kg"
                        icon="scale-outline"
                        color={accentColor}
                    />
                    <StatCard
                        label="Body Fat"
                        value={`${currentPhaseData?.estimatedBFPercent ?? '--'}`}
                        unit="%"
                        icon="body-outline"
                        color={accentColor}
                    />
                    <StatCard
                        label="Calories"
                        value={`${currentPhaseData?.dailyCalories ?? '--'}`}
                        unit="kcal"
                        icon="flame-outline"
                        color={accentColor}
                    />
                </View>

                {/* ── Macro Split ─────────────────────────────── */}
                {currentPhaseData?.macroSplit && (
                    <View style={styles.macroCard}>
                        <Text style={styles.cardTitle}>Macro Split</Text>
                        <View style={styles.macroBarRow}>
                            {[
                                { label: 'Protein', pct: currentPhaseData.macroSplit.protein, color: Colors.protein },
                                { label: 'Carbs', pct: currentPhaseData.macroSplit.carbs, color: Colors.carbs },
                                { label: 'Fat', pct: currentPhaseData.macroSplit.fat, color: Colors.fat },
                            ].map(m => (
                                <View key={m.label} style={styles.macroItem}>
                                    <View style={styles.macroLabelRow}>
                                        <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                                        <Text style={styles.macroLabel}>{m.label}</Text>
                                        <Text style={[styles.macroPct, { color: m.color }]}>{m.pct}%</Text>
                                    </View>
                                    <View style={styles.macroTrack}>
                                        <View style={[styles.macroFill, { width: `${m.pct}%`, backgroundColor: m.color }]} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Diet Focus ──────────────────────────────── */}
                <View style={[styles.focusCard, { borderLeftColor: '#10B981' }]}>
                    <View style={styles.focusHeader}>
                        <Ionicons name="nutrition-outline" size={20} color="#10B981" />
                        <Text style={styles.focusTitle}>Diet Focus</Text>
                    </View>
                    <Text style={styles.focusBody}>{currentPhaseData?.dietFocus}</Text>
                </View>

                {/* ── Workout Focus ───────────────────────────── */}
                <View style={[styles.focusCard, { borderLeftColor: '#F59E0B' }]}>
                    <View style={styles.focusHeader}>
                        <Ionicons name="barbell-outline" size={20} color="#F59E0B" />
                        <Text style={styles.focusTitle}>Workout Focus</Text>
                    </View>
                    <Text style={styles.focusBody}>{currentPhaseData?.workoutFocus}</Text>
                </View>

                {/* ── Photo Timeline ───────────────────────────── */}
                <View style={styles.photoSection}>
                    <Text style={styles.cardTitle}>📸 Photo Timeline</Text>
                    <Text style={styles.photoHint}>
                        Add phase-tagged photos to track your transformation. Tap a photo to view it full-screen.
                    </Text>

                    {/* Thumbnails for current phase */}
                    {(photosByPhase[selectedPhase] ?? []).length > 0 && (
                        <FlatList
                            horizontal
                            data={photosByPhase[selectedPhase]}
                            keyExtractor={item => item.id}
                            showsHorizontalScrollIndicator={false}
                            style={styles.photoStrip}
                            contentContainerStyle={styles.photoStripContent}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => setFullScreenPhoto(item.localUri)}
                                    style={styles.photoThumb}
                                    activeOpacity={0.8}
                                >
                                    <Image
                                        source={{ uri: item.localUri }}
                                        style={styles.photoThumbImage}
                                        resizeMode="cover"
                                    />
                                    <Text style={styles.photoThumbDate}>
                                        {item.dateTaken.slice(5).replace('-', '/')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}

                    {/* Add photo buttons */}
                    <View style={styles.photoButtons}>
                        <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto} disabled={photoUploading}>
                            <Ionicons name="camera-outline" size={22} color={Colors.primary} />
                            <Text style={styles.photoBtnText}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto} disabled={photoUploading}>
                            <Ionicons name="images-outline" size={22} color={Colors.primary} />
                            <Text style={styles.photoBtnText}>Gallery</Text>
                        </TouchableOpacity>
                    </View>

                    {photoUploading && (
                        <View style={styles.photoStatusRow}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                            <Text style={styles.photoStatusText}>Uploading photo…</Text>
                        </View>
                    )}

                    {analyzingPhoto && (
                        <View style={styles.photoStatusRow}>
                            <ActivityIndicator size="small" color="#8B5CF6" />
                            <Text style={styles.aiAnalyzingText}>Analyzing your photo with AI…</Text>
                        </View>
                    )}

                    {aiAnalysis && !analyzingPhoto && (
                        <AIAnalysisCard analysis={aiAnalysis} />
                    )}
                </View>

                {/* ── Full-screen photo Modal ──────────────────── */}
                <Modal
                    visible={fullScreenPhoto !== null}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setFullScreenPhoto(null)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setFullScreenPhoto(null)}
                    >
                        {fullScreenPhoto && (
                            <Image
                                source={{ uri: fullScreenPhoto }}
                                style={styles.modalImage}
                                resizeMode="contain"
                            />
                        )}
                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => setFullScreenPhoto(null)}
                        >
                            <Ionicons name="close" size={28} color="#FFF" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>

                {/* ── Weight Change Summary ───────────────────── */}
                {phase0Data && currentPhaseData && selectedPhase > 0 && (
                    <View style={styles.changeSummary}>
                        <Text style={styles.changeSummaryTitle}>
                            Changes from Current → {currentPhaseData.label}
                        </Text>
                        <View style={styles.changeRow}>
                            <ChangeItem
                                label="Weight"
                                from={phase0Data.estimatedWeightKg}
                                to={currentPhaseData.estimatedWeightKg}
                                unit="kg"
                                color={accentColor}
                            />
                            <ChangeItem
                                label="Body Fat"
                                from={phase0Data.estimatedBFPercent}
                                to={currentPhaseData.estimatedBFPercent}
                                unit="%"
                                color={accentColor}
                            />
                            <ChangeItem
                                label="Calories"
                                from={phase0Data.dailyCalories}
                                to={currentPhaseData.dailyCalories}
                                unit="kcal"
                                color={accentColor}
                            />
                        </View>
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════

function StatCard({ label, value, unit, icon, color }: {
    label: string; value: string; unit: string;
    icon: string; color: string;
}) {
  const styles = useAppStyles(createStyles);
    return (
        <View style={styles.statCard}>
            <Ionicons name={icon as any} size={18} color={color} />
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statUnit}>{unit}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function ChangeItem({ label, from, to, unit, color }: {
    label: string; from: number; to: number; unit: string; color: string;
}) {
  const styles = useAppStyles(createStyles);
    const diff = to - from;
    const sign = diff >= 0 ? '+' : '';
    const diffStr = `${sign}${Math.round(diff * 10) / 10}`;

    return (
        <View style={styles.changeItem}>
            <Text style={styles.changeLabel}>{label}</Text>
            <Text style={[styles.changeDiff, { color }]}>{diffStr} {unit}</Text>
            <Text style={styles.changeFromTo}>
                {Math.round(from * 10) / 10} → {Math.round(to * 10) / 10}
            </Text>
        </View>
    );
}

function AIAnalysisCard({ analysis }: { analysis: BodyPhotoAnalysis }) {
    const styles = useAppStyles(createStyles);

    const confidenceColor =
        analysis.confidence === 'high' ? '#10B981' :
        analysis.confidence === 'medium' ? '#3B82F6' :
        '#F59E0B';

    return (
        <View style={styles.aiCard}>
            <View style={styles.aiCardHeader}>
                <Ionicons name={'flash-outline' as any} size={18} color="#8B5CF6" />
                <Text style={styles.aiCardTitle}>AI Body Analysis</Text>
                <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '25' }]}>
                    <Text style={[styles.confidenceBadgeText, { color: confidenceColor }]}>
                        {analysis.confidence} confidence
                    </Text>
                </View>
            </View>

            {/* Key metrics row */}
            <View style={styles.aiStatsRow}>
                {analysis.estimatedBFPercent != null && (
                    <View style={styles.aiStat}>
                        <Text style={styles.aiStatValue}>{analysis.estimatedBFPercent}%</Text>
                        <Text style={styles.aiStatLabel}>Est. Body Fat</Text>
                    </View>
                )}
                {analysis.bodyTypeEstimate != null && (
                    <View style={styles.aiStat}>
                        <Text style={styles.aiStatValue} numberOfLines={1}>{analysis.bodyTypeEstimate}</Text>
                        <Text style={styles.aiStatLabel}>Body Type</Text>
                    </View>
                )}
                {analysis.muscleDefinition != null && (
                    <View style={styles.aiStat}>
                        <Text style={styles.aiStatValue}>{analysis.muscleDefinition}</Text>
                        <Text style={styles.aiStatLabel}>Muscle Def.</Text>
                    </View>
                )}
            </View>

            {analysis.posture != null && (
                <Text style={styles.aiPosture}>Posture: {analysis.posture}</Text>
            )}

            {analysis.keyObservations.length > 0 && (
                <View style={styles.aiSection}>
                    <Text style={styles.aiSectionTitle}>Key Observations</Text>
                    {analysis.keyObservations.map((obs, i) => (
                        <Text key={i} style={styles.aiListItem}>• {obs}</Text>
                    ))}
                </View>
            )}

            {analysis.recommendations.length > 0 && (
                <View style={styles.aiSection}>
                    <Text style={styles.aiSectionTitle}>Recommendations</Text>
                    {analysis.recommendations.map((rec, i) => (
                        <Text key={i} style={styles.aiListItem}>• {rec}</Text>
                    ))}
                </View>
            )}
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: colors.textSecondary, marginTop: 12, fontSize: 14 },

    // ── Empty state
    emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 16, textAlign: 'center' },
    emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 20 },
    emptyBtn: { marginTop: 24, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 28, paddingVertical: 12 },
    emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    backLink: { marginTop: 16 },
    backLinkText: { color: colors.textTertiary, fontSize: 14 },

    // ── Header
    header: {
        paddingTop: Platform.OS === 'ios' ? 58 : 40,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerBack: { padding: 8, marginRight: 8 },
    headerCenter: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    headerButtons: { flexDirection: 'row', gap: 8 },
    compareToggle: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    compareToggleActive: { backgroundColor: 'rgba(255,255,255,0.9)' },

    // ── Body
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

    // ── Timeline
    Timeline: { marginBottom: Spacing.md },
    timelineContent: { paddingHorizontal: 4, gap: 8 },
    timelinePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: BorderRadius.round,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    timelineDot: { width: 8, height: 8, borderRadius: 4 },
    timelineLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    timelineLabelActive: { color: '#FFF' },
    timelineConnector: { position: 'absolute', right: -8, width: 8, height: 2 },

    // ── Motivation
    motivationCard: {
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        backgroundColor: colors.surface,
    },
    motivationText: {
        fontSize: 15, color: colors.text, fontStyle: 'italic',
        lineHeight: 22, textAlign: 'center',
    },

    // ── Silhouette
    silhouetteSection: { alignItems: 'center', marginBottom: Spacing.lg },
    singleSilhouette: { alignItems: 'center' },
    compareRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    compareItem: { alignItems: 'center', flex: 1 },
    compareLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
    compareWeight: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 8 },
    compareDivider: { padding: 8 },

    // ── Stats
    statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: Spacing.md,
        alignItems: 'center',
        gap: 4,
    },
    statValue: { fontSize: 20, fontWeight: '800' },
    statUnit: { fontSize: 11, color: colors.textTertiary },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

    // ── Macro card
    macroCard: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: Spacing.sm },
    macroBarRow: { gap: Spacing.sm },
    macroItem: { gap: 4 },
    macroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    macroDot: { width: 8, height: 8, borderRadius: 4 },
    macroLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    macroPct: { fontSize: 13, fontWeight: '700' },
    macroTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
    macroFill: { height: '100%', borderRadius: 3 },

    // ── Focus cards
    focusCard: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 4,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    focusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    focusTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    focusBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

    // ── Photo section
    photoSection: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    photoHint: { fontSize: 13, color: colors.textTertiary, marginBottom: Spacing.sm, lineHeight: 18 },
    photoStrip: { marginBottom: Spacing.sm },
    photoStripContent: { gap: Spacing.sm, paddingVertical: 4 },
    photoThumb: { alignItems: 'center', gap: 4 },
    photoThumbImage: { width: 80, height: 104, borderRadius: BorderRadius.sm, backgroundColor: colors.border },
    photoThumbDate: { fontSize: 11, color: colors.textTertiary },
    photoButtons: { flexDirection: 'row', gap: Spacing.sm },
    photoBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.primary + '50',
        borderStyle: 'dashed',
    },
    photoBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
    photoStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: Spacing.sm },
    photoStatusText: { fontSize: 13, color: colors.textSecondary },
    aiAnalyzingText: { fontSize: 13, color: '#8B5CF6', fontStyle: 'italic' },

    // ── Full-screen modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * (4 / 3),
    },
    modalClose: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 58 : 36,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: BorderRadius.round,
        padding: 8,
    },

    // ── AI Analysis card
    aiCard: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: '#8B5CF680',
        backgroundColor: colors.surface,
        padding: Spacing.md,
    },
    aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
    aiCardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
    confidenceBadge: { borderRadius: BorderRadius.round, paddingHorizontal: 8, paddingVertical: 3 },
    confidenceBadgeText: { fontSize: 11, fontWeight: '700' },
    aiStatsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    aiStat: {
        flex: 1, alignItems: 'center', gap: 2,
        backgroundColor: colors.border + '50',
        borderRadius: BorderRadius.sm,
        padding: Spacing.sm,
    },
    aiStatValue: { fontSize: 14, fontWeight: '700', color: colors.text },
    aiStatLabel: { fontSize: 10, color: colors.textTertiary },
    aiPosture: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginBottom: Spacing.sm },
    aiSection: { marginTop: Spacing.sm },
    aiSectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
    aiListItem: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 2 },

    // ── Change summary
    changeSummary: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    changeSummaryTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: Spacing.sm },
    changeRow: { flexDirection: 'row', gap: Spacing.sm },
    changeItem: { flex: 1, alignItems: 'center', gap: 4 },
    changeLabel: { fontSize: 11, color: colors.textTertiary },
    changeDiff: { fontSize: 16, fontWeight: '800' },
    changeFromTo: { fontSize: 11, color: colors.textTertiary },
});

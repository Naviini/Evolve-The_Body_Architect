/**
 * Scan Screen — Camera-based Food Recognition
 *
 * Uses expo-camera for image capture and sends to the
 * fine-tuned vision model for food identification.
 * Shows results with confidence and lets user confirm/edit.
 */

import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Modal,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';
import { recognizeFood, prepareImageForScan } from '@/src/services/scan.service';
import { addMealEntry } from '@/src/lib/database';
import { useAuth } from '@/src/contexts/AuthContext';
import { FoodRecognitionResponse, MealType } from '@/src/types';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function ScanScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
    const { user } = useAuth();
    const router = useRouter();
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<FoodRecognitionResponse | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');

    const handleCapture = async () => {
        if (!cameraRef.current) return;

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                base64: true,
            });

            if (photo?.uri) {
                setCapturedImage(photo.uri);
                await processImage(photo.base64 || '');
            }
        } catch (e) {
            console.error('Camera capture failed:', e);
            Alert.alert('Error', 'Failed to capture photo. Please try again.');
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets[0]) {
            setCapturedImage(result.assets[0].uri);
            const base64 = result.assets[0].base64 || await prepareImageForScan(result.assets[0].uri);
            await processImage(base64);
        }
    };

    const processImage = async (base64: string) => {
        setIsScanning(true);
        try {
            const result = await recognizeFood(base64);
            setScanResult(result);
            setShowResult(true);
        } catch (e) {
            console.error('Scan failed:', e);
            Alert.alert('Scan Failed', 'Could not recognize food. Please try again or add manually.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleConfirm = async () => {
        if (!scanResult) return;

        try {
            const userId = user?.id || 'demo-user';
            await addMealEntry({
                user_id: userId,
                food_name: scanResult.food_name,
                meal_type: selectedMealType,
                servings: 1,
                calories: scanResult.calories_per_serving,
                protein_g: scanResult.protein_g,
                carbs_g: scanResult.carbs_g,
                fat_g: scanResult.fat_g,
                image_url: capturedImage,
                logged_at: new Date().toISOString().split('T')[0],
            });

            Alert.alert('Added!', `${scanResult.food_name} added to your ${selectedMealType}.`, [
                { text: 'OK', onPress: () => resetScan() },
            ]);
        } catch (e) {
            Alert.alert('Error', 'Failed to save meal entry.');
        }
    };

    const resetScan = () => {
        setCapturedImage(null);
        setScanResult(null);
        setShowResult(false);
    };

    // Permission check
    if (Platform.OS !== 'web') {
        if (!permission) {
            return <View style={styles.container} />;
        }

        if (!permission.granted) {
            return (
                <View style={styles.permissionContainer}>
                    <Ionicons name="camera-outline" size={64} color={colors.textTertiary} />
                    <Text style={styles.permissionTitle}>Camera Access Needed</Text>
                    <Text style={styles.permissionText}>
                        We need camera access to scan your food and estimate calories automatically.
                    </Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <LinearGradient
                            colors={[Colors.primary, Colors.primaryDark]}
                            style={styles.permissionButtonGradient}
                        >
                            <Text style={styles.permissionButtonText}>Grant Permission</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            );
        }
    }

    return (
        <View style={styles.container}>
            {/* Camera or captured image */}
            {capturedImage ? (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: capturedImage }} style={styles.previewImage} />
                    {isScanning && (
                        <View style={styles.scanningOverlay}>
                            <LinearGradient
                                colors={['rgba(108, 99, 255, 0.3)', 'rgba(0, 210, 255, 0.3)']}
                                style={styles.scanningGradient}
                            >
                                <ActivityIndicator size="large" color={Colors.primary} />
                                <Text style={styles.scanningText}>Analyzing food...</Text>
                                <Text style={styles.scanningSubtext}>
                                    Using AI to identify your meal
                                </Text>
                            </LinearGradient>
                        </View>
                    )}
                    {!isScanning && !showResult && (
                        <TouchableOpacity style={styles.retakeButton} onPress={resetScan}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </View>
            ) : Platform.OS === 'web' ? (
                <View style={styles.webFallbackContainer}>
                    <Ionicons name="images-outline" size={80} color={colors.textTertiary} />
                    <Text style={styles.webFallbackTitle}>Upload Food Image</Text>
                    <Text style={styles.webFallbackText}>
                        Upload a photo of your meal to identify it and estimate calories automatically.
                    </Text>
                    <TouchableOpacity style={styles.webUploadButton} onPress={handlePickImage}>
                        <LinearGradient
                            colors={[Colors.primary, Colors.accent]}
                            style={styles.webUploadGradient}
                        >
                            <Ionicons name="cloud-upload-outline" size={24} color="#FFF" />
                            <Text style={styles.webUploadText}>Select Image</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.webManualButton}
                        onPress={() => router.push('/add-meal')}
                    >
                        <Text style={styles.webManualText}>Enter Manually</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.cameraContainer}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing="back"
                    />
                    {/* Camera overlay — renders on top via absolute positioning */}
                    <View style={styles.cameraOverlay}>
                        <View style={styles.cameraHeader}>
                            <Text style={styles.cameraTitle}>Scan Your Food</Text>
                            <Text style={styles.cameraSubtitle}>
                                Point your camera at the food item
                            </Text>
                        </View>

                        {/* Viewfinder frame */}
                        <View style={styles.viewfinder}>
                            <View style={[styles.viewfinderCorner, styles.topLeft]} />
                            <View style={[styles.viewfinderCorner, styles.topRight]} />
                            <View style={[styles.viewfinderCorner, styles.bottomLeft]} />
                            <View style={[styles.viewfinderCorner, styles.bottomRight]} />
                        </View>

                        {/* Bottom controls */}
                        <View style={styles.cameraControls}>
                            <TouchableOpacity style={styles.galleryButton} onPress={handlePickImage}>
                                <Ionicons name="images-outline" size={28} color="#FFF" />
                                <Text style={styles.controlLabel}>Gallery</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
                                <View style={styles.captureOuter}>
                                    <LinearGradient
                                        colors={[Colors.primary, Colors.accent]}
                                        style={styles.captureInner}
                                    />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.manualButton}
                                onPress={() => router.push('/add-meal')}
                            >
                                <Ionicons name="create-outline" size={28} color="#FFF" />
                                <Text style={styles.controlLabel}>Manual</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Scan Result Modal */}
            <Modal
                visible={showResult && scanResult !== null}
                animationType="slide"
                transparent
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.resultCard}>
                        <LinearGradient
                            colors={[colors.surfaceLight, colors.card]}
                            style={styles.resultCardGradient}
                        >
                            {/* Header */}
                            <View style={styles.resultHeader}>
                                <Text style={styles.resultTitle}>Food Detected!</Text>
                                <TouchableOpacity onPress={resetScan}>
                                    <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
                                </TouchableOpacity>
                            </View>

                            {/* Confidence Badge */}
                            <View style={styles.confidenceBadge}>
                                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                                <Text style={styles.confidenceText}>
                                    {Math.round((scanResult?.confidence || 0) * 100)}% confidence
                                </Text>
                            </View>

                            {/* Food Info */}
                            <Text style={styles.foodName}>{scanResult?.food_name}</Text>
                            <Text style={styles.servingInfo}>
                                {scanResult?.serving_size} {scanResult?.serving_unit}
                            </Text>

                            {/* Nutrition Grid */}
                            <View style={styles.nutritionGrid}>
                                <View style={styles.nutritionItem}>
                                    <Text style={[styles.nutritionValue, { color: Colors.warning }]}>
                                        {scanResult?.calories_per_serving}
                                    </Text>
                                    <Text style={styles.nutritionLabel}>Calories</Text>
                                </View>
                                <View style={styles.nutritionItem}>
                                    <Text style={[styles.nutritionValue, { color: Colors.protein }]}>
                                        {scanResult?.protein_g}g
                                    </Text>
                                    <Text style={styles.nutritionLabel}>Protein</Text>
                                </View>
                                <View style={styles.nutritionItem}>
                                    <Text style={[styles.nutritionValue, { color: Colors.carbs }]}>
                                        {scanResult?.carbs_g}g
                                    </Text>
                                    <Text style={styles.nutritionLabel}>Carbs</Text>
                                </View>
                                <View style={styles.nutritionItem}>
                                    <Text style={[styles.nutritionValue, { color: Colors.fat }]}>
                                        {scanResult?.fat_g}g
                                    </Text>
                                    <Text style={styles.nutritionLabel}>Fat</Text>
                                </View>
                            </View>

                            {/* Meal Type Selector */}
                            <Text style={styles.mealTypeLabel}>Add to:</Text>
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
                                                styles.mealTypeButtonText,
                                                selectedMealType === type && styles.mealTypeButtonTextActive,
                                            ]}
                                        >
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Alternatives */}
                            {scanResult?.alternatives && scanResult.alternatives.length > 0 && (
                                <View style={styles.alternativesSection}>
                                    <Text style={styles.alternativesTitle}>Not right? Try:</Text>
                                    {scanResult.alternatives.map((alt, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={styles.alternativeItem}
                                            onPress={() => {
                                                setScanResult({
                                                    ...scanResult,
                                                    food_name: alt.food_name,
                                                    confidence: alt.confidence,
                                                    calories_per_serving: alt.calories_per_serving,
                                                });
                                            }}
                                        >
                                            <Text style={styles.alternativeName}>{alt.food_name}</Text>
                                            <Text style={styles.alternativeCals}>{alt.calories_per_serving} kcal</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Actions */}
                            <View style={styles.resultActions}>
                                <TouchableOpacity style={styles.editButton} onPress={() => {
                                    setShowResult(false);
                                    router.push('/add-meal');
                                }}>
                                    <Ionicons name="create-outline" size={20} color={Colors.primary} />
                                    <Text style={styles.editButtonText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                                    <LinearGradient
                                        colors={[Colors.primary, Colors.primaryDark]}
                                        style={styles.confirmButtonGradient}
                                    >
                                        <Ionicons name="checkmark" size={22} color="#FFF" />
                                        <Text style={styles.confirmButtonText}>Add to Diary</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Permission
    permissionContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    permissionTitle: {
        fontSize: Typography.sizes.title,
        color: colors.text,
        fontWeight: Typography.weights.bold,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    permissionText: {
        fontSize: Typography.sizes.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        lineHeight: 20,
    },
    permissionButton: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    permissionButtonGradient: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.md,
    },
    permissionButtonText: {
        fontSize: Typography.sizes.bodyLarge,
        color: '#FFF',
        fontWeight: Typography.weights.bold,
    },

    // Web Fallback
    webFallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    webFallbackTitle: {
        fontSize: Typography.sizes.title,
        color: colors.text,
        fontWeight: Typography.weights.bold,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    webFallbackText: {
        fontSize: Typography.sizes.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        lineHeight: 22,
    },
    webUploadButton: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        width: '100%',
        maxWidth: 300,
        marginBottom: Spacing.md,
    },
    webUploadGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    webUploadText: {
        fontSize: Typography.sizes.bodyLarge,
        color: '#FFF',
        fontWeight: Typography.weights.bold,
    },
    webManualButton: {
        paddingVertical: Spacing.md,
    },
    webManualText: {
        fontSize: Typography.sizes.body,
        color: Colors.primary,
        fontWeight: Typography.weights.semibold,
    },

    // Camera
    cameraContainer: {
        flex: 1,
        position: 'relative',
    },
    camera: {
        ...StyleSheet.absoluteFillObject,
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    cameraHeader: {
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
    },
    cameraTitle: {
        fontSize: Typography.sizes.title,
        color: '#FFF',
        fontWeight: Typography.weights.bold,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    cameraSubtitle: {
        fontSize: Typography.sizes.body,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },

    // Viewfinder
    viewfinder: {
        width: 280,
        height: 280,
        alignSelf: 'center',
    },
    viewfinderCorner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: Colors.primary,
        borderWidth: 3,
    },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },

    // Camera Controls
    cameraControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: Platform.OS === 'ios' ? 50 : 30,
        paddingHorizontal: Spacing.xl,
    },
    galleryButton: {
        alignItems: 'center',
        gap: 4,
    },
    manualButton: {
        alignItems: 'center',
        gap: 4,
    },
    controlLabel: {
        fontSize: 11,
        color: '#FFF',
        fontWeight: Typography.weights.medium,
    },
    captureButton: {
        padding: 4,
    },
    captureOuter: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 4,
        borderColor: '#FFF',
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },

    // Preview
    previewContainer: {
        flex: 1,
    },
    previewImage: {
        flex: 1,
        resizeMode: 'cover',
    },
    retakeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanningOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanningGradient: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanningText: {
        fontSize: Typography.sizes.title,
        color: '#FFF',
        fontWeight: Typography.weights.bold,
        marginTop: Spacing.md,
    },
    scanningSubtext: {
        fontSize: Typography.sizes.body,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },

    // Result Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    resultCard: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        overflow: 'hidden',
        maxHeight: '80%',
    },
    resultCardGradient: {
        padding: Spacing.lg,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    resultTitle: {
        fontSize: Typography.sizes.title,
        color: colors.text,
        fontWeight: Typography.weights.bold,
    },
    confidenceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.round,
        alignSelf: 'flex-start',
        marginBottom: Spacing.md,
    },
    confidenceText: {
        fontSize: Typography.sizes.caption,
        color: Colors.success,
        fontWeight: Typography.weights.semibold,
    },
    foodName: {
        fontSize: Typography.sizes.heading,
        color: colors.text,
        fontWeight: Typography.weights.bold,
    },
    servingInfo: {
        fontSize: Typography.sizes.body,
        color: colors.textSecondary,
        marginTop: 4,
        marginBottom: Spacing.md,
    },

    // Nutrition Grid
    nutritionGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    nutritionItem: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        alignItems: 'center',
    },
    nutritionValue: {
        fontSize: Typography.sizes.subtitle,
        fontWeight: Typography.weights.bold,
    },
    nutritionLabel: {
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },

    // Meal Type
    mealTypeLabel: {
        fontSize: Typography.sizes.body,
        color: colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    mealTypeRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
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
    mealTypeButtonText: {
        fontSize: Typography.sizes.caption,
        color: colors.textSecondary,
        fontWeight: Typography.weights.medium,
    },
    mealTypeButtonTextActive: {
        color: Colors.primary,
        fontWeight: Typography.weights.bold,
    },

    // Alternatives
    alternativesSection: {
        marginBottom: Spacing.md,
    },
    alternativesTitle: {
        fontSize: Typography.sizes.body,
        color: colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    alternativeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    alternativeName: {
        fontSize: Typography.sizes.body,
        color: colors.text,
    },
    alternativeCals: {
        fontSize: Typography.sizes.body,
        color: Colors.primary,
        fontWeight: Typography.weights.semibold,
    },

    // Actions
    resultActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
        paddingBottom: Platform.OS === 'ios' ? Spacing.lg : 0,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    editButtonText: {
        fontSize: Typography.sizes.bodyLarge,
        color: Colors.primary,
        fontWeight: Typography.weights.semibold,
    },
    confirmButton: {
        flex: 1,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    confirmButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    confirmButtonText: {
        fontSize: Typography.sizes.bodyLarge,
        color: '#FFF',
        fontWeight: Typography.weights.bold,
    },
});

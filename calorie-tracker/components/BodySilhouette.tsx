/**
 * BodySilhouette — SVG body silhouette component
 *
 * Renders a stylized human body outline using react-native-svg.
 * The silhouette dynamically adjusts proportions based on BodySimulationParams.
 *
 * Features:
 *   - Gender-aware silhouette (male / female base shape)
 *   - Animated morphing between states via reanimated
 *   - Gradient fills based on muscle tone / body fat
 *   - Glow effects on active areas
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated as RNAnimated, Platform } from 'react-native';
import Svg, {
    Path,
    Defs,
    LinearGradient as SvgGradient,
    Stop,
    RadialGradient,
    Rect,
} from 'react-native-svg';
import { BodySimulationParams } from '@/src/types';
import { Colors } from '@/constants/theme';

// ─── Props ──────────────────────────────────────────────────

interface BodySilhouetteProps {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    size?: number;                // overall height in px
    accentColor?: string;         // primary tint color
    showGlow?: boolean;
    animated?: boolean;
}

// ─── SVG Path Generator ─────────────────────────────────────

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}

/**
 * Generate a smooth body silhouette path.
 * All dimensions are relative to a 200×400 viewBox.
 * The params (0–1) scale the proportions around a base skeleton.
 */
function generateBodyPath(
    p: BodySimulationParams,
    gender: 'male' | 'female',
): string {
    const isFemale = gender === 'female';

    // ── Key widths (half-widths from center, viewBox center = 100)
    const headW = 22;
    const neckW = 10 + p.armSize * 3;
    const shoulderHW = 28 + p.shoulderWidth * 32;
    const chestHW = 24 + p.chestWidth * 28;
    const waistHW = 16 + p.waistWidth * 24;
    const hipHW = isFemale
        ? 20 + p.hipWidth * 30
        : 18 + p.hipWidth * 22;
    const armW = 6 + p.armSize * 10;
    const legHW = 10 + p.legSize * 12;
    const calfHW = 7 + p.legSize * 7;

    // ── Key Y positions
    const headTop = 15;
    const headBottom = 58;
    const neckY = 68;
    const shoulderY = 82;
    const chestY = isFemale ? 115 : 110;
    const waistY = isFemale ? 155 : 150;
    const hipY = isFemale ? 185 : 175;
    const crotchY = isFemale ? 210 : 205;
    const kneeY = 295;
    const ankleY = 370;
    const footY = 390;

    const cx = 100; // center x

    // Build path (right side, then mirror left using symmetry)
    // We draw the full outline clockwise starting from head top-center

    const path = [
        // ── Head (ellipse approximation)
        `M ${cx} ${headTop}`,
        `C ${cx + headW} ${headTop}, ${cx + headW} ${headBottom}, ${cx + neckW} ${neckY}`,

        // ── Neck to right shoulder
        `C ${cx + neckW + 2} ${shoulderY - 8}, ${cx + shoulderHW - 8} ${shoulderY - 5}, ${cx + shoulderHW} ${shoulderY}`,

        // ── Right arm (simplified, tucked)
        `L ${cx + shoulderHW + armW} ${shoulderY + 5}`,
        `C ${cx + shoulderHW + armW + 2} ${shoulderY + 40}, ${cx + shoulderHW + armW - 1} ${shoulderY + 80}, ${cx + shoulderHW + armW - 3} ${shoulderY + 90}`,
        // Arm wrist
        `L ${cx + shoulderHW + armW - 6} ${shoulderY + 95}`,
        // Arm inner back up to body
        `C ${cx + shoulderHW + armW - 10} ${shoulderY + 80}, ${cx + shoulderHW - 2} ${shoulderY + 50}, ${cx + chestHW} ${chestY}`,

        // ── Right torso (chest → waist → hip)
        `C ${cx + chestHW} ${chestY + 10}, ${cx + waistHW + 3} ${waistY - 15}, ${cx + waistHW} ${waistY}`,
        `C ${cx + waistHW - 1} ${waistY + 10}, ${cx + hipHW - 3} ${hipY - 10}, ${cx + hipHW} ${hipY}`,

        // ── Right leg
        `C ${cx + hipHW} ${hipY + 8}, ${cx + legHW + 5} ${crotchY}, ${cx + legHW + 3} ${crotchY + 15}`,
        // Thigh to knee
        `C ${cx + legHW + 2} ${kneeY - 30}, ${cx + legHW} ${kneeY - 10}, ${cx + legHW - 1} ${kneeY}`,
        // Calf
        `C ${cx + calfHW + 3} ${kneeY + 20}, ${cx + calfHW + 2} ${ankleY - 30}, ${cx + calfHW - 2} ${ankleY}`,
        // Ankle to foot
        `L ${cx + calfHW + 4} ${footY}`,
        `L ${cx + 2} ${footY}`,
        // Inner ankle up
        `L ${cx + 3} ${ankleY}`,

        // ── Inner right leg up to crotch
        `C ${cx + 4} ${ankleY - 20}, ${cx + 4} ${kneeY + 15}, ${cx + 5} ${kneeY}`,
        `C ${cx + 5} ${kneeY - 10}, ${cx + 5} ${crotchY + 20}, ${cx + 3} ${crotchY}`,

        // ── Cross to left leg (crotch center)
        `L ${cx - 3} ${crotchY}`,

        // ── Left inner leg down
        `C ${cx - 5} ${crotchY + 20}, ${cx - 5} ${kneeY - 10}, ${cx - 5} ${kneeY}`,
        `C ${cx - 4} ${kneeY + 15}, ${cx - 4} ${ankleY - 20}, ${cx - 3} ${ankleY}`,
        `L ${cx - 2} ${footY}`,
        `L ${cx - calfHW - 4} ${footY}`,
        `L ${cx - calfHW + 2} ${ankleY}`,

        // ── Left leg up
        `C ${cx - calfHW - 2} ${ankleY - 30}, ${cx - calfHW - 3} ${kneeY + 20}, ${cx - legHW + 1} ${kneeY}`,
        `C ${cx - legHW} ${kneeY - 10}, ${cx - legHW - 2} ${kneeY - 30}, ${cx - legHW - 3} ${crotchY + 15}`,
        `C ${cx - legHW - 5} ${crotchY}, ${cx - hipHW} ${hipY + 8}, ${cx - hipHW} ${hipY}`,

        // ── Left torso (hip → waist → chest)
        `C ${cx - hipHW + 3} ${hipY - 10}, ${cx - waistHW + 1} ${waistY + 10}, ${cx - waistHW} ${waistY}`,
        `C ${cx - waistHW - 3} ${waistY - 15}, ${cx - chestHW} ${chestY + 10}, ${cx - chestHW} ${chestY}`,

        // ── Left arm
        `C ${cx - shoulderHW + 2} ${shoulderY + 50}, ${cx - shoulderHW - armW + 10} ${shoulderY + 80}, ${cx - shoulderHW - armW + 6} ${shoulderY + 95}`,
        `L ${cx - shoulderHW - armW + 3} ${shoulderY + 90}`,
        `C ${cx - shoulderHW - armW + 1} ${shoulderY + 80}, ${cx - shoulderHW - armW - 2} ${shoulderY + 40}, ${cx - shoulderHW - armW} ${shoulderY + 5}`,
        `L ${cx - shoulderHW} ${shoulderY}`,

        // ── Left shoulder to neck
        `C ${cx - shoulderHW + 8} ${shoulderY - 5}, ${cx - neckW - 2} ${shoulderY - 8}, ${cx - neckW} ${neckY}`,

        // ── Left neck to head
        `C ${cx - headW} ${headBottom}, ${cx - headW} ${headTop}, ${cx} ${headTop}`,

        'Z',
    ];

    return path.join(' ');
}

// ─── Component ──────────────────────────────────────────────

export default function BodySilhouette({
    params,
    gender,
    size = 340,
    accentColor = Colors.primary,
    showGlow = true,
    animated = true,
}: BodySilhouetteProps) {
    const fadeAnim = useRef(new RNAnimated.Value(0)).current;

    useEffect(() => {
        if (animated) {
            fadeAnim.setValue(0);
            RNAnimated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(1);
        }
    }, [params]);

    const path = generateBodyPath(params, gender);

    // Derive fill opacity from muscle tone
    const toneOpacity = 0.3 + params.muscleTone * 0.5;
    // Determine body fat color overlay intensity
    const bfOverlayOpacity = params.bodyFatOverlay * 0.25;

    const aspectRatio = 200 / 400;
    const width = size * aspectRatio;
    const height = size;

    return (
        <RNAnimated.View style={[styles.container, { opacity: fadeAnim, width, height }]}>
            <Svg
                width={width}
                height={height}
                viewBox="0 0 200 400"
            >
                <Defs>
                    {/* Body gradient */}
                    <SvgGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={accentColor} stopOpacity={String(toneOpacity + 0.15)} />
                        <Stop offset="0.4" stopColor={accentColor} stopOpacity={String(toneOpacity)} />
                        <Stop offset="0.7" stopColor={accentColor} stopOpacity={String(toneOpacity - 0.08)} />
                        <Stop offset="1" stopColor={accentColor} stopOpacity={String(toneOpacity - 0.15)} />
                    </SvgGradient>

                    {/* Muscle highlight gradient */}
                    <SvgGradient id="muscleHighlight" x1="0.5" y1="0" x2="0.5" y2="1">
                        <Stop offset="0" stopColor="#FFFFFF" stopOpacity={String(params.muscleTone * 0.2)} />
                        <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
                        <Stop offset="1" stopColor="#FFFFFF" stopOpacity={String(params.muscleTone * 0.1)} />
                    </SvgGradient>

                    {/* Glow effect */}
                    {showGlow && (
                        <RadialGradient id="glow" cx="50%" cy="40%" rx="60%" ry="60%">
                            <Stop offset="0" stopColor={accentColor} stopOpacity="0.15" />
                            <Stop offset="1" stopColor={accentColor} stopOpacity="0" />
                        </RadialGradient>
                    )}

                    {/* Body fat overlay */}
                    <SvgGradient id="fatOverlay" x1="0.5" y1="0" x2="0.5" y2="1">
                        <Stop offset="0" stopColor="#FFD93D" stopOpacity="0" />
                        <Stop offset="0.35" stopColor="#FFD93D" stopOpacity={String(bfOverlayOpacity * 0.5)} />
                        <Stop offset="0.55" stopColor="#FF9F43" stopOpacity={String(bfOverlayOpacity)} />
                        <Stop offset="0.8" stopColor="#FFD93D" stopOpacity={String(bfOverlayOpacity * 0.7)} />
                        <Stop offset="1" stopColor="#FFD93D" stopOpacity="0" />
                    </SvgGradient>
                </Defs>

                {/* Background glow */}
                {showGlow && (
                    <Rect x="0" y="0" width="200" height="400" fill="url(#glow)" />
                )}

                {/* Main body shape */}
                <Path
                    d={path}
                    fill="url(#bodyGrad)"
                    stroke={accentColor}
                    strokeWidth="1.5"
                    strokeOpacity={0.6}
                />

                {/* Muscle highlight overlay */}
                <Path
                    d={path}
                    fill="url(#muscleHighlight)"
                    strokeWidth="0"
                />

                {/* Body fat overlay */}
                {params.bodyFatOverlay > 0.15 && (
                    <Path
                        d={path}
                        fill="url(#fatOverlay)"
                        strokeWidth="0"
                    />
                )}

                {/* Outline glow */}
                <Path
                    d={path}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="2"
                    strokeOpacity={0.3}
                />
            </Svg>
        </RNAnimated.View>
    );
}

// ─── Mini version for preview cards ─────────────────────────

export function BodySilhouetteMini({
    params,
    gender,
    size = 100,
    accentColor = Colors.primary,
}: {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    size?: number;
    accentColor?: string;
}) {
    return (
        <BodySilhouette
            params={params}
            gender={gender}
            size={size}
            accentColor={accentColor}
            showGlow={false}
            animated={false}
        />
    );
}

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});

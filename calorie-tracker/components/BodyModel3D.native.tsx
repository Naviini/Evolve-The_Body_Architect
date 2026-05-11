/**
 * BodyModel3D — Native wrapper (safe for Expo Go + dev builds)
 *
 * Strategy: check expo-gl availability at runtime with a try-catch require().
 *
 * • Expo Go        → expo-gl throws → shows SVG silhouette fallback
 * • Dev build/EAS  → expo-gl loads  → dynamically loads BodyModel3DCanvas.native
 *                                      which has the full Three.js implementation
 *
 * WHY require() instead of import:
 *   Top-level `import` statements are executed immediately when the module is
 *   loaded. `require()` inside try-catch defers execution so a missing native
 *   module crashes only that require(), not the whole screen.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BodySilhouette from '@/components/BodySilhouette';
import { BodySimulationParams } from '@/src/types';
import { Colors } from '@/constants/theme';

// ── Runtime expo-gl detection ──────────────────────────────────────────
// Attempt to load expo-gl. If it throws (Expo Go), we skip the 3D canvas.
// The result is cached at module load so the check only happens once.
let ThreeCanvas: React.ComponentType<BodyModel3DProps> | null = null;

try {
    require('expo-gl'); // throws in Expo Go — native module not available
    // expo-gl is present → safe to load the Three.js canvas component
    ThreeCanvas = require('./BodyModel3DCanvas.native').default;
} catch (_) {
    // Running in Expo Go — fall back to SVG silhouette below
}

// ── Types ─────────────────────────────────────────────────────────────

interface BodyModel3DProps {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    size?: number;
    accentColor?: string;
    autoRotate?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────

export default function BodyModel3D({
    params,
    gender,
    size = 340,
    accentColor = Colors.primary,
    autoRotate = false,
}: BodyModel3DProps) {
    if (ThreeCanvas) {
        // Dev build with expo-gl: render the full 3D model
        const Canvas = ThreeCanvas;
        return <Canvas params={params} gender={gender} size={size} accentColor={accentColor} autoRotate={autoRotate} />;
    }

    // Expo Go fallback: animated SVG silhouette
    const width = Math.round(size * 0.75);
    return (
        <View style={[styles.container, { width }]}>
            <BodySilhouette
                params={params}
                gender={gender}
                size={size}
                accentColor={accentColor}
                showGlow
                animated
            />
            <View style={styles.badge}>
                <Text style={styles.badgeText}>3D available in dev build</Text>
            </View>
        </View>
    );
}

export function BodyModel3DMini({
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
    return <BodyModel3D params={params} gender={gender} size={size} accentColor={accentColor} autoRotate />;
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { alignItems: 'center' },
    badge: {
        marginTop: 6,
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    badgeText: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
});

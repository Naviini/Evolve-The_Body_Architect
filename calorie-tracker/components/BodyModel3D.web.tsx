/**
 * BodyModel3D — Web platform version
 *
 * Three.js / @react-three/fiber requires a native WebGL canvas context that
 * isn't reliably available in Expo's Metro web bundle. Importing those packages
 * at the top level crashes the route during expo-router's startup `getRoutes()`
 * scan, which blanks the entire app.
 *
 * Solution: on web we render the animated SVG silhouette (same quality as the
 * Expo Go fallback). The full 3D model is available on native dev builds / EAS.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import BodySilhouette from '@/components/BodySilhouette';
import { BodySimulationParams } from '@/src/types';
import { Colors } from '@/constants/theme';

interface BodyModel3DProps {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    size?: number;
    accentColor?: string;
    autoRotate?: boolean;
}

export default function BodyModel3D({
    params,
    gender,
    size = 340,
    accentColor = Colors.primary,
    autoRotate = false,
}: BodyModel3DProps) {
    return (
        <View style={styles.container}>
            <BodySilhouette
                params={params}
                gender={gender}
                size={size}
                accentColor={accentColor}
                showGlow
                animated={autoRotate}
            />
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
    return (
        <BodyModel3D
            params={params}
            gender={gender}
            size={size}
            accentColor={accentColor}
            autoRotate
        />
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center' },
});

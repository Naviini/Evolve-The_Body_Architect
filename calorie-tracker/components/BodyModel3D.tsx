/**
 * BodyModel3D — Native fallback
 *
 * Expo Go does not support expo-gl (a native module).
 * This file is used on iOS/Android with Expo Go.
 *
 * For the full 3D experience use a development build —
 * Metro will then prefer BodyModel3D.native.tsx if present.
 *
 * Web uses BodyModel3D.web.tsx (Three.js / React Three Fiber).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
}: BodyModel3DProps) {
    const aspectRatio = 3 / 4;
    const width = size * aspectRatio;

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
                <Text style={styles.badgeText}>3D available on dev build</Text>
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
    return (
        <BodyModel3D
            params={params}
            gender={gender}
            size={size}
            accentColor={accentColor}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    badge: {
        marginTop: 6,
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    badgeText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
    },
});

/**
 * BodyModel3D — Web platform
 *
 * Full WebGL body uses Three.js, loaded with dynamic import() so it is not
 * evaluated during expo-router’s static route discovery (which was crashing
 * when @react-three/fiber was imported at the top level).
 */

import React, { useEffect, useState, ComponentType } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import BodySilhouette from '@/components/BodySilhouette';
import { BodySimulationParams } from '@/src/types';
import { Colors } from '@/constants/theme';

interface BodyModel3DProps {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    size?: number;
    accentColor?: string;
    autoRotate?: boolean;
    showGlFallbackBadge?: boolean;
    showInteractionHint?: boolean;
}

type CanvasProps = BodyModel3DProps;

export default function BodyModel3D({
    params,
    gender,
    size = 340,
    accentColor = Colors.primary,
    autoRotate = false,
    showGlFallbackBadge = false,
    showInteractionHint = true,
}: BodyModel3DProps) {
    const [WebCanvas, setWebCanvas] = useState<ComponentType<CanvasProps> | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const width = Math.round(size * 0.75);

    useEffect(() => {
        let cancelled = false;
        import('./BodyModel3DCanvas.web')
            .then((mod) => {
                if (!cancelled) setWebCanvas(() => mod.default);
            })
            .catch(() => {
                if (!cancelled) setLoadFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (loadFailed) {
        return (
            <View style={[styles.container, { width }]}>
                <BodySilhouette
                    params={params}
                    gender={gender}
                    size={size}
                    accentColor={accentColor}
                    showGlow
                    animated={autoRotate}
                />
                {showGlFallbackBadge ? (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>3D viewer failed to load — showing silhouette</Text>
                    </View>
                ) : null}
            </View>
        );
    }

    if (!WebCanvas) {
        return (
            <View style={[styles.loaderWrap, { width, height: size }]}>
                <ActivityIndicator size="small" color={accentColor} />
            </View>
        );
    }

    return (
        <WebCanvas
            params={params}
            gender={gender}
            size={size}
            accentColor={accentColor}
            autoRotate={autoRotate}
            showInteractionHint={showInteractionHint}
        />
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
            showInteractionHint={false}
        />
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center' },
    loaderWrap: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        overflow: 'hidden',
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

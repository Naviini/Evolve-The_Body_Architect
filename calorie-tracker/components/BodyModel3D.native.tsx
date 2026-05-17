/**
 * BodyModel3D — Native wrapper
 *
 * • Dev build with expo-gl → BodyModel3DCanvas.native (@react-three/fiber + expo-gl)
 * • Otherwise → BodyModel3DWebViewFallback (Three.js in WebView via CDN)
 *
 * expo-gl v16+ registers `ExponentGLObjectManager` (not legacy `ExpoGL`). Checking the
 * wrong name silently skipped the GL canvas and always used WebView — often looking “flat”.
 */

import React from 'react';
import { requireOptionalNativeModule } from 'expo-modules-core';
import BodyModel3DWebViewFallback from '@/components/BodyModel3DWebViewFallback.native';
import { BodySimulationParams } from '@/src/types';
import { Colors } from '@/constants/theme';

interface BodyModel3DProps {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    size?: number;
    accentColor?: string;
    autoRotate?: boolean;
    /** Kept for API parity with web; WebView path does not render a badge. */
    showGlFallbackBadge?: boolean;
    showInteractionHint?: boolean;
}

function hasExpoGlNativeModule(): boolean {
    return !!(
        requireOptionalNativeModule('ExponentGLObjectManager')
        || requireOptionalNativeModule('ExpoGL')
    );
}

let ThreeCanvas: React.ComponentType<BodyModel3DProps> | null = null;

if (hasExpoGlNativeModule()) {
    ThreeCanvas = require('./BodyModel3DCanvas.native').default;
}

export default function BodyModel3D({
    params,
    gender,
    size = 340,
    accentColor = Colors.primary,
    autoRotate = false,
    showInteractionHint = true,
}: BodyModel3DProps) {
    if (ThreeCanvas) {
        const Canvas = ThreeCanvas;
        return (
            <Canvas
                params={params}
                gender={gender}
                size={size}
                accentColor={accentColor}
                autoRotate={autoRotate}
                showInteractionHint={showInteractionHint}
            />
        );
    }

    return (
        <BodyModel3DWebViewFallback
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

/**
 * Three.js body preview via WebView — works when expo-gl / ExpoGL is unavailable (e.g. Expo Go).
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildBodyModelWebViewHtml } from '@/src/lib/bodyModelWebViewHtml';
import { BodySimulationParams } from '@/src/types';
import { Colors } from '@/constants/theme';

interface Props {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    size?: number;
    accentColor?: string;
    autoRotate?: boolean;
    showInteractionHint?: boolean;
}

export default function BodyModel3DWebViewFallback({
    params,
    gender,
    size = 340,
    accentColor = Colors.primary,
    autoRotate = false,
    showInteractionHint = true,
}: Props) {
    const width = Math.round(size * 0.75);
    const [webReady, setWebReady] = useState(false);
    const [hasError, setHasError] = useState(false);

    const html = useMemo(
        () => buildBodyModelWebViewHtml({ params, gender, accentColor, autoRotate }),
        [params, gender, accentColor, autoRotate],
    );

    const cacheKey = useMemo(
        () =>
            JSON.stringify({
                params,
                gender,
                accentColor,
                autoRotate,
            }),
        [params, gender, accentColor, autoRotate],
    );

    useEffect(() => {
        setWebReady(false);
        setHasError(false);
    }, [cacheKey]);

    if (hasError) {
        return (
            <View style={[styles.errorBox, { width, height: size }]}>
                <Text style={styles.errorText}>3D needs internet (Three.js CDN)</Text>
            </View>
        );
    }

    return (
        <View style={[styles.wrap, { width, height: size }]}>
            {!webReady ? (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={accentColor} />
                </View>
            ) : null}
            <WebView
                key={cacheKey}
                source={{ html, baseUrl: 'https://unpkg.com/' }}
                style={styles.webview}
                originWhitelist={['*']}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                mixedContentMode="always"
                allowsInlineMediaPlayback
                setBuiltInZoomControls={false}
                displayZoomControls={false}
                androidLayerType="hardware"
                onLoadEnd={() => setWebReady(true)}
                onError={() => setHasError(true)}
                onHttpError={() => setHasError(true)}
            />
            {showInteractionHint ? (
                <View style={styles.hint} pointerEvents="none">
                    <Text style={styles.hintText}>Drag to rotate • Pinch to zoom</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.06)',
        zIndex: 5,
    },
    hint: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 6,
    },
    hintText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.65)',
        backgroundColor: 'rgba(0,0,0,0.35)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        overflow: 'hidden',
    },
    errorBox: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    errorText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
        textAlign: 'center',
    },
});

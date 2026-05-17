import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors as ThemeColors, TAB_SCROLL_GUTTER, Spacing } from '@/constants/theme';

export type VoiceRecordingPalette = {
    primary: string;
    primaryLight: string;
    accent: string;
    text: string;
    textSecondary: string;
    textTertiary?: string;
    card: string;
    surfaceLight: string;
    border: string;
    scrim: string;
    /** Screen base behind translucent scrim */
    canvas: string;
};

type Props = {
    visible: boolean;
    /** Smoothed microphone energy 0–1 */
    audioLevel: number;
    durationMillis: number;
    onStop: () => void;
    onCancel: () => void;
    palette: VoiceRecordingPalette;
};

function formatDuration(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
}

/** 0 = silence / no rings; ramps toward 1 when voice crosses threshold */
function voiceRingPresence(level: number): number {
    const floor = 0.065;
    const ceil = 0.38;
    if (level <= floor) return 0;
    return Math.min(1, (level - floor) / (ceil - floor));
}

/**
 * In-chat recording UI — must be rendered inside a parent with flex + relative bounds
 * (e.g. Mindset Coach messages pane), not full-screen.
 */
export function VoiceRecordingOverlay({
    visible,
    audioLevel,
    durationMillis,
    onStop,
    onCancel,
    palette,
}: Props) {
    const scaleAnim = useRef(new Animated.Value(0.94)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) {
            scaleAnim.setValue(0.94);
            opacityAnim.setValue(0);
            return;
        }
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 9,
                tension: 70,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    }, [visible, opacityAnim, scaleAnim]);

    const tertiary = palette.textTertiary ?? palette.textSecondary;
    const vibe = voiceRingPresence(audioLevel);
    const ringOuterScale = 1 + vibe * audioLevel * 0.46;
    const ringMidScale = 1 + vibe * audioLevel * 0.3;
    const micScale = 1 + audioLevel * 0.06;

    const outerOpacity = vibe * (0.26 + audioLevel * 0.55);
    const midOpacity = vibe * (0.32 + audioLevel * 0.58);

    if (!visible) return null;

    return (
        <View style={styles.embedRoot} pointerEvents="box-none">
            <View style={[styles.canvasFill, { backgroundColor: palette.canvas }]} />
            <View style={[styles.scrimFill, { backgroundColor: palette.scrim }]} />

            <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Dismiss recording" />

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: opacityAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
                pointerEvents="box-none"
            >
                <View style={styles.upperFlex} pointerEvents="box-none">
                    <TouchableOpacity
                        activeOpacity={0.92}
                        onPress={onStop}
                        accessibilityRole="button"
                        accessibilityLabel="Stop and send voice message"
                        accessibilityHint="Tap to finish recording and send"
                        style={styles.micTouchable}
                    >
                        <View style={styles.visualWrap}>
                            <View
                                style={[
                                    styles.pulseOuter,
                                    {
                                        borderColor: palette.primary,
                                        opacity: outerOpacity,
                                        transform: [{ scale: ringOuterScale }],
                                    },
                                ]}
                            />
                            <View
                                style={[
                                    styles.pulseMid,
                                    {
                                        borderColor: palette.accent,
                                        opacity: midOpacity,
                                        transform: [{ scale: ringMidScale }],
                                    },
                                ]}
                            />
                            <View style={[styles.micScaleWrap, { transform: [{ scale: micScale }] }]}>
                                <LinearGradient
                                    colors={[...ThemeColors.gradients.primary]}
                                    style={styles.micCircle}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="mic" size={48} color="#FFFFFF" />
                                </LinearGradient>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.sendHint, { color: tertiary }]}>Tap microphone to send</Text>
                </View>

                <View style={[styles.bottomDock, { borderTopColor: palette.border }]}>
                    <Text style={[styles.cancelCaption, { color: palette.textSecondary }]}>
                        Tap chat area or ✕ to cancel
                    </Text>

                    <View style={styles.bottomRow}>
                        <View
                            style={styles.recIndicator}
                            accessibilityLabel={`Recording ${formatDuration(durationMillis)}`}
                        >
                            <View style={[styles.recOuterRing, { borderColor: palette.text }]}>
                                <View style={[styles.recInnerDot, { backgroundColor: ThemeColors.error }]} />
                            </View>
                            <Text style={[styles.timerTiny, { color: palette.textSecondary }]}>
                                {formatDuration(durationMillis)}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.cancelCircle,
                                {
                                    backgroundColor: palette.surfaceLight,
                                    borderColor: palette.border,
                                },
                            ]}
                            onPress={onCancel}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel recording"
                        >
                            <Ionicons name="close" size={28} color={palette.text} />
                        </TouchableOpacity>

                        <View style={styles.bottomSpacer} />
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    embedRoot: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 24,
        elevation: 24,
        overflow: 'hidden',
    },
    canvasFill: {
        ...StyleSheet.absoluteFillObject,
    },
    scrimFill: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: TAB_SCROLL_GUTTER,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    upperFlex: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        minHeight: 120,
    },
    micTouchable: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    visualWrap: {
        width: 192,
        height: 192,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseOuter: {
        position: 'absolute',
        width: 164,
        height: 164,
        borderRadius: 82,
        borderWidth: 2,
    },
    pulseMid: {
        position: 'absolute',
        width: 136,
        height: 136,
        borderRadius: 68,
        borderWidth: 2,
    },
    micScaleWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    micCircle: {
        width: 102,
        height: 102,
        borderRadius: 51,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: ThemeColors.primary,
        shadowOpacity: 0.32,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
    },
    sendHint: {
        marginTop: Spacing.sm,
        fontSize: 13,
        letterSpacing: 0.15,
        textAlign: 'center',
        paddingHorizontal: Spacing.sm,
    },
    bottomDock: {
        width: '100%',
        alignItems: 'center',
        paddingTop: Spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        maxWidth: 320,
    },
    cancelCaption: {
        fontSize: 12,
        marginBottom: Spacing.sm,
        letterSpacing: 0.15,
        textAlign: 'center',
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 2,
    },
    recIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        width: 88,
    },
    recOuterRing: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recInnerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    timerTiny: {
        fontSize: 12,
        fontVariant: ['tabular-nums'],
        fontWeight: '600',
    },
    cancelCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomSpacer: {
        width: 88,
    },
});

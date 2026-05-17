/**
 * FIT-BOT — Mindset Coach: peeks from the right gutter only (never sits over bubbles).
 * Parent should render this BEFORE the chat ScrollView so bubbles paint above the mascot.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

const ART = require('@/assets/images/fitbot.png');
const ART_W = 88;
const ART_H = ART_W * 1.12;

/** How much of the sprite may enter the narrow strip from the right (matches reference ~half-ish). */
const STRIP_W = Math.round(ART_W * 0.48);

type Mode = 'peekLow' | 'peekMid' | 'peekHigh';

function pickNextMode(prev: Mode | null): Mode {
    const all: Mode[] = ['peekLow', 'peekMid', 'peekHigh'];
    if (prev == null) return all[Math.floor(Math.random() * all.length)]!;
    const choices = all.filter((m) => m !== prev);
    return choices[Math.floor(Math.random() * choices.length)]!;
}

/** translateX: larger → sprite further right → less visible in strip */
const PEEK_HIDDEN_X = STRIP_W + Math.round(ART_W * 0.62);
const PEEK_VISIBLE_X = STRIP_W - Math.round(ART_W * 0.52);

export function FitBotCoachCompanion({
    active,
    paused,
}: {
    active: boolean;
    paused: boolean;
}) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(PEEK_HIDDEN_X)).current;
    const bob = useRef(new Animated.Value(0)).current;

    const [mode, setMode] = useState<Mode>('peekLow');

    const activeRef = useRef(active);
    const pausedRef = useRef(paused);
    const lastModeRef = useRef<Mode | null>(null);
    activeRef.current = active;
    pausedRef.current = paused;

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const bobLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(bob, {
                    toValue: 1,
                    duration: 2300,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.sin),
                }),
                Animated.timing(bob, {
                    toValue: 0,
                    duration: 2300,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.sin),
                }),
            ])
        );

        if (!active || paused) {
            bobLoop.stop();
            opacity.stopAnimation();
            translateX.stopAnimation();
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            return;
        }

        bobLoop.start();

        const scheduleAfter = (ms: number, fn: () => void) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(fn, ms);
        };

        const playSegment = () => {
            if (!activeRef.current || pausedRef.current) return;

            const next = pickNextMode(lastModeRef.current);
            lastModeRef.current = next;
            setMode(next);

            opacity.stopAnimation();
            translateX.stopAnimation();
            translateX.setValue(PEEK_HIDDEN_X);
            opacity.setValue(0);

            const done = () => scheduleAfter(420, playSegment);

            Animated.sequence([
                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 420,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.cubic),
                    }),
                    Animated.spring(translateX, {
                        toValue: PEEK_VISIBLE_X,
                        friction: 7,
                        tension: 76,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.delay(4400),
                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 280,
                        useNativeDriver: true,
                    }),
                    Animated.timing(translateX, {
                        toValue: PEEK_HIDDEN_X + 14,
                        duration: 340,
                        useNativeDriver: true,
                        easing: Easing.in(Easing.cubic),
                    }),
                ]),
            ]).start((r) => r.finished && done());
        };

        scheduleAfter(650, playSegment);

        return () => {
            bobLoop.stop();
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            opacity.stopAnimation();
            translateX.stopAnimation();
        };
    }, [active, paused, bob, opacity, translateX]);

    if (!active) return null;

    const bobTranslate = bob.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -5],
    });

    const verticalSlot =
        mode === 'peekLow'
            ? styles.slotLow
            : mode === 'peekMid'
              ? styles.slotMid
              : styles.slotHigh;

    return (
        <View
            style={styles.fill}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        >
            <View style={[styles.slot, verticalSlot]}>
                <View style={[styles.stripClip, { width: STRIP_W }]}>
                    <Animated.View
                        style={{
                            width: ART_W,
                            height: ART_H,
                            opacity,
                            transform: [{ translateX }],
                        }}
                    >
                        <Animated.View style={{ transform: [{ translateY: bobTranslate }] }}>
                            <Image
                                source={ART}
                                style={{ width: ART_W, height: ART_H }}
                                contentFit="contain"
                                accessibilityIgnoresInvertColors
                            />
                        </Animated.View>
                    </Animated.View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fill: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    /** Vertical placement — right gutter only (reference: beside lower coach bubble). */
    slot: {
        position: 'absolute',
        right: 0,
        justifyContent: 'center',
    },
    slotLow: {
        bottom: '16%',
        minHeight: ART_H + 12,
    },
    slotMid: {
        top: '38%',
        marginTop: -(ART_H / 2) - 6,
        minHeight: ART_H + 12,
    },
    slotHigh: {
        top: 44,
        minHeight: ART_H + 12,
    },
    stripClip: {
        overflow: 'hidden',
        alignSelf: 'flex-end',
        maxHeight: ART_H + 16,
    },
});

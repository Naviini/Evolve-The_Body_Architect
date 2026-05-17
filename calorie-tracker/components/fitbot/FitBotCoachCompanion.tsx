/**
 * FIT-BOT — Mindset Coach
 * - FitBotCoachCompanion: edge “sneak peek” in the message pane (under ScrollView).
 * - FitBotComposerMascot: thinking / speaking beside the composer (no halo); mouth-only motion while TTS plays.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Spacing, TAB_SCROLL_GUTTER } from '@/constants/theme';

const ART = require('@/assets/images/fitbot.png');

const ART_W = 118;
const ART_H = ART_W * 1.12;

/** Composer row mascot — sits just left of send */
const BAR_W = 52;
const BAR_H = Math.round(BAR_W * 1.12);

/** Mouth band on sprite (fraction of height from top) */
const MOUTH_TOP_FRAC = 0.54;
const MOUTH_H_FRAC = 0.2;

const STRIP_W = Math.round(ART_W * 0.5);

type VSlot = 'low' | 'mid' | 'high';
type Side = 'left' | 'right';

const HIDDEN_R = STRIP_W + Math.round(ART_W * 0.58);
const VISIBLE_R = STRIP_W - Math.round(ART_W * 0.5);
const HIDDEN_L = -HIDDEN_R;
const VISIBLE_L = -VISIBLE_R;

function pickVertical(prev: VSlot | null): VSlot {
    if (prev === null) return 'low';
    if (Math.random() < 0.62) return 'low';
    const rotate = (['mid', 'high'] as const).filter((x) => x !== prev);
    return rotate.length ? rotate[Math.floor(Math.random() * rotate.length)]! : 'low';
}

function pickSide(): Side {
    return Math.random() < 0.78 ? 'right' : 'left';
}

export function FitBotCoachCompanion({
    active,
    paused,
    thinking,
    speaking,
}: {
    active: boolean;
    paused: boolean;
    thinking: boolean;
    speaking: boolean;
}) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(HIDDEN_R)).current;
    const bob = useRef(new Animated.Value(0)).current;

    const [vSlot, setVSlot] = useState<VSlot>('low');
    const [side, setSide] = useState<Side>('right');

    const activeRef = useRef(active);
    const pausedRef = useRef(paused);
    const thinkingRef = useRef(thinking);
    const speakingRef = useRef(speaking);
    const lastVRef = useRef<VSlot | null>(null);
    activeRef.current = active;
    pausedRef.current = paused;
    thinkingRef.current = thinking;
    speakingRef.current = speaking;

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

        if (!active || paused || thinking || speaking) {
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
            if (!activeRef.current || pausedRef.current || thinkingRef.current || speakingRef.current)
                return;

            const nextV = pickVertical(lastVRef.current);
            const nextSide = pickSide();
            lastVRef.current = nextV;
            setVSlot(nextV);
            setSide(nextSide);

            const hidden = nextSide === 'right' ? HIDDEN_R : HIDDEN_L;
            const visible = nextSide === 'right' ? VISIBLE_R : VISIBLE_L;
            const hideExit = nextSide === 'right' ? HIDDEN_R + 14 : HIDDEN_L - 14;

            opacity.stopAnimation();
            translateX.stopAnimation();
            translateX.setValue(hidden);
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
                        toValue: visible,
                        friction: 8,
                        tension: 64,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.delay(5200),
                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 280,
                        useNativeDriver: true,
                    }),
                    Animated.timing(translateX, {
                        toValue: hideExit,
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
    }, [active, paused, thinking, speaking, bob, opacity, translateX]);

    if (!active) return null;

    const bobTranslate = bob.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -6],
    });

    const verticalStyle =
        vSlot === 'low' ? styles.slotLow : vSlot === 'mid' ? styles.slotMid : styles.slotHigh;
    const slotAlign = side === 'right' ? styles.slotRight : styles.slotLeft;
    const stripAlign = side === 'right' ? styles.stripClipRight : styles.stripClipLeft;

    return (
        <View
            style={styles.fillPeek}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        >
            {!paused && !thinking && !speaking ? (
                <View style={[styles.slot, slotAlign, verticalStyle]}>
                    <View style={[styles.stripClip, stripAlign, { width: STRIP_W }]}>
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
            ) : null}
        </View>
    );
}

function ComposerFitBotSprite({
    speaking,
    mouthShift,
}: {
    speaking: boolean;
    mouthShift: Animated.AnimatedInterpolation<number>;
}) {
    const mouthTop = BAR_H * MOUTH_TOP_FRAC;
    const mouthClipH = BAR_H * MOUTH_H_FRAC;

    return (
        <View style={{ width: BAR_W, height: BAR_H }}>
            <Image
                source={ART}
                style={{ width: BAR_W, height: BAR_H }}
                contentFit="contain"
                accessibilityIgnoresInvertColors
            />
            {speaking ? (
                <View
                    style={[styles.mouthClip, { top: mouthTop, height: mouthClipH }]}
                    pointerEvents="none"
                >
                    <Animated.View style={{ transform: [{ translateY: mouthShift }] }}>
                        <Image
                            source={ART}
                            style={[styles.mouthImage, { width: BAR_W, height: BAR_H, top: -mouthTop }]}
                            contentFit="contain"
                            accessibilityIgnoresInvertColors
                        />
                    </Animated.View>
                </View>
            ) : null}
        </View>
    );
}

export function FitBotComposerMascot({
    active,
    paused,
    thinking,
    speaking,
}: {
    active: boolean;
    paused: boolean;
    thinking: boolean;
    speaking: boolean;
}) {
    const visibleOpacity = useRef(new Animated.Value(0)).current;
    const thinkBreath = useRef(new Animated.Value(0)).current;
    const talkJaw = useRef(new Animated.Value(0)).current;

    const breathLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const mouthLoopRef = useRef<Animated.CompositeAnimation | null>(null);

    const show = active && !paused && (thinking || speaking);

    useEffect(() => {
        breathLoopRef.current?.stop();
        breathLoopRef.current = null;
        mouthLoopRef.current?.stop();
        mouthLoopRef.current = null;
        thinkBreath.stopAnimation();
        thinkBreath.setValue(0);
        talkJaw.stopAnimation();
        talkJaw.setValue(0);

        if (!show) {
            Animated.timing(visibleOpacity, {
                toValue: 0,
                duration: 160,
                useNativeDriver: true,
            }).start();
            return;
        }

        Animated.timing(visibleOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
        }).start();

        if (thinking && !speaking) {
            const breath = Animated.loop(
                Animated.sequence([
                    Animated.timing(thinkBreath, {
                        toValue: 1,
                        duration: 900,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.sin),
                    }),
                    Animated.timing(thinkBreath, {
                        toValue: 0,
                        duration: 900,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.sin),
                    }),
                ])
            );
            breathLoopRef.current = breath;
            breath.start();
        }

        if (speaking) {
            const mouth = Animated.loop(
                Animated.sequence([
                    Animated.timing(talkJaw, {
                        toValue: 1,
                        duration: 85,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.quad),
                    }),
                    Animated.timing(talkJaw, {
                        toValue: 0,
                        duration: 105,
                        useNativeDriver: true,
                        easing: Easing.in(Easing.quad),
                    }),
                ])
            );
            mouthLoopRef.current = mouth;
            mouth.start();
        }

        return () => {
            breathLoopRef.current?.stop();
            mouthLoopRef.current?.stop();
            breathLoopRef.current = null;
            mouthLoopRef.current = null;
        };
    }, [show, thinking, speaking, visibleOpacity, thinkBreath, talkJaw]);

    const breathOpacity = thinkBreath.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.88],
    });

    const mouthShift = talkJaw.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 4],
    });

    if (!active) return null;

    return (
        <View
            style={styles.composerMascot}
            pointerEvents="none"
            accessibilityElementsHidden={!show}
            accessibilityLabel={
                speaking ? 'FIT-BOT while coach speaks' : thinking ? 'FIT-BOT is thinking' : undefined
            }
        >
            <Animated.View style={{ opacity: visibleOpacity }}>
                {thinking && !speaking ? (
                    <Animated.View style={{ opacity: breathOpacity }}>
                        <ComposerFitBotSprite speaking={false} mouthShift={mouthShift} />
                    </Animated.View>
                ) : (
                    <ComposerFitBotSprite speaking={speaking} mouthShift={mouthShift} />
                )}
            </Animated.View>
        </View>
    );
}

const SEND_HIT = 46;

const styles = StyleSheet.create({
    fillPeek: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    composerMascot: {
        position: 'absolute',
        right: TAB_SCROLL_GUTTER + SEND_HIT + Spacing.sm,
        bottom: Spacing.xs + 2,
        width: BAR_W,
        height: BAR_H,
        zIndex: 2,
    },
    mouthClip: {
        position: 'absolute',
        left: 0,
        width: BAR_W,
        overflow: 'hidden',
    },
    mouthImage: {
        position: 'absolute',
        left: 0,
    },
    slot: {
        position: 'absolute',
        justifyContent: 'center',
    },
    slotRight: {
        right: 0,
    },
    slotLeft: {
        left: 0,
    },
    slotLow: {
        bottom: '22%',
        minHeight: ART_H + 12,
    },
    slotMid: {
        top: '37%',
        marginTop: -(ART_H / 2) - 6,
        minHeight: ART_H + 12,
    },
    slotHigh: {
        top: 42,
        minHeight: ART_H + 12,
    },
    stripClip: {
        overflow: 'hidden',
        maxHeight: ART_H + 16,
    },
    stripClipRight: {
        alignSelf: 'flex-end',
    },
    stripClipLeft: {
        alignSelf: 'flex-start',
    },
});

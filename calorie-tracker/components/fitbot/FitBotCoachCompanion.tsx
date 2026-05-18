/**
 * FIT-BOT — Mindset Coach
 * - FitBotCoachCompanion: sneak-peek from screen edge when idle; anchored bottom-right with
 *   lip-sync while TTS plays; subtle breath while “thinking”.
 * - FitBotComposerMascot: optional small mascot beside the composer (same mouth motion).
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
const HIDDEN_R = STRIP_W + Math.round(ART_W * 0.58);
const VISIBLE_R = STRIP_W - Math.round(ART_W * 0.5);
const HIDDEN_L = -HIDDEN_R;
const VISIBLE_L = -VISIBLE_R;

type VSlot = 'low' | 'mid' | 'high';
type Side = 'left' | 'right';

function pickVertical(prev: VSlot | null): VSlot {
    if (prev === null) return 'low';
    if (Math.random() < 0.62) return 'low';
    const rotate = (['mid', 'high'] as const).filter((x) => x !== prev);
    return rotate.length ? rotate[Math.floor(Math.random() * rotate.length)]! : 'low';
}

function pickSide(): Side {
    return Math.random() < 0.78 ? 'right' : 'left';
}

/** Full-size sprite: mouth overlay for lip-sync */
function CoachAnchoredFitBotSprite({
    speaking,
    thinking,
    mouthShift,
    breathOpacity,
}: {
    speaking: boolean;
    thinking: boolean;
    mouthShift: Animated.AnimatedInterpolation<number>;
    breathOpacity: Animated.AnimatedInterpolation<number>;
}) {
    const mouthTop = ART_H * MOUTH_TOP_FRAC;
    const mouthClipH = ART_H * MOUTH_H_FRAC;

    if (thinking && !speaking) {
        return (
            <Animated.View style={{ opacity: breathOpacity, width: ART_W, height: ART_H }}>
                <Image
                    source={ART}
                    style={{ width: ART_W, height: ART_H }}
                    contentFit="contain"
                    accessibilityIgnoresInvertColors
                />
            </Animated.View>
        );
    }

    return (
        <View style={{ width: ART_W, height: ART_H }}>
            <Image
                source={ART}
                style={{ width: ART_W, height: ART_H }}
                contentFit="contain"
                accessibilityIgnoresInvertColors
            />
            {speaking ? (
                <View
                    style={[styles.mouthClipCoach, { top: mouthTop, height: mouthClipH, width: ART_W }]}
                    pointerEvents="none"
                >
                    <Animated.View style={{ transform: [{ translateY: mouthShift }] }}>
                        <Image
                            source={ART}
                            style={[styles.mouthImageCoach, { width: ART_W, height: ART_H, top: -mouthTop }]}
                            contentFit="contain"
                            accessibilityIgnoresInvertColors
                        />
                    </Animated.View>
                </View>
            ) : null}
        </View>
    );
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
    const talkJaw = useRef(new Animated.Value(0)).current;
    const thinkBreath = useRef(new Animated.Value(0)).current;

    const peekOpacity = useRef(new Animated.Value(0)).current;
    const peekTranslateX = useRef(new Animated.Value(HIDDEN_R)).current;
    const peekBob = useRef(new Animated.Value(0)).current;

    const [vSlot, setVSlot] = useState<VSlot>('low');
    const [side, setSide] = useState<Side>('right');

    const breathLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const mouthLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const peekBobLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const peekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeRef = useRef(active);
    const pausedRef = useRef(paused);
    const thinkingRef = useRef(thinking);
    const speakingRef = useRef(speaking);
    const lastVRef = useRef<VSlot | null>(null);
    activeRef.current = active;
    pausedRef.current = paused;
    thinkingRef.current = thinking;
    speakingRef.current = speaking;

    /** Lip-sync while TTS plays */
    useEffect(() => {
        mouthLoopRef.current?.stop();
        mouthLoopRef.current = null;
        talkJaw.stopAnimation();
        talkJaw.setValue(0);

        if (!active || paused || !speaking) {
            return;
        }

        const mouth = Animated.loop(
            Animated.sequence([
                Animated.timing(talkJaw, {
                    toValue: 1,
                    duration: 88,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.quad),
                }),
                Animated.timing(talkJaw, {
                    toValue: 0,
                    duration: 108,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.quad),
                }),
            ])
        );
        mouthLoopRef.current = mouth;
        mouth.start();

        return () => {
            mouthLoopRef.current?.stop();
            mouthLoopRef.current = null;
        };
    }, [active, paused, speaking, talkJaw]);

    /** Subtle breathing while model / network “thinking” */
    useEffect(() => {
        breathLoopRef.current?.stop();
        breathLoopRef.current = null;
        thinkBreath.stopAnimation();
        thinkBreath.setValue(0);

        if (!active || paused || !thinking || speaking) {
            return;
        }

        const breath = Animated.loop(
            Animated.sequence([
                Animated.timing(thinkBreath, {
                    toValue: 1,
                    duration: 920,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.sin),
                }),
                Animated.timing(thinkBreath, {
                    toValue: 0,
                    duration: 920,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.sin),
                }),
            ])
        );
        breathLoopRef.current = breath;
        breath.start();

        return () => {
            breathLoopRef.current?.stop();
            breathLoopRef.current = null;
        };
    }, [active, paused, thinking, speaking, thinkBreath]);

    /** Sneak-peek from edge when idle (not thinking / not speaking) */
    useEffect(() => {
        peekBobLoopRef.current?.stop();
        peekBobLoopRef.current = null;
        peekBob.stopAnimation();
        peekOpacity.stopAnimation();
        peekTranslateX.stopAnimation();

        if (!active || paused || thinking || speaking) {
            Animated.timing(peekOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
            if (peekTimeoutRef.current) {
                clearTimeout(peekTimeoutRef.current);
                peekTimeoutRef.current = null;
            }
            return;
        }

        const bobLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(peekBob, {
                    toValue: 1,
                    duration: 2300,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.sin),
                }),
                Animated.timing(peekBob, {
                    toValue: 0,
                    duration: 2300,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.sin),
                }),
            ])
        );
        peekBobLoopRef.current = bobLoop;
        bobLoop.start();

        const scheduleAfter = (ms: number, fn: () => void) => {
            if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
            peekTimeoutRef.current = setTimeout(fn, ms);
        };

        const playSegment = () => {
            if (
                !activeRef.current ||
                pausedRef.current ||
                thinkingRef.current ||
                speakingRef.current
            )
                return;

            const nextV = pickVertical(lastVRef.current);
            const nextSide = pickSide();
            lastVRef.current = nextV;
            setVSlot(nextV);
            setSide(nextSide);

            const hidden = nextSide === 'right' ? HIDDEN_R : HIDDEN_L;
            const visible = nextSide === 'right' ? VISIBLE_R : VISIBLE_L;
            const hideExit = nextSide === 'right' ? HIDDEN_R + 14 : HIDDEN_L - 14;

            peekOpacity.stopAnimation();
            peekTranslateX.stopAnimation();
            peekTranslateX.setValue(hidden);
            peekOpacity.setValue(0);

            const done = () => scheduleAfter(420, playSegment);

            Animated.sequence([
                Animated.parallel([
                    Animated.timing(peekOpacity, {
                        toValue: 1,
                        duration: 420,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.cubic),
                    }),
                    Animated.spring(peekTranslateX, {
                        toValue: visible,
                        friction: 8,
                        tension: 64,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.delay(5200),
                Animated.parallel([
                    Animated.timing(peekOpacity, {
                        toValue: 0,
                        duration: 280,
                        useNativeDriver: true,
                    }),
                    Animated.timing(peekTranslateX, {
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
            peekBobLoopRef.current?.stop();
            peekBobLoopRef.current = null;
            if (peekTimeoutRef.current) {
                clearTimeout(peekTimeoutRef.current);
                peekTimeoutRef.current = null;
            }
            peekOpacity.stopAnimation();
            peekTranslateX.stopAnimation();
        };
    }, [active, paused, thinking, speaking, peekOpacity, peekTranslateX, peekBob]);

    const mouthShift = talkJaw.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 3],
    });

    const breathOpacity = thinkBreath.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.9],
    });

    const peekBobTranslate = peekBob.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -6],
    });

    if (!active || paused) return null;

    const verticalStyle =
        vSlot === 'low' ? styles.slotLow : vSlot === 'mid' ? styles.slotMid : styles.slotHigh;
    const slotAlign = side === 'right' ? styles.slotRight : styles.slotLeft;
    const stripAlign = side === 'right' ? styles.stripClipRight : styles.stripClipLeft;

    const anchoredSprite = (
        <CoachAnchoredFitBotSprite
            speaking={speaking}
            thinking={thinking}
            mouthShift={mouthShift}
            breathOpacity={breathOpacity}
        />
    );

    return (
        <View
            style={styles.fillPeek}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        >
            {!(thinking || speaking) ? (
                <View style={[styles.slot, slotAlign, verticalStyle]}>
                    <View
                        style={[
                            styles.stripClip,
                            stripAlign,
                            { width: STRIP_W },
                            side === 'left' ? styles.stripClipContentEnd : styles.stripClipContentStart,
                        ]}
                    >
                        <Animated.View
                            style={{
                                width: ART_W,
                                height: ART_H,
                                opacity: peekOpacity,
                                transform: [{ translateX: peekTranslateX }],
                            }}
                        >
                            <Animated.View style={{ transform: [{ translateY: peekBobTranslate }] }}>
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
            ) : (
                <View style={styles.anchoredCoachCompanion}>{anchoredSprite}</View>
            )}
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
        zIndex: 3,
        elevation: 4,
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
    /** Wider sprite than strip: anchor to the edge that faces the chat so the correct sliver shows */
    stripClipContentStart: {
        alignItems: 'flex-start',
    },
    stripClipContentEnd: {
        alignItems: 'flex-end',
    },
    stripClipRight: {
        alignSelf: 'flex-end',
    },
    stripClipLeft: {
        alignSelf: 'flex-start',
    },
    anchoredCoachCompanion: {
        position: 'absolute',
        right: Spacing.xs,
        /** Bottom gutter above the composer — usually empty; scaled down so it stays out of the conversation */
        bottom: Spacing.sm,
        zIndex: 3,
        elevation: 4,
        transform: [{ scale: 0.86 }],
    },
    mouthClipCoach: {
        position: 'absolute',
        left: 0,
        overflow: 'hidden',
    },
    mouthImageCoach: {
        position: 'absolute',
        left: 0,
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
});

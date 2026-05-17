/**
 * FIT-BOT — in-app mascot shown on Home (and reusable elsewhere).
 * Art: assets/images/fitbot.png (replace anytime to update the character).
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

const ART = require('@/assets/images/fitbot.png');

type Props = {
    caption: string;
    /** Render width for artwork (height scales with aspect ratio). */
    artWidth?: number;
};

export function FitBotCharacter({ caption, artWidth = 92 }: Props) {
    const colors = useThemeColors();
    const bob = useRef(new Animated.Value(0)).current;

    const artStyle = useMemo(
        () => ({
            width: artWidth,
            height: artWidth * 1.12,
        }),
        [artWidth]
    );

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(bob, {
                    toValue: 1,
                    duration: 2400,
                    useNativeDriver: true,
                }),
                Animated.timing(bob, {
                    toValue: 0,
                    duration: 2400,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => {
            loop.stop();
        };
    }, [bob]);

    const translateY = bob.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -7],
    });

    return (
        <View
            style={[
                styles.row,
                {
                    backgroundColor: colors.surfaceLight,
                    borderColor: colors.border,
                },
            ]}
            accessibilityRole="summary"
            accessibilityLabel={`FIT-BOT says: ${caption}`}
        >
            <Animated.View style={{ transform: [{ translateY }] }}>
                <Image source={ART} style={artStyle} contentFit="contain" accessibilityIgnoresInvertColors />
            </Animated.View>
            <View style={styles.copyCol}>
                <Text style={[styles.nameplate, { color: Colors.accent }]}>FIT-BOT</Text>
                <Text style={[styles.caption, { color: colors.text }]}>{caption}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        ...Shadows.card,
    },
    copyCol: {
        flex: 1,
        gap: 4,
        minWidth: 0,
    },
    nameplate: {
        fontSize: 11,
        fontWeight: Typography.weights.bold,
        letterSpacing: 1.4,
    },
    caption: {
        fontSize: Typography.sizes.body - 1,
        lineHeight: 20,
        fontWeight: Typography.weights.medium,
    },
});

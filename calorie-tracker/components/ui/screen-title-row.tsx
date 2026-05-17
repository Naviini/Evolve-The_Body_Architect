import React from 'react';
import { View, Text, StyleSheet, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface ScreenTitleRowProps {
  title: string;
  icon: IoniconsName;
  iconSize?: number;
  /** When set, used for title and icon instead of theme text (e.g. white on gradients). */
  color?: string;
  titleStyle?: TextStyle;
}

/** Tab headers: bold title + outline icon (same rhythm as Workout). */
export function ScreenTitleRow({
  title,
  icon,
  iconSize = 22,
  color,
  titleStyle,
}: ScreenTitleRowProps) {
  const colors = useThemeColors();
  const fg = color ?? colors.text;
  return (
    <View style={styles.row} accessibilityRole="header">
      <Text style={[styles.title, { color: fg }, titleStyle]}>{title}</Text>
      <Ionicons name={icon} size={iconSize} color={fg} style={styles.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.45,
  },
  icon: {
    marginTop: 1,
  },
});

import React from 'react';
import { TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface HeaderIconButtonProps {
  icon: IoniconsName;
  iconSize?: number;
  iconColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  disabled?: boolean;
}

/** Matches home dashboard header chips (notification + menu): 44×44 squircle, surface fill, hairline border. */
export function HeaderIconButton({
  icon,
  iconSize = 22,
  iconColor,
  onPress,
  style,
  accessibilityLabel,
  disabled,
}: HeaderIconButtonProps) {
  const colors = useThemeColors();
  const tint = iconColor ?? colors.text;
  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: colors.surfaceLight,
          borderColor: colors.border,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Ionicons name={icon} size={iconSize} color={tint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});

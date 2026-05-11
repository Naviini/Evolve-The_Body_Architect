import { Stack } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

/**
 * Nested stack inside main tabs — keeps `/settings/*` URLs while bottom tabs stay visible.
 */
export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
      }}
    />
  );
}

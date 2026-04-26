/**
 * Root Layout — App Entry Point & Auth Guard
 *
 * Order of operations:
 * 1. Wait for DB + onboarding check
 * 2. First-time users  → onboarding
 * 3. Returning but not signed in → login
 * 4. Signed in but email not verified → verify-email notice
 * 5. Signed in + verified → main app (tabs)
 *
 * The useProtectedRoute hook reacts to ANY auth-state change,
 * so sign-in / sign-out re-routes automatically.
 */

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { ThemeProvider } from '@/src/contexts/ThemeContext';
import { initDatabase } from '@/src/lib/database';
import { startAutoSync } from '@/src/lib/sync';
import { Colors, Typography } from '@/constants/theme';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';

const ONBOARDING_KEY = '@calorie_tracker_onboarding_done';

// ──────────────────────────────────────────────────────────────────
// Auth routing guard — decides where to send the user
// ──────────────────────────────────────────────────────────────────
function useProtectedRoute(
  onboardingDone: boolean,
  setOnboardingDone: (v: boolean) => void,
) {
  const { user, loading, isEmailVerified } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Re-check the AsyncStorage flag when segments change — this picks up
  // the flag that onboarding.tsx sets right before navigating to profile-setup.
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      if (val === 'true' && !onboardingDone) {
        setOnboardingDone(true);
      }
    });
  }, [segments]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentPath = segments.join('/');
    const inProfileSetup = currentPath === '(auth)/profile-setup';

    if (!onboardingDone) {
      // Allow the first transition from onboarding -> profile setup.
      // onboardingDone state is sourced from AsyncStorage and may lag one render.
      if (inProfileSetup) return;

      // Always show onboarding to first-timers
      router.replace('/(auth)/onboarding' as any);
      return;
    }

    if (!user) {
      // Not signed in → send to login (unless already in auth flow)
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (user && !isEmailVerified) {
      // Signed up but not verified
      if (segments.join('/') !== '(auth)/verify-email') {
        router.replace('/(auth)/verify-email' as any);
      }
      return;
    }

    // Fully authenticated — push to main app
    if (inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, isEmailVerified, segments, onboardingDone]);
}

// ──────────────────────────────────────────────────────────────────
// Inner layout — has access to AuthContext
// ──────────────────────────────────────────────────────────────────
function InnerLayout({
  onboardingDone,
  setOnboardingDone,
}: {
  onboardingDone: boolean;
  setOnboardingDone: (v: boolean) => void;
}) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  useProtectedRoute(onboardingDone, setOnboardingDone);
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.rootBackground}>
      <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-meal"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="edit-health-profile"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="body-insights"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="body-simulation"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────
// Root Layout — initialises everything before rendering
// ──────────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const done = await AsyncStorage.getItem(ONBOARDING_KEY);
        setOnboardingDone(done === 'true');
        await initDatabase();
        startAutoSync();
      } catch (e) {
        console.error('Init error:', e);
        setOnboardingDone(false);
      }
      setDbReady(true);
    }
    init();
  }, []);

  if (!dbReady || onboardingDone === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <InnerLayout onboardingDone={onboardingDone} setOnboardingDone={setOnboardingDone} />
      </AuthProvider>
    </ThemeProvider>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  rootBackground: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#0a0a0c' : colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webContainer: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    // In React Native Web, boxShadow works, or we can use generic shadow props
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: Typography.sizes.body,
  },
});

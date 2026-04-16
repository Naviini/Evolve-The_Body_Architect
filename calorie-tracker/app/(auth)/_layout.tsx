import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/src/contexts/ThemeContext';

export default function AuthLayout() {
    const { isDark } = useAppTheme();
    const palette = isDark ? Colors.dark : Colors.light;

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: palette.background },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="profile-setup" options={{ animation: 'slide_from_right', gestureEnabled: false }} />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="verify-email" options={{ gestureEnabled: false }} />
        </Stack>
    );
}

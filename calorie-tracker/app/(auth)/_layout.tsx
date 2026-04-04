import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.dark.background },
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

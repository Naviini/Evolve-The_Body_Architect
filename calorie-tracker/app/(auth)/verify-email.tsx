/**
 * Verify Email Screen
 *
 * Shown after sign-up when user's email is not yet confirmed.
 * Allows resending the verification email.
 * Once the user verifies, Supabase sends an auth state change →
 * the auth guard in _layout.tsx automatically routes to (tabs).
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';

export default function VerifyEmailScreen() {
    const { user, signOut, resendVerification } = useAuth();
    const [resending, setResending] = useState(false);
    const [resentOk, setResentOk] = useState(false);
    const [error, setError] = useState('');

    const email = user?.email || '';

    const handleResend = async () => {
        if (!email) return;
        setResending(true);
        setError('');
        setResentOk(false);
        const { error: e } = await resendVerification(email);
        setResending(false);
        if (e) {
            setError('Could not resend. ' + (e.message || 'Please try again.'));
        } else {
            setResentOk(true);
        }
    };

    return (
        <View style={styles.container}>
            {/* Animated envelope icon */}
            <LinearGradient
                colors={Colors.gradients.primary}
                style={styles.iconCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Ionicons name="mail-unread" size={52} color="#FFF" />
            </LinearGradient>

            <Text style={styles.title}>Verify your email</Text>

            <Text style={styles.body}>
                We sent a confirmation link to{'\n'}
                <Text style={styles.email}>{email}</Text>
                {'\n\n'}Open your email and tap the link to activate your account. This page will update automatically once verified.
            </Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Resend section */}
            {resentOk && (
                <View style={styles.successBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.successText}>Verification email resent!</Text>
                </View>
            )}

            {!!error && (
                <View style={styles.errorBadge}>
                    <Ionicons name="alert-circle" size={16} color={Colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <Text style={styles.resendPrompt}>Didn't receive the email?</Text>

            <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResend}
                disabled={resending}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.resendButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    {resending ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <>
                            <Ionicons name="refresh" size={16} color="#FFF" />
                            <Text style={styles.resendButtonText}>Resend Email</Text>
                        </>
                    )}
                </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.spamHint}>
                Check your spam or junk folder if you don't see it within a few minutes.
            </Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Wrong account? */}
            <TouchableOpacity
                style={styles.signOutButton}
                onPress={signOut}
                activeOpacity={0.7}
            >
                <Ionicons name="log-out-outline" size={16} color={Colors.dark.textTertiary} />
                <Text style={styles.signOutText}>Sign out and use a different account</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        gap: Spacing.md,
    },

    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        ...Shadows.glow,
    },

    title: {
        fontSize: Typography.sizes.heading,
        color: Colors.dark.text,
        fontWeight: Typography.weights.bold,
        textAlign: 'center',
    },
    body: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 320,
    },
    email: {
        color: Colors.primary,
        fontWeight: Typography.weights.semibold,
    },

    divider: {
        width: '80%',
        height: 1,
        backgroundColor: Colors.dark.border,
        marginVertical: Spacing.xs,
    },

    // Badges
    successBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.success + '18',
        borderRadius: BorderRadius.sm,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.success + '40',
    },
    successText: {
        color: Colors.success,
        fontSize: Typography.sizes.body,
        fontWeight: Typography.weights.medium,
    },
    errorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.error + '18',
        borderRadius: BorderRadius.sm,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.error + '40',
    },
    errorText: {
        color: Colors.error,
        fontSize: Typography.sizes.body,
        fontWeight: Typography.weights.medium,
    },

    resendPrompt: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textSecondary,
    },

    resendButton: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        width: '100%',
        maxWidth: 300,
    },
    resendButtonGradient: {
        flexDirection: 'row',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    resendButtonText: {
        fontSize: Typography.sizes.bodyLarge,
        color: '#FFF',
        fontWeight: Typography.weights.bold,
    },

    spamHint: {
        fontSize: Typography.sizes.caption,
        color: Colors.dark.textTertiary,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 280,
    },

    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    signOutText: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textTertiary,
        textDecorationLine: 'underline',
    },
});

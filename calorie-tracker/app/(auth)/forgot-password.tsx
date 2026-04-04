/**
 * Forgot Password Screen
 *
 * Sends a Supabase password-reset email.
 * Shows a success state after sending so users know to check email.
 */

import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';

export default function ForgotPasswordScreen() {
    const { resetPassword } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const shakeAnim = useRef(new Animated.Value(0)).current;

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleReset = async () => {
        setError('');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim() || !emailRegex.test(email.trim())) {
            setError('Please enter a valid email address.');
            shake();
            return;
        }

        setLoading(true);
        const { error: authError } = await resetPassword(email.trim().toLowerCase());
        setLoading(false);

        if (authError) {
            setError(authError.message || 'Failed to send reset email. Try again.');
            shake();
        } else {
            setSent(true);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Back */}
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={Colors.dark.text} />
                </TouchableOpacity>

                {/* Success State */}
                {sent ? (
                    <View style={styles.successContainer}>
                        <LinearGradient
                            colors={Colors.gradients.success}
                            style={styles.successIcon}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="mail-open" size={40} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.successTitle}>Check your email</Text>
                        <Text style={styles.successBody}>
                            We sent a password reset link to{'\n'}
                            <Text style={styles.successEmail}>{email}</Text>
                            {'\n\n'}Open your email and follow the link to reset your password. Check your spam folder if you don't see it.
                        </Text>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => router.replace('/(auth)/login')}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={[Colors.primary, Colors.primaryDark]}
                                style={styles.primaryButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.primaryButtonText}>Back to Sign In</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setSent(false); setEmail(''); }}>
                            <Text style={styles.resendLink}>Try a different email</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Header */}
                        <View style={styles.header}>
                            <LinearGradient
                                colors={Colors.gradients.warm}
                                style={styles.headerIcon}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="key" size={28} color="#FFF" />
                            </LinearGradient>
                            <Text style={styles.title}>Reset password</Text>
                            <Text style={styles.subtitle}>
                                Enter your email and we'll send you a link to reset your password.
                            </Text>
                        </View>

                        {/* Form */}
                        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
                            {!!error && (
                                <View style={styles.errorBanner}>
                                    <Ionicons name="alert-circle" size={16} color={Colors.error} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Email Address</Text>
                                <View style={styles.inputRow}>
                                    <Ionicons name="mail-outline" size={18} color={Colors.dark.textTertiary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="you@example.com"
                                        placeholderTextColor={Colors.dark.textTertiary}
                                        value={email}
                                        onChangeText={(t) => { setEmail(t); setError(''); }}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="send"
                                        onSubmitEditing={handleReset}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleReset}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[Colors.primary, Colors.primaryDark]}
                                    style={styles.primaryButtonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => router.back()}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.dark.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },

    // Header
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    headerIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
        ...Shadows.glow,
    },
    title: {
        fontSize: Typography.sizes.heading,
        color: Colors.dark.text,
        fontWeight: Typography.weights.bold,
    },
    subtitle: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 22,
        maxWidth: 300,
    },

    // Card
    card: {
        backgroundColor: Colors.dark.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        padding: Spacing.xl,
        gap: Spacing.md,
        ...Shadows.medium,
    },

    // Error
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.error + '18',
        borderWidth: 1,
        borderColor: Colors.error + '40',
        borderRadius: BorderRadius.sm,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
    },
    errorText: {
        flex: 1,
        color: Colors.error,
        fontSize: Typography.sizes.body,
        fontWeight: Typography.weights.medium,
    },

    // Fields
    fieldGroup: { gap: 6 },
    fieldLabel: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textSecondary,
        fontWeight: Typography.weights.semibold,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.dark.surfaceLight,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
    },
    input: {
        flex: 1,
        color: Colors.dark.text,
        fontSize: Typography.sizes.bodyLarge,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    },

    // Buttons
    primaryButton: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    primaryButtonGradient: {
        paddingVertical: 15,
        alignItems: 'center',
        borderRadius: BorderRadius.md,
    },
    primaryButtonText: {
        fontSize: Typography.sizes.bodyLarge,
        color: '#FFF',
        fontWeight: Typography.weights.bold,
    },
    cancelButton: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    cancelText: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textTertiary,
    },

    // Success state
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Spacing.xxl,
        gap: Spacing.lg,
    },
    successIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.glow,
    },
    successTitle: {
        fontSize: Typography.sizes.heading,
        color: Colors.dark.text,
        fontWeight: Typography.weights.bold,
    },
    successBody: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 300,
    },
    successEmail: {
        color: Colors.primary,
        fontWeight: Typography.weights.semibold,
    },
    resendLink: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textTertiary,
        textDecorationLine: 'underline',
        marginTop: Spacing.sm,
    },
});

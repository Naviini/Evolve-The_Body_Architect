/**
 * Register Screen — Full Sign Up UI
 *
 * Features:
 * - Name, email, password, confirm password
 * - Real-time password strength indicator
 * - Inline validation with clear error messages
 * - On success → verify-email screen (via auth guard)
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
    Animated,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
    if (pw.length === 0) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: Colors.error };
    if (score === 2) return { score: 2, label: 'Fair', color: Colors.warning };
    if (score === 3) return { score: 3, label: 'Good', color: Colors.accent };
    return { score: 4, label: 'Strong', color: Colors.success };
}

export default function RegisterScreen() {
    const { signUp } = useAuth();
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);

    const strength = getPasswordStrength(password);

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleRegister = async () => {
        setError('');

        if (!name.trim()) {
            setError('Please enter your full name.'); shake(); return;
        }
        if (!email.trim()) {
            setError('Please enter your email address.'); shake(); return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError('Please enter a valid email address.'); shake(); return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.'); shake(); return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.'); shake(); confirmRef.current?.focus(); return;
        }

        setLoading(true);
        const { error: authError } = await signUp(email.trim().toLowerCase(), password, name.trim());
        setLoading(false);

        if (authError) {
            if (authError.message?.includes('already registered') || authError.message?.includes('already been registered')) {
                setError('An account with this email already exists. Try signing in instead.');
            } else if (authError.message?.includes('weak password')) {
                setError('Choose a stronger password.');
            } else {
                setError(authError.message || 'Registration failed. Please try again.');
            }
            shake();
        }
        // On success, auth guard detects the new unverified session → routes to verify-email
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

                {/* Header */}
                <View style={styles.header}>
                    <LinearGradient
                        colors={Colors.gradients.primary}
                        style={styles.headerIcon}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="person-add" size={28} color="#FFF" />
                    </LinearGradient>
                    <Text style={styles.title}>Create account</Text>
                    <Text style={styles.subtitle}>Start your nutrition journey today</Text>
                </View>

                {/* Form Card */}
                <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>

                    {/* Error */}
                    {!!error && (
                        <View style={styles.errorBanner}>
                            <Ionicons name="alert-circle" size={16} color={Colors.error} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Full Name */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Full Name</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="person-outline" size={18} color={Colors.dark.textTertiary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Jane Smith"
                                placeholderTextColor={Colors.dark.textTertiary}
                                value={name}
                                onChangeText={(t) => { setName(t); setError(''); }}
                                autoCapitalize="words"
                                returnKeyType="next"
                                onSubmitEditing={() => emailRef.current?.focus()}
                            />
                        </View>
                    </View>

                    {/* Email */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Email</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="mail-outline" size={18} color={Colors.dark.textTertiary} />
                            <TextInput
                                ref={emailRef}
                                style={styles.input}
                                placeholder="you@example.com"
                                placeholderTextColor={Colors.dark.textTertiary}
                                value={email}
                                onChangeText={(t) => { setEmail(t); setError(''); }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Password</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="lock-closed-outline" size={18} color={Colors.dark.textTertiary} />
                            <TextInput
                                ref={passwordRef}
                                style={styles.input}
                                placeholder="At least 6 characters"
                                placeholderTextColor={Colors.dark.textTertiary}
                                value={password}
                                onChangeText={(t) => { setPassword(t); setError(''); }}
                                secureTextEntry={!showPassword}
                                returnKeyType="next"
                                onSubmitEditing={() => confirmRef.current?.focus()}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={18}
                                    color={Colors.dark.textTertiary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Strength indicator */}
                        {password.length > 0 && (
                            <View style={styles.strengthRow}>
                                {[1, 2, 3, 4].map((i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.strengthBar,
                                            { backgroundColor: i <= strength.score ? strength.color : Colors.dark.border },
                                        ]}
                                    />
                                ))}
                                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                                    {strength.label}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Confirm Password */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Confirm Password</Text>
                        <View style={[
                            styles.inputRow,
                            confirmPassword.length > 0 && confirmPassword !== password && styles.inputRowError,
                            confirmPassword.length > 0 && confirmPassword === password && styles.inputRowSuccess,
                        ]}>
                            <Ionicons name="lock-closed-outline" size={18} color={Colors.dark.textTertiary} />
                            <TextInput
                                ref={confirmRef}
                                style={styles.input}
                                placeholder="Re-enter password"
                                placeholderTextColor={Colors.dark.textTertiary}
                                value={confirmPassword}
                                onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                                secureTextEntry={!showConfirm}
                                returnKeyType="done"
                                onSubmitEditing={handleRegister}
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons
                                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                                    size={18}
                                    color={Colors.dark.textTertiary}
                                />
                            </TouchableOpacity>
                        </View>
                        {confirmPassword.length > 0 && confirmPassword !== password && (
                            <Text style={styles.matchError}>Passwords don't match</Text>
                        )}
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleRegister}
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
                                <Text style={styles.primaryButtonText}>Create Account</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Login link */}
                    <View style={styles.loginRow}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                            <Text style={styles.loginLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Terms */}
                    <Text style={styles.terms}>
                        By creating an account you agree to our{' '}
                        <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                </Animated.View>
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

    // Back
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
        marginTop: 4,
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
    inputRowError: { borderColor: Colors.error },
    inputRowSuccess: { borderColor: Colors.success },
    input: {
        flex: 1,
        color: Colors.dark.text,
        fontSize: Typography.sizes.bodyLarge,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    },
    matchError: {
        fontSize: Typography.sizes.caption,
        color: Colors.error,
        marginTop: 2,
    },

    // Password strength
    strengthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: Typography.sizes.caption,
        fontWeight: Typography.weights.semibold,
        minWidth: 40,
        textAlign: 'right',
    },

    // Buttons
    primaryButton: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        marginTop: Spacing.xs,
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

    // Login link
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    loginText: {
        fontSize: Typography.sizes.body,
        color: Colors.dark.textSecondary,
    },
    loginLink: {
        fontSize: Typography.sizes.body,
        color: Colors.primary,
        fontWeight: Typography.weights.bold,
    },

    // Terms
    terms: {
        fontSize: Typography.sizes.caption,
        color: Colors.dark.textTertiary,
        textAlign: 'center',
        lineHeight: 18,
    },
    termsLink: {
        color: Colors.primary,
    },
});

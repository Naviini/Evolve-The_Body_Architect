/**
 * Login Screen — Full Authentication UI
 *
 * Features:
 * - Email + password sign in via Supabase
 * - Inline validation with clear error messages
 * - Forgot password link
 * - Sign up navigation
 * - No manual router.replace needed — auth guard handles routing
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
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function LoginScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
    const { signIn } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const shakeAnim = useRef(new Animated.Value(0)).current;

    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleLogin = async () => {
        setError('');

        if (!email.trim()) {
            setError('Please enter your email address.');
            shake();
            emailRef.current?.focus();
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError('Please enter a valid email address.');
            shake();
            emailRef.current?.focus();
            return;
        }

        if (!password) {
            setError('Please enter your password.');
            shake();
            passwordRef.current?.focus();
            return;
        }

        setLoading(true);
        const { error: authError } = await signIn(email.trim().toLowerCase(), password);
        setLoading(false);

        if (authError) {
            // Translate Supabase error messages to user-friendly versions
            if (authError.message?.includes('Invalid login credentials')) {
                setError('Incorrect email or password. Please try again.');
            } else if (authError.message?.includes('Email not confirmed')) {
                setError('Your email is not verified. Please check your inbox.');
            } else if (authError.message?.includes('Too many requests')) {
                setError('Too many attempts. Please wait a moment and try again.');
            } else {
                setError(authError.message || 'Login failed. Please try again.');
            }
            shake();
        }
        // On success, the auth guard in _layout.tsx handles navigation automatically
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
                {/* Logo / Brand */}
                <View style={styles.brand}>
                    <LinearGradient
                        colors={Colors.gradients.primary}
                        style={styles.logoCircle}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="flame" size={40} color="#FFF" />
                    </LinearGradient>
                    <Text style={styles.appName}>Evolve</Text>
                    <Text style={styles.tagline}>Your personal nutrition coach</Text>
                </View>

                {/* Card */}
                <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
                    <Text style={styles.cardTitle}>Welcome back</Text>
                    <Text style={styles.cardSubtitle}>Sign in to continue tracking</Text>

                    {/* Error banner */}
                    {!!error && (
                        <View style={styles.errorBanner}>
                            <Ionicons name="alert-circle" size={16} color={Colors.error} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Email */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Email</Text>
                        <View style={[styles.inputRow, !!error && email === '' && styles.inputRowError]}>
                            <Ionicons name="mail-outline" size={18} color={colors.textTertiary} />
                            <TextInput
                                ref={emailRef}
                                style={styles.input}
                                placeholder="you@example.com"
                                placeholderTextColor={colors.textTertiary}
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
                        <View style={styles.labelRow}>
                            <Text style={styles.fieldLabel}>Password</Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)}>
                                <Text style={styles.forgotLink}>Forgot password?</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.inputRow}>
                            <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
                            <TextInput
                                ref={passwordRef}
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textTertiary}
                                value={password}
                                onChangeText={(t) => { setPassword(t); setError(''); }}
                                secureTextEntry={!showPassword}
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={18}
                                    color={colors.textTertiary}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Sign In Button */}
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleLogin}
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
                                <Text style={styles.primaryButtonText}>Sign In</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Register */}
                    <View style={styles.registerRow}>
                        <Text style={styles.registerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                            <Text style={styles.registerLink}>Create one</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xxl,
    },

    // Brand
    brand: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
        ...Shadows.glow,
    },
    appName: {
        fontSize: Typography.sizes.heading,
        color: colors.text,
        fontWeight: Typography.weights.heavy,
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: Typography.sizes.body,
        color: colors.textSecondary,
        marginTop: 4,
    },

    // Card
    card: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: Spacing.xl,
        gap: Spacing.md,
        ...Shadows.medium,
    },
    cardTitle: {
        fontSize: Typography.sizes.title,
        color: colors.text,
        fontWeight: Typography.weights.bold,
    },
    cardSubtitle: {
        fontSize: Typography.sizes.body,
        color: colors.textSecondary,
        marginTop: -Spacing.sm,
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
    fieldGroup: {
        gap: 6,
    },
    fieldLabel: {
        fontSize: Typography.sizes.body,
        color: colors.textSecondary,
        fontWeight: Typography.weights.semibold,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    forgotLink: {
        fontSize: Typography.sizes.body,
        color: Colors.primary,
        fontWeight: Typography.weights.medium,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceLight,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
    },
    inputRowError: {
        borderColor: Colors.error,
    },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: Typography.sizes.bodyLarge,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
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

    // Divider
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        fontSize: Typography.sizes.body,
        color: colors.textTertiary,
    },

    // Register
    registerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    registerText: {
        fontSize: Typography.sizes.body,
        color: colors.textSecondary,
    },
    registerLink: {
        fontSize: Typography.sizes.body,
        color: Colors.primary,
        fontWeight: Typography.weights.bold,
    },
});

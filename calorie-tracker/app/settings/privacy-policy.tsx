/**
 * Privacy Policy
 * 
 * Formal document outlining how user data is collected, used, and protected.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function PrivacyPolicyScreen() {
    const colors = useThemeColors();
    const styles = useAppStyles(createStyles);
    const router = useRouter();

    const sections = [
        {
            title: '1. Information We Collect',
            content: 'We collect information you provide directly to us, such as when you create an account, log meals, or update your health profile. This includes your name, email address, physical measurements (height, weight, etc.), and dietary habits.',
        },
        {
            title: '2. How We Use Information',
            content: 'We use the information we collect to provide, maintain, and improve our services, such as calculating your daily calorie goals and generating personalized body insights. We may also use the information to communicate with you about your account.',
        },
        {
            title: '3. Data Storage & Security',
            content: 'Your data is stored locally on your device and synced with our secure cloud servers (powered by Supabase). We use industry-standard encryption and security measures to protect your personal information.',
        },
        {
            title: '4. Third-Party Sharing',
            content: 'We do not sell your personal data. We only share information with third parties when necessary to provide our services (e.g., cloud hosting) or when required by law. You can opt-out of anonymous usage analytics in your settings.',
        },
        {
            title: '5. Your Rights',
            content: 'You have the right to access, update, or delete your personal data at any time. You can do this directly within the app under the Privacy & Data settings section.',
        },
        {
            title: '6. Changes to This Policy',
            content: 'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.',
        },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.lastUpdated}>Last Updated: April 26, 2026</Text>
                
                <Text style={styles.introText}>
                    At Evolve: The Body Architect, your privacy is our priority. This policy explains how we handle your personal health data and ensure its security.
                </Text>

                {sections.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <Text style={styles.sectionContent}>{section.content}</Text>
                    </View>
                ))}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        If you have any questions about this Privacy Policy, please contact us at privacy@bodyarchitect.app
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.sizes.title,
        fontWeight: Typography.weights.bold,
        color: colors.text,
    },
    scrollContent: {
        padding: Spacing.lg,
    },
    lastUpdated: {
        fontSize: Typography.sizes.caption,
        color: colors.textTertiary,
        marginBottom: Spacing.md,
    },
    introText: {
        fontSize: Typography.sizes.bodyLarge,
        color: colors.text,
        lineHeight: 24,
        marginBottom: Spacing.xl,
        fontWeight: Typography.weights.medium,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: Typography.sizes.bodyLarge,
        fontWeight: Typography.weights.bold,
        color: colors.text,
        marginBottom: Spacing.sm,
    },
    sectionContent: {
        fontSize: Typography.sizes.body,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    footer: {
        marginTop: Spacing.xl,
        padding: Spacing.md,
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    footerText: {
        fontSize: Typography.sizes.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});

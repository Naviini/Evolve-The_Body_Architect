/**
 * Terms of Service
 * 
 * Legal agreement between the user and the app provider.
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

export default function TermsOfServiceScreen() {
    const colors = useThemeColors();
    const styles = useAppStyles(createStyles);
    const router = useRouter();

    const sections = [
        {
            title: '1. Acceptance of Terms',
            content: 'By accessing or using Evolve: The Body Architect, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.',
        },
        {
            title: '2. Health Disclaimer',
            content: 'The information provided by this app is for educational and informational purposes only. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider before starting any new diet or exercise program.',
        },
        {
            title: '3. User Accounts',
            content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 13 years old to use this service.',
        },
        {
            title: '4. Prohibited Conduct',
            content: 'You agree not to use the app for any illegal purposes or to share harmful, offensive, or infringing content. We reserve the right to terminate accounts that violate these terms.',
        },
        {
            title: '5. Intellectual Property',
            content: 'All content, logos, and software within the app are the property of Evolve: The Body Architect and are protected by copyright and other intellectual property laws.',
        },
        {
            title: '6. Limitation of Liability',
            content: 'To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages resulting from your use or inability to use the service.',
        },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Terms of Service</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.lastUpdated}>Last Updated: April 26, 2026</Text>
                
                <Text style={styles.introText}>
                    Welcome to Evolve: The Body Architect. These terms govern your use of our application and services.
                </Text>

                {sections.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <Text style={styles.sectionContent}>{section.content}</Text>
                    </View>
                ))}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        By continuing to use the app, you acknowledge that you have read and understood these Terms of Service.
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

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStyles } from '@/hooks/useAppStyles';

interface AccountScreenProps {
  onBack: () => void;
  onMenuPress?: () => void;
}

export default function AccountScreen({ onBack, onMenuPress }: AccountScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const { user, signOut } = useAuth();

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'FitStore User';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onMenuPress}>
          <Ionicons name="menu" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={26} color="#fff" />
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{user?.email ?? 'guest@fitstore.local'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.item}>
          <Ionicons name="receipt-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.itemText}>View your latest order updates from menu</Text>
        </View>
        <View style={styles.item}>
          <Ionicons name="heart-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.itemText}>Save products using wishlist hearts</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={async () => {
          await signOut();
        }}
      >
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: Typography.sizes.title, fontWeight: Typography.weights.bold, color: colors.text },
  profileCard: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    padding: 18,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: { fontSize: Typography.sizes.subtitle, fontWeight: Typography.weights.heavy, color: colors.text },
  email: { marginTop: 2, fontSize: Typography.sizes.body, color: colors.textSecondary },
  section: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  sectionTitle: { fontSize: Typography.sizes.body, fontWeight: Typography.weights.heavy, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemText: { flex: 1, color: colors.textSecondary, fontSize: Typography.sizes.body },
  signOutButton: {
    marginTop: 16,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.sm,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  signOutText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.bodyLarge },
});

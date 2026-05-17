import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStyles } from '@/hooks/useAppStyles';

interface StoreDrawerProps {
  open: boolean;
  statusText: string;
  onClose: () => void;
  onAccount: () => void;
  onWishlist: () => void;
  onCheckout: () => void;
  onOrderStatus: () => void;
  onOrderHistory: () => void;
  onClearSearch: () => void;
  onResetFilters: () => void;
}

export default function StoreDrawer({
  open,
  statusText,
  onClose,
  onAccount,
  onWishlist,
  onCheckout,
  onOrderStatus,
  onOrderHistory,
  onClearSearch,
  onResetFilters,
}: StoreDrawerProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const drawerX = useRef(new Animated.Value(-320)).current;

  useEffect(() => {
    Animated.timing(drawerX, {
      toValue: open ? 0 : -320,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [drawerX, open]);

  if (!open) return null;

  const iconMuted = colors.textSecondary;

  return (
    <View style={styles.drawerOverlay}>
      <Animated.View
        style={[
          styles.drawerContainer,
          { transform: [{ translateX: drawerX }], paddingTop: insets.top + Spacing.md },
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Menu</Text>
          <TouchableOpacity onPress={onClose} style={styles.drawerCloseBtn}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.drawerItem} onPress={onAccount}>
          <Ionicons name="person-outline" size={18} color={iconMuted} />
          <Text style={styles.drawerItemText}>Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={onWishlist}>
          <Ionicons name="heart-outline" size={18} color={iconMuted} />
          <Text style={styles.drawerItemText}>Wishlist</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={onCheckout}>
          <Ionicons name="cart-outline" size={18} color={iconMuted} />
          <Text style={styles.drawerItemText}>Cart & Checkout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={onOrderStatus}>
          <Ionicons name="time-outline" size={18} color={iconMuted} />
          <Text style={styles.drawerItemText}>Order Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={onOrderHistory}>
          <Ionicons name="receipt-outline" size={18} color={iconMuted} />
          <Text style={styles.drawerItemText}>Order History</Text>
        </TouchableOpacity>

        <View style={styles.drawerDivider} />

        <TouchableOpacity style={styles.drawerItem} onPress={onClearSearch}>
          <Ionicons name="funnel-outline" size={18} color={iconMuted} />
          <Text style={styles.drawerItemText}>Clear Search</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={onResetFilters}>
          <Ionicons name="refresh-outline" size={18} color={iconMuted} />
          <Text style={styles.drawerItemText}>Reset Filters</Text>
        </TouchableOpacity>

        <View style={styles.drawerStatusCard}>
          <Text style={styles.drawerStatusLabel}>Quick Status</Text>
          <Text style={styles.drawerStatusText}>{statusText}</Text>
        </View>
      </Animated.View>
      <Pressable style={styles.drawerBackdropTapZone} onPress={onClose} />
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    drawerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
      flexDirection: 'row',
      zIndex: 40,
    },
    drawerBackdropTapZone: {
      flex: 1,
    },
    drawerContainer: {
      width: 290,
      height: '100%',
      backgroundColor: colors.card,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
      paddingHorizontal: Spacing.md - 2,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    drawerTitle: {
      fontSize: Typography.sizes.title,
      fontWeight: Typography.weights.bold,
      color: colors.text,
    },
    drawerCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: BorderRadius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceLight,
    },
    drawerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: Spacing.sm + 4,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.sm,
      marginBottom: 4,
      backgroundColor: colors.surfaceLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    drawerItemText: {
      color: colors.text,
      fontSize: Typography.sizes.bodyLarge,
      fontWeight: Typography.weights.semibold,
    },
    drawerDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginVertical: Spacing.sm + 4,
    },
    drawerStatusCard: {
      marginTop: Spacing.sm + 2,
      backgroundColor: colors.surfaceLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.sm + 4,
    },
    drawerStatusLabel: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.caption,
      marginBottom: 4,
      fontWeight: Typography.weights.bold,
      textTransform: 'uppercase',
    },
    drawerStatusText: {
      color: colors.text,
      fontSize: Typography.sizes.body,
      fontWeight: Typography.weights.semibold,
    },
  });

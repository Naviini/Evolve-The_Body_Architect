import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  return (
    <View style={styles.drawerOverlay}>
      <Animated.View
        style={[
          styles.drawerContainer,
          { transform: [{ translateX: drawerX }], paddingTop: insets.top + 16 },
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Menu</Text>
          <TouchableOpacity onPress={onClose} style={styles.drawerCloseBtn}>
            <Ionicons name="close" size={20} color="#EAF0FF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.drawerItem} onPress={onAccount}>
          <Ionicons name="person-outline" size={18} color="#BFC8FF" />
          <Text style={styles.drawerItemText}>Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={onWishlist}>
          <Ionicons name="heart-outline" size={18} color="#BFC8FF" />
          <Text style={styles.drawerItemText}>Wishlist</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={onCheckout}>
          <Ionicons name="cart-outline" size={18} color="#BFC8FF" />
          <Text style={styles.drawerItemText}>Cart & Checkout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={onOrderStatus}>
          <Ionicons name="time-outline" size={18} color="#BFC8FF" />
          <Text style={styles.drawerItemText}>Order Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={onOrderHistory}>
          <Ionicons name="receipt-outline" size={18} color="#BFC8FF" />
          <Text style={styles.drawerItemText}>Order History</Text>
        </TouchableOpacity>

        <View style={styles.drawerDivider} />

        <TouchableOpacity style={styles.drawerItem} onPress={onClearSearch}>
          <Ionicons name="funnel-outline" size={18} color="#BFC8FF" />
          <Text style={styles.drawerItemText}>Clear Search</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={onResetFilters}>
          <Ionicons name="refresh-outline" size={18} color="#BFC8FF" />
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

const styles = StyleSheet.create({
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    zIndex: 40,
  },
  drawerBackdropTapZone: {
    flex: 1,
  },
  drawerContainer: {
    width: 290,
    height: '100%',
    backgroundColor: '#111742',
    borderRightWidth: 1,
    borderRightColor: '#3A4186',
    paddingHorizontal: 14,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F5F7FF',
  },
  drawerCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A4186',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C2460',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#1A1F4F',
    borderWidth: 1,
    borderColor: '#2D3475',
  },
  drawerItemText: {
    color: '#EAF0FF',
    fontSize: 15,
    fontWeight: '700',
  },
  drawerDivider: {
    borderTopWidth: 1,
    borderColor: '#2D3475',
    marginVertical: 12,
  },
  drawerStatusCard: {
    marginTop: 10,
    backgroundColor: '#1C2460',
    borderWidth: 1,
    borderColor: '#3A4186',
    borderRadius: 12,
    padding: 12,
  },
  drawerStatusLabel: {
    color: '#BFC8FF',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  drawerStatusText: {
    color: '#F5F7FF',
    fontSize: 14,
    fontWeight: '600',
  },
});

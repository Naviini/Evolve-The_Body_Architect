import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from './CartContext';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStyles } from '@/hooks/useAppStyles';

interface CheckoutScreenProps {
  onBack: () => void;
  onMenuPress?: () => void;
  onPlaceOrder: (details: {
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
    promoCode?: string;
  }) => void;
}

const SHIPPING_FEE = 250;

export default function CheckoutScreen({ onBack, onMenuPress, onPlaceOrder }: CheckoutScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const { cart } = useCart();
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const discount = useMemo(() => {
    if (appliedPromo === 'DISCOUNT5') return Math.round(subtotal * 0.05);
    if (appliedPromo === 'FIT150') return 150;
    return 0;
  }, [appliedPromo, subtotal]);

  const total = Math.max(subtotal + SHIPPING_FEE - discount, 0);
  const tabBarOffset = 84;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onMenuPress}>
          <Ionicons name="menu" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={cart}
        keyExtractor={item => item.product.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + tabBarOffset + 96 },
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  <Ionicons name="location" size={20} color={Colors.primary} />
                  <Text style={styles.cardTitle}>Shipping Address</Text>
                </View>
                <Text style={styles.homePill}>Home</Text>
              </View>
              <Text style={styles.addressText}>No.801A, Fitness Street, Colombo</Text>
              <Text style={styles.phoneText}>Call (+94) 77 555 0118</Text>
            </View>

            <Text style={styles.sectionTitle}>Items</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Image source={{ uri: item.product.image }} style={styles.itemImage} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.itemSub}>Qty: {item.quantity}</Text>
              <Text style={styles.itemPrice}>Rs. {(item.product.price * item.quantity).toLocaleString()}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select Shipping</Text>
              <Text style={styles.seeAll}>See all</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.cardTitle}>Express Delivery</Text>
                  <Text style={styles.muted}>Estimated arrival in 1 - 3 days</Text>
                </View>
                <Text style={styles.amount}>Rs. {SHIPPING_FEE.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Promo Code</Text>
              <Text style={styles.seeAll}>Use DISCOUNT5 / FIT150</Text>
            </View>
            <View style={styles.promoCard}>
              <TextInput
                placeholder="Enter promo code"
                autoCapitalize="characters"
                value={promoInput}
                onChangeText={setPromoInput}
                style={styles.promoInput}
              />
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setAppliedPromo(promoInput.trim().toUpperCase() || null)}
              >
                <Text style={styles.applyText}>Apply</Text>
              </TouchableOpacity>
            </View>
            {appliedPromo ? (
              <Text style={styles.appliedText}>Applied: {appliedPromo}</Text>
            ) : null}

            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.summaryLabel}>Price</Text>
                <Text style={styles.summaryValue}>Rs. {subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>Rs. {SHIPPING_FEE.toLocaleString()}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={styles.summaryValue}>- Rs. {discount.toLocaleString()}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.rowBetween}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>Rs. {total.toLocaleString()}</Text>
              </View>
            </View>
          </>
        }
      />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + tabBarOffset }]}>
        <TouchableOpacity
          style={[styles.checkoutBtn, cart.length === 0 && styles.checkoutBtnDisabled]}
          disabled={cart.length === 0}
          onPress={() => {
            onPlaceOrder({
              subtotal,
              shippingFee: SHIPPING_FEE,
              discount,
              total,
              promoCode: appliedPromo || undefined,
            });
          }}
        >
          <Text style={styles.checkoutText}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
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
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 120 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  promoCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    marginRight: 8,
    color: colors.text,
    fontSize: Typography.sizes.bodyLarge,
  },
  applyBtn: {
    height: 42,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  applyText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  appliedText: { color: Colors.success, fontWeight: Typography.weights.semibold, marginBottom: 10, fontSize: Typography.sizes.body },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: Typography.sizes.bodyLarge, color: colors.text, fontWeight: Typography.weights.semibold },
  homePill: {
    backgroundColor: colors.surfaceLight,
    color: Colors.primary,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    fontSize: 14,
  },
  addressText: { fontSize: Typography.sizes.bodyLarge, color: colors.text, fontWeight: Typography.weights.semibold, marginTop: 10 },
  phoneText: { fontSize: Typography.sizes.body, color: colors.textSecondary, marginTop: 6 },
  sectionTitle: { fontSize: Typography.sizes.subtitle, color: colors.text, fontWeight: Typography.weights.bold, marginTop: 6, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { color: Colors.primary, fontSize: Typography.sizes.body, fontWeight: Typography.weights.semibold },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 8,
  },
  itemImage: { width: 70, height: 70, borderRadius: 12, marginRight: 10 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: Typography.sizes.bodyLarge, color: colors.text, fontWeight: Typography.weights.semibold },
  itemSub: { fontSize: Typography.sizes.body, color: colors.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: 20, color: colors.text, fontWeight: Typography.weights.bold, marginTop: 4 },
  muted: { color: colors.textTertiary, fontSize: Typography.sizes.caption, marginTop: 4 },
  amount: { color: colors.text, fontSize: Typography.sizes.subtitle, fontWeight: Typography.weights.bold },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  summaryLabel: { color: colors.textSecondary, fontSize: Typography.sizes.bodyLarge, marginBottom: 8 },
  summaryValue: { color: colors.textSecondary, fontSize: Typography.sizes.bodyLarge },
  divider: { borderTopWidth: 1, borderColor: colors.border, marginVertical: 8 },
  totalLabel: { color: colors.text, fontSize: Typography.sizes.subtitle, fontWeight: Typography.weights.bold },
  totalValue: { color: colors.text, fontSize: Typography.sizes.heading, fontWeight: Typography.weights.bold },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  checkoutBtn: {
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnDisabled: { backgroundColor: colors.border },
  checkoutText: { color: '#fff', fontSize: Typography.sizes.title, fontWeight: Typography.weights.bold },
});

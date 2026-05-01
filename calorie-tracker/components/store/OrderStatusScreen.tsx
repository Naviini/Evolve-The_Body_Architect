import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStyles } from '@/hooks/useAppStyles';

interface OrderItem {
  id: string;
  status: 'paid' | 'pending' | 'processing';
  total: number;
  date: string;
  items: { name: string; quantity: number }[];
}

interface OrderStatusScreenProps {
  orders: OrderItem[];
  onBack: () => void;
  onMenuPress?: () => void;
  onAdvanceStatus: (orderId: string, currentStatus: 'paid' | 'pending' | 'processing') => void;
}

function getStatusColor(status: 'paid' | 'pending' | 'processing') {
  if (status === 'paid') return '#16a34a';
  if (status === 'processing') return '#2563eb';
  return '#ea580c';
}

function getNextStatus(status: 'paid' | 'pending' | 'processing') {
  if (status === 'pending') return 'processing';
  if (status === 'processing') return 'paid';
  return null;
}

export default function OrderStatusScreen({ orders, onBack, onMenuPress, onAdvanceStatus }: OrderStatusScreenProps) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Status</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onMenuPress}>
          <Ionicons name="menu" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No orders found.</Text>
            <Text style={styles.emptySubtitle}>Place an order from checkout to start tracking.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const next = getNextStatus(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
                <Text style={[styles.statusPill, { color: getStatusColor(item.status) }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.total}>Rs. {item.total.toLocaleString()}</Text>
              <Text style={styles.items}>
                {item.items.slice(0, 2).map(it => `${it.name} x${it.quantity}`).join(', ')}
              </Text>
              {next ? (
                <TouchableOpacity style={styles.advanceBtn} onPress={() => onAdvanceStatus(item.id, item.status)}>
                  <Text style={styles.advanceText}>Mark as {next}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.doneText}>Completed</Text>
              )}
            </View>
          );
        }}
      />
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
  list: { padding: Spacing.md, paddingBottom: Spacing.lg },
  emptyWrap: {
    marginTop: 80,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.md,
  },
  emptyTitle: { fontSize: Typography.sizes.bodyLarge, fontWeight: Typography.weights.bold, color: colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: Typography.sizes.body, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { color: colors.text, fontWeight: Typography.weights.bold, fontSize: Typography.sizes.body },
  statusPill: { fontWeight: Typography.weights.heavy, fontSize: Typography.sizes.caption },
  date: { color: colors.textSecondary, fontSize: Typography.sizes.caption, marginTop: 4 },
  total: { color: colors.text, fontSize: Typography.sizes.title, fontWeight: Typography.weights.heavy, marginTop: 6 },
  items: { color: colors.textSecondary, fontSize: Typography.sizes.caption, marginTop: 2 },
  advanceBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    height: 36,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanceText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.caption },
  doneText: { marginTop: 10, color: Colors.success, fontWeight: Typography.weights.bold, fontSize: Typography.sizes.caption },
});

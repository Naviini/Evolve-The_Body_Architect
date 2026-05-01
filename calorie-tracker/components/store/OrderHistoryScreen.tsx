import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useOrders } from './OrderContext';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStyles } from '@/hooks/useAppStyles';

export default function OrderHistoryScreen({ onBack, onMenuPress }: { onBack?: () => void; onMenuPress?: () => void }) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const { orders } = useOrders();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.header}>Order History</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onMenuPress}>
          <Ionicons name="menu" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
      {orders.length === 0 ? (
        <Text style={styles.empty}>No orders yet.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.order}>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.status}>
                {item.status === 'paid' ? 'Paid' : item.status === 'processing' ? 'Processing' : 'Pending'}
              </Text>
              <FlatList
                data={item.items}
                keyExtractor={i => i.name}
                renderItem={({ item: prod }) => (
                  <Text style={styles.item}>{prod.name} x{prod.quantity} - Rs. {prod.price.toLocaleString()}</Text>
                )}
              />
              <Text style={styles.total}>Total: Rs. {item.total.toLocaleString()}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
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
  header: { fontSize: Typography.sizes.title, fontWeight: Typography.weights.bold, color: colors.text },
  empty: { fontSize: Typography.sizes.bodyLarge, color: colors.textSecondary, marginVertical: 32 },
  order: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  date: { fontSize: Typography.sizes.caption, color: colors.textSecondary },
  status: { fontWeight: Typography.weights.bold, marginBottom: 8, color: Colors.primary },
  item: { fontSize: Typography.sizes.bodyLarge, color: colors.text },
  total: { fontWeight: Typography.weights.bold, marginTop: 8, color: colors.text },
});

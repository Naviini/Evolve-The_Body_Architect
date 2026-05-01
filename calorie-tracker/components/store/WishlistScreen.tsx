import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StoreProduct } from './products';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStyles } from '@/hooks/useAppStyles';

interface WishlistScreenProps {
  items: StoreProduct[];
  onBack: () => void;
  onMenuPress?: () => void;
  onRemove: (productId: string) => void;
  onAddToCart: (product: StoreProduct) => void;
}

export default function WishlistScreen({ items, onBack, onMenuPress, onRemove, onAddToCart }: WishlistScreenProps) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wishlist</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onMenuPress}>
          <Ionicons name="menu" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No wishlist items yet.</Text>
            <Text style={styles.emptySubtitle}>Add favorite products from the store cards.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.price}>Rs. {item.price.toLocaleString()}</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.addBtn} onPress={() => onAddToCart(item)}>
                  <Text style={styles.addBtnText}>Add to Cart</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(item.id)}>
                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
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
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 10,
  },
  image: { width: 88, height: 88, borderRadius: BorderRadius.sm, marginRight: 10 },
  info: { flex: 1 },
  name: { fontSize: Typography.sizes.bodyLarge, fontWeight: Typography.weights.bold, color: colors.text },
  category: { fontSize: Typography.sizes.caption, color: colors.textSecondary, marginTop: 2 },
  price: { fontSize: Typography.sizes.title, fontWeight: Typography.weights.heavy, color: colors.text, marginTop: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    height: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.body },
  removeBtn: {
    marginLeft: 8,
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});

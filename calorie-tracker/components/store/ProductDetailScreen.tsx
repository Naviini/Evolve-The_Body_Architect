import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoreProduct } from './products';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStyles } from '@/hooks/useAppStyles';

interface ProductDetailScreenProps {
  product: StoreProduct;
  onBack: () => void;
  onAddToCart: (product: StoreProduct, quantity: number) => void;
  onCheckoutNow: (product: StoreProduct, quantity: number) => void;
}

const galleryFallback = (image?: string) => [image, image, image].filter(Boolean) as string[];

export default function ProductDetailScreen({
  product,
  onBack,
  onAddToCart,
  onCheckoutNow,
}: ProductDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('#808080');
  const [isSaved, setIsSaved] = useState(false);

  const gallery = useMemo(() => galleryFallback(product.image), [product.image]);
  const oldPrice = product.previousPrice;
  const imageWidth = Math.max(width - 36, 280);
  const tabBarOffset = 84;

  const increase = () => setQuantity(prev => prev + 1);
  const decrease = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Detail</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setIsSaved(prev => !prev)}>
          <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={20} color={isSaved ? '#ff5f45' : colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + tabBarOffset + 94 },
        ]}
      >
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={event => {
            const width = event.nativeEvent.layoutMeasurement.width;
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setActiveImage(index);
          }}
          style={styles.imagePager}
        >
          {gallery.map((src, index) => (
            <Image
              key={`${src}-${index}`}
              source={{ uri: src }}
              style={[styles.image, { width: imageWidth, height: Math.min(imageWidth * 0.78, 290) }]}
            />
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {gallery.map((_, index) => (
            <View key={String(index)} style={[styles.dot, activeImage === index && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={styles.name}>{product.name}</Text>
          <Ionicons name="heart-outline" size={22} color={colors.textTertiary} />
        </View>

        <View style={styles.priceRow}>
          {oldPrice ? <Text style={styles.oldPrice}>Rs. {oldPrice.toLocaleString()}</Text> : null}
          <Text style={styles.price}>Rs. {product.price.toLocaleString()}</Text>
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {product.description || 'No description available for this product right now.'}
        </Text>

        <Text style={styles.sectionTitle}>Type</Text>
        <Text style={styles.typeText}>Color: Space Grey</Text>
        <View style={styles.colorRow}>
          {['#7A8086', '#CBD5E1', '#111827'].map(color => (
            <TouchableOpacity
              key={color}
              style={[styles.colorChip, selectedColor === color && styles.colorChipActive]}
              onPress={() => setSelectedColor(color)}
            >
              <View style={[styles.colorSwatch, { backgroundColor: color }]} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quantity</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={decrease}>
            <Ionicons name="remove" size={16} color={colors.text} />
          </TouchableOpacity>
          <TextInput style={styles.qtyInput} editable={false} value={String(quantity)} />
          <TouchableOpacity style={styles.qtyBtn} onPress={increase}>
            <Ionicons name="add" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + tabBarOffset, bottom: 0 }]}>
        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={() => onAddToCart(product, quantity)}
        >
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => onCheckoutNow(product, quantity)}
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
  content: { paddingHorizontal: Spacing.md },
  imagePager: { borderRadius: 20, overflow: 'hidden' },
  image: { borderRadius: BorderRadius.md, backgroundColor: colors.surface },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: '#ff5f45' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: Typography.sizes.title, fontWeight: Typography.weights.bold, color: colors.text, flex: 1, paddingRight: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6, marginBottom: 16 },
  oldPrice: { fontSize: Typography.sizes.bodyLarge, color: colors.textTertiary, textDecorationLine: 'line-through' },
  price: { fontSize: 33, fontWeight: Typography.weights.bold, color: colors.text },
  sectionTitle: { fontSize: Typography.sizes.subtitle, color: colors.text, fontWeight: Typography.weights.bold, marginBottom: 8, marginTop: 8 },
  description: { color: colors.textSecondary, fontSize: Typography.sizes.bodyLarge, lineHeight: 22, marginBottom: 8 },
  typeText: { color: colors.textSecondary, fontSize: Typography.sizes.bodyLarge, marginBottom: 10 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  colorChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  colorChipActive: {
    borderColor: '#ff5f45',
    borderWidth: 2,
  },
  colorSwatch: { width: 30, height: 30, borderRadius: 15 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    width: 64,
    height: 40,
    marginHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  addToCartBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: colors.surface,
  },
  addToCartText: { color: Colors.primary, fontWeight: Typography.weights.bold, fontSize: Typography.sizes.bodyLarge },
  checkoutBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  checkoutText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.bodyLarge },
});

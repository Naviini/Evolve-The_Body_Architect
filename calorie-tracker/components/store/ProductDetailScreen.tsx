import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  useWindowDimensions,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoreProduct } from './products';
import { storeProductImageSource } from './productImages';
import { BorderRadius, Colors, Shadows, Spacing, Typography, TAB_SCROLL_BOTTOM_GAP } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStyles } from '@/hooks/useAppStyles';
import { HeaderIconButton } from '@/components/ui/header-icon-button';

function titleCaseTag(tag: string): string {
  return tag
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => (word.length ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

/** Catalogue uses plural category ids; UI shows shorter singular where preferred */
function categoryDisplayLabel(category: string): string {
  return category === 'Supplements' ? 'Supplement' : category;
}

/** Extra copy derived from catalogue fields so every SKU feels informative. */
function buildAboutParagraphs(product: StoreProduct): string[] {
  const base = product.description?.trim();
  const cat = product.category;
  let context = '';
  if (cat === 'Supplements' || cat === 'Health') {
    context =
      'Formulated for people who train regularly or want consistent daily support. Use as directed on the label and talk to your healthcare provider if you have medical conditions or take medication.';
  } else if (cat === 'Food & Drink') {
    context =
      'A practical addition to meals and snacks when you want better macros without guesswork. Check the label for full ingredients and allergens before use.';
  } else if (cat === 'Gear' || cat === 'Accessories') {
    context =
      'Built for repeated workouts—compact enough for home setups and resilient enough for regular use. Inspect before each session and follow care instructions to extend lifespan.';
  } else if (cat === 'Body Care') {
    context =
      'Ideal post-workout or daily care to help skin feel refreshed. Patch test first if you have sensitive skin.';
  } else if (cat === 'Healthy Meals') {
    context =
      'Prepared by an independent partner kitchen for FitStore. Meals are chilled for transit—follow reheating guidance on the pack. Macros are indicative; allergens are flagged—always match with your onboarding allergies and coach notes.';
  }
  const fitstore =
    'Every FitStore item is curated for strength, recovery, and everyday wellness—with clear pricing and simple checkout.';
  return [base, context, fitstore].filter((p): p is string => Boolean(p && p.length > 0));
}

const TAG_FEATURE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  protein: 'barbell-outline',
  muscle: 'fitness-outline',
  recovery: 'medkit-outline',
  strength: 'flash-outline',
  hydration: 'water-outline',
  yoga: 'body-outline',
  gear: 'construct-outline',
  healthy: 'leaf-outline',
  restaurant: 'restaurant-outline',
  delivery: 'bicycle-outline',
};

function featureIconForTag(tag: string): React.ComponentProps<typeof Ionicons>['name'] {
  const key = tag.toLowerCase().replace(/\s+/g, '-');
  return TAG_FEATURE_ICONS[key] ?? 'checkmark-circle-outline';
}

interface ProductDetailScreenProps {
  product: StoreProduct;
  onBack: () => void;
  onMenuPress?: () => void;
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
  onAddToCart: (product: StoreProduct, quantity: number) => void;
  onCheckoutNow: (product: StoreProduct, quantity: number) => void;
}

export default function ProductDetailScreen({
  product,
  onBack,
  onMenuPress,
  isWishlisted = false,
  onToggleWishlist,
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

  const gallery = useMemo((): ImageSourcePropType[] => {
    const main = storeProductImageSource(product.id, product.image);
    return main ? [main, main, main] : [];
  }, [product.id, product.image]);
  const aboutParagraphs = useMemo(() => buildAboutParagraphs(product), [product]);
  const highlightTags = useMemo(() => [...new Set(product.tags ?? [])].slice(0, 6), [product.tags]);
  const reviewCountEstimate = useMemo(() => {
    const digits = parseInt(product.id.replace(/\D/g, '') || '42', 10);
    return 180 + (digits % 380);
  }, [product.id]);
  const nutrition = product.nutrition;
  const hasNutritionGrid = Boolean(
    nutrition &&
      (nutrition.calories != null ||
        nutrition.protein != null ||
        nutrition.carbs != null ||
        nutrition.fat != null ||
        (nutrition.allergens && nutrition.allergens.length > 0)),
  );

  const oldPrice = product.previousPrice;
  const imageWidth = Math.max(width - Spacing.md * 2, 280);
  /** Taller frame + `contain` so the full product stays visible (no aggressive zoom/crop). */
  const imageFrameHeight = Math.min(Math.round(imageWidth * 0.92), 340);

  const increase = () => setQuantity(prev => prev + 1);
  const decrease = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Detail</Text>
        <HeaderIconButton
          icon="menu"
          iconSize={22}
          onPress={() => onMenuPress?.()}
          accessibilityLabel="Open menu"
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + TAB_SCROLL_BOTTOM_GAP },
        ]}
      >
        {gallery.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={event => {
              const pageW = event.nativeEvent.layoutMeasurement.width;
              const index = Math.round(event.nativeEvent.contentOffset.x / pageW);
              setActiveImage(index);
            }}
            style={styles.imagePager}
          >
            {gallery.map((src, index) => (
              <View
                key={`img-${index}`}
                style={[styles.imageFrame, { width: imageWidth, height: imageFrameHeight }]}
              >
                <Image
                  source={src}
                  style={styles.imageContained}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.imageFrame, styles.galleryPlaceholder, { width: imageWidth, height: imageFrameHeight }]}>
            <Ionicons name="image-outline" size={52} color={colors.textTertiary} />
          </View>
        )}

        {gallery.length > 0 ? (
          <View style={styles.dots}>
            {gallery.map((_, index) => (
              <View key={String(index)} style={[styles.dot, activeImage === index && styles.dotActive]} />
            ))}
          </View>
        ) : null}

        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={styles.name}>{product.name}</Text>
          <TouchableOpacity
            style={styles.titleHeartBtn}
            onPress={() => onToggleWishlist?.()}
            accessibilityLabel={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={24}
              color={isWishlisted ? Colors.protein : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.priceRow}>
          {oldPrice ? <Text style={styles.oldPrice}>Rs. {oldPrice.toLocaleString()}</Text> : null}
          <Text style={styles.price}>Rs. {product.price.toLocaleString()}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{categoryDisplayLabel(product.category)}</Text>
          </View>
          {product.onSale ? (
            <View style={[styles.statusPill, styles.dealPill]}>
              <Text style={styles.statusPillText}>On sale</Text>
            </View>
          ) : null}
          {product.isNew ? (
            <View style={[styles.statusPill, styles.newPill]}>
              <Text style={styles.statusPillText}>New</Text>
            </View>
          ) : null}
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={14} color={Colors.warning} />
            <Text style={styles.ratingPillText}>
              {(product.rating ?? 4.6).toFixed(1)}
            </Text>
            <Text style={styles.reviewHintText}>({reviewCountEstimate}+ reviews)</Text>
          </View>
        </View>

        {product.partnerName ? (
          <View style={styles.partnerCard}>
            <Ionicons name="storefront-outline" size={22} color={Colors.primary} />
            <View style={styles.partnerTextCol}>
              <Text style={styles.partnerLabel}>Partner kitchen</Text>
              <Text style={styles.partnerNameText}>{product.partnerName}</Text>
              <Text style={styles.partnerHint}>Fulfilled as part of your FitStore meal delivery lineup.</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Variant</Text>
        <Text style={styles.typeText}>Pick a finish (cosmetic).</Text>
        <View style={styles.colorRow}>
          {[
            { hex: '#7A8086' },
            { hex: '#CBD5E1' },
            { hex: '#111827' },
          ].map(({ hex }) => (
            <TouchableOpacity
              key={hex}
              style={[styles.colorChip, selectedColor === hex && styles.colorChipActive]}
              onPress={() => setSelectedColor(hex)}
            >
              <View style={[styles.colorSwatch, { backgroundColor: hex }]} />
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

        <View style={styles.ctaRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.addToCartBtn}
            onPress={() => onAddToCart(product, quantity)}
          >
            <Text style={styles.addToCartText} numberOfLines={1}>
              Add to Cart
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.checkoutBtn}
            onPress={() => onCheckoutNow(product, quantity)}
          >
            <Text style={styles.checkoutText} numberOfLines={1}>
              Checkout
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>About this product</Text>
        {aboutParagraphs.map((para, idx) => (
          <Text key={`about-${idx}`} style={[styles.description, idx > 0 && styles.aboutFollow]}>
            {para}
          </Text>
        ))}

        {highlightTags.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Highlights</Text>
            <View style={styles.featureList}>
              {highlightTags.map(tag => (
                <View key={tag} style={styles.featureRow}>
                  <Ionicons
                    name={featureIconForTag(tag)}
                    size={18}
                    color={Colors.primary}
                    style={styles.featureIcon}
                  />
                  <Text style={styles.featureText}>{titleCaseTag(tag)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {hasNutritionGrid ? (
          <>
            <Text style={styles.sectionTitle}>Nutrition & info</Text>
            <View style={styles.specCard}>
              {nutrition!.calories != null ? (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Calories (per serving)</Text>
                  <Text style={styles.specValue}>{nutrition!.calories} kcal</Text>
                </View>
              ) : null}
              {nutrition!.protein != null ? (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Protein</Text>
                  <Text style={styles.specValue}>{nutrition!.protein} g</Text>
                </View>
              ) : null}
              {nutrition!.carbs != null ? (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Carbs</Text>
                  <Text style={styles.specValue}>{nutrition!.carbs} g</Text>
                </View>
              ) : null}
              {nutrition!.fat != null ? (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Fat</Text>
                  <Text style={styles.specValue}>{nutrition!.fat} g</Text>
                </View>
              ) : null}
              {nutrition!.allergens && nutrition!.allergens.length > 0 ? (
                <View style={styles.allergenBanner}>
                  <Ionicons name="warning-outline" size={18} color={Colors.warning} />
                  <Text style={styles.allergenText}>
                    Contains: {nutrition!.allergens.map(a => titleCaseTag(a)).join(', ')}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Why shop FitStore?</Text>
        <View style={styles.trustCard}>
          <View style={styles.trustRow}>
            <Ionicons name="car-outline" size={22} color={Colors.primary} />
            <View style={styles.trustCopy}>
              <Text style={styles.trustTitle}>Fast delivery</Text>
              <Text style={styles.trustSub}>Track-friendly dispatch to your fitness profile address.</Text>
            </View>
          </View>
          <View style={styles.trustRow}>
            <Ionicons name="shield-checkmark-outline" size={22} color={Colors.success} />
            <View style={styles.trustCopy}>
              <Text style={styles.trustTitle}>Quality-first catalogue</Text>
              <Text style={styles.trustSub}>Gear and nutrition picked for active lifestyles.</Text>
            </View>
          </View>
          <View style={styles.trustRow}>
            <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
            <View style={styles.trustCopy}>
              <Text style={styles.trustTitle}>Simple returns window</Text>
              <Text style={styles.trustSub}>Eligible items — see drawer → Account for details.</Text>
            </View>
          </View>
        </View>

      </ScrollView>
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    ...Shadows.card,
  },
  headerTitle: { fontSize: Typography.sizes.title, fontWeight: Typography.weights.bold, color: colors.text },
  content: { paddingHorizontal: Spacing.md },
  imagePager: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  imageFrame: {
    borderRadius: BorderRadius.md,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
  },
  imageContained: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: Colors.protein },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleHeartBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  colorChipActive: {
    borderColor: Colors.protein,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    textAlign: 'center',
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.surfaceLight,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  addToCartBtn: {
    flex: 1,
    flexBasis: 0,
    minHeight: 48,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth + 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.primary}26`,
  },
  addToCartText: {
    color: Colors.primaryLight,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.bodyLarge,
    textAlign: 'center',
  },
  checkoutBtn: {
    flex: 1,
    flexBasis: 0,
    minHeight: 48,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth + 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutText: {
    color: '#fff',
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.bodyLarge,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.round,
    backgroundColor: colors.surfaceLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  categoryPillText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: colors.text,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.round,
  },
  dealPill: {
    backgroundColor: `${Colors.error}26`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${Colors.error}59`,
  },
  newPill: {
    backgroundColor: `${Colors.success}22`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${Colors.success}59`,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: Typography.weights.bold,
    color: colors.text,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.round,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...Shadows.small,
  },
  ratingPillText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.bold,
    color: colors.text,
  },
  reviewHintText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primary + '40',
    backgroundColor: colors.card,
    marginBottom: 12,
    ...Shadows.card,
  },
  partnerTextCol: { flex: 1 },
  partnerLabel: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  partnerNameText: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.bold,
    color: colors.text,
  },
  partnerHint: {
    fontSize: Typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  aboutFollow: {
    marginTop: 10,
  },
  featureList: {
    gap: 10,
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  featureIcon: { marginTop: 1 },
  featureText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: Typography.sizes.body,
    lineHeight: 20,
    fontWeight: Typography.weights.medium,
  },
  specCard: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: Spacing.sm,
    marginBottom: 4,
    gap: 2,
    ...Shadows.card,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  specLabel: {
    fontSize: Typography.sizes.body,
    color: colors.textSecondary,
  },
  specValue: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    color: colors.text,
  },
  allergenBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: `${Colors.warning}22`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${Colors.warning}59`,
  },
  allergenText: {
    flex: 1,
    fontSize: Typography.sizes.caption,
    lineHeight: 18,
    color: colors.text,
    fontWeight: Typography.weights.semibold,
  },
  trustCard: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: 4,
    ...Shadows.card,
  },
  trustRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  trustCopy: { flex: 1 },
  trustTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  trustSub: {
    fontSize: Typography.sizes.caption,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});

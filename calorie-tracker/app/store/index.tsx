import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { CartProvider, useCart } from '../../components/store/CartContext';
import { OrderProvider, useOrders } from '../../components/store/OrderContext';
import OrderHistoryScreen from '../../components/store/OrderHistoryScreen';
import ProductDetailScreen from '../../components/store/ProductDetailScreen';
import CheckoutScreen from '../../components/store/CheckoutScreen';
import WishlistScreen from '../../components/store/WishlistScreen';
import OrderStatusScreen from '../../components/store/OrderStatusScreen';
import AccountScreen from '../../components/store/AccountScreen';
import StoreDrawer from '../../components/store/StoreDrawer';
import { StoreProduct } from '../../components/store/products';
import { getPersonalizedRecommendations } from '../../src/services/recommendationService';
import { getAllProducts } from '../../src/services/storeService';
import { getDailyLog, getStoreWishlistItems, getUserHealthProfileForProcessing, initDatabase, removeStoreWishlistItem, upsertStoreWishlistItem } from '../../src/lib/database';
import { useAuth } from '../../src/contexts/AuthContext';

const categories = [
  { id: 'all', name: 'All', icon: 'https://img.icons8.com/color/96/shop.png' },
  { id: 'Supplements', name: 'Supplements', icon: 'https://img.icons8.com/color/96/pill.png' },
  { id: 'Food & Drink', name: 'Food', icon: 'https://img.icons8.com/color/96/salad.png' },
  { id: 'Gear', name: 'Gear', icon: 'https://img.icons8.com/color/96/dumbbell.png' },
  { id: 'Accessories', name: 'Accessories', icon: 'https://img.icons8.com/color/96/water-bottle.png' },
  { id: 'Health', name: 'Health', icon: 'https://img.icons8.com/color/96/heart-with-pulse.png' },
  { id: 'Body Care', name: 'Body Care', icon: 'https://img.icons8.com/color/96/cream-tube.png' },
];

const tabs = ['For You', 'Deals', 'Top Rated', 'New'] as const;

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

function StoreScreenInner() {
  const params = useLocalSearchParams<{ screen?: string }>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const { user } = useAuth();
  const { addToCart, cart, clearCart } = useCart();
  const { addOrder, orders, updateOrderStatus } = useOrders();
  const activeUserId = user?.id || 'guest-store-user';

  const [recommended, setRecommended] = useState<StoreProduct[]>([]);
  const [catalog, setCatalog] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenMode, setScreenMode] = useState<'store' | 'details' | 'checkout' | 'orders' | 'wishlist' | 'status' | 'account'>('store');
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [wishlist, setWishlist] = useState<StoreProduct[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('For You');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderStatusText, setOrderStatusText] = useState('No active orders');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allProducts = await getAllProducts();
        setCatalog(allProducts);

        if (!user) {
          setLoading(false);
          return;
        }

        await initDatabase();
        const onboarding = await getUserHealthProfileForProcessing(user.id);
        const today = new Date().toISOString().split('T')[0];
        const daily = await getDailyLog(user.id, today);
        if (onboarding) {
          const recDaily = {
            consumedFoods: daily?.consumed_foods || [],
            recentWorkouts: daily?.recent_workouts || [],
            todayCalories: daily?.total_calories || 0,
          };
          setRecommended(getPersonalizedRecommendations(onboarding, recDaily, allProducts));
        } else {
          setRecommended([]);
        }
      } catch (error) {
        console.error('Store data init error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const loadWishlist = async () => {
      try {
        await initDatabase();
        const data = await getStoreWishlistItems(activeUserId);
        if (!mounted) return;
        setWishlist(data.map(item => item.product));
      } catch (error) {
        console.error('Failed to load wishlist:', error);
      }
    };

    loadWishlist();
    return () => {
      mounted = false;
    };
  }, [activeUserId]);

  useEffect(() => {
    const target = typeof params.screen === 'string' ? params.screen : undefined;
    if (!target) return;

    if (target === 'wishlist') setScreenMode('wishlist');
    else if (target === 'checkout') setScreenMode('checkout');
    else if (target === 'status') setScreenMode('status');
    else if (target === 'orders') setScreenMode('orders');
    else if (target === 'account') setScreenMode('account');
    else setScreenMode('store');
  }, [params.screen]);

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const filteredProducts = useMemo(() => {
    let list = [...catalog];

    if (activeTab === 'For You' && recommended.length > 0) {
      const recommendedIds = new Set(recommended.map(product => product.id));
      list = list.filter(product => recommendedIds.has(product.id));
    } else if (activeTab === 'Deals') {
      list = list.filter(product => product.onSale);
    } else if (activeTab === 'Top Rated') {
      list = list
        .filter(product => (product.rating ?? 0) >= 4.6)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (activeTab === 'New') {
      list = list.filter(product => product.isNew);
    }

    if (selectedCategory !== 'all') {
      list = list.filter(product => product.category === selectedCategory);
    }

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter(product => {
        const inName = product.name.toLowerCase().includes(query);
        const inCategory = product.category.toLowerCase().includes(query);
        const inTags = product.tags?.some(tag => tag.toLowerCase().includes(query));
        return inName || inCategory || inTags;
      });
    }

    return list;
  }, [activeTab, recommended, search, selectedCategory]);

  const topDeal = useMemo(
    () => catalog.find(product => product.onSale && product.previousPrice),
    [catalog]
  );

  const handlePlaceOrder = async ({
    subtotal,
    shippingFee,
    discount,
    total,
    promoCode,
  }: {
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
    promoCode?: string;
  }) => {
    if (cart.length === 0) {
      return;
    }

    const order = {
      id: Date.now().toString(),
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        product: item.product,
      })),
      subtotal,
      shippingFee,
      discount,
      promoCode,
      total,
      date: new Date().toLocaleString(),
      status: 'paid' as const,
    };

    await addOrder(order);
    clearCart();
    setScreenMode('store');
    alert('Payment successful! Order placed.');
  };

  const openProductDetails = (product: StoreProduct) => {
    setSelectedProduct(product);
    setScreenMode('details');
  };

  const handleCheckoutNowFromDetails = (product: StoreProduct, quantity: number) => {
    addToCart(product, quantity);
    setScreenMode('checkout');
  };

  const wishlistIdSet = useMemo(
    () => new Set(wishlist.map(item => item.id)),
    [wishlist]
  );

  const toggleWishlist = async (product: StoreProduct) => {
    const isSaved = wishlistIdSet.has(product.id);
    if (isSaved) {
      setWishlist(prev => prev.filter(item => item.id !== product.id));
      await removeStoreWishlistItem(activeUserId, product.id);
      return;
    }

    setWishlist(prev => [product, ...prev]);
    await upsertStoreWishlistItem(activeUserId, product);
  };

  const closeMenu = () => setMenuOpen(false);

  const openCheckoutFromMenu = () => {
    setScreenMode('checkout');
    closeMenu();
  };

  const openOrdersFromMenu = () => {
    setScreenMode('orders');
    closeMenu();
  };

  const openWishlistFromMenu = () => {
    setScreenMode('wishlist');
    closeMenu();
  };

  const openAccountFromMenu = () => {
    setScreenMode('account');
    closeMenu();
  };

  const openOrderStatusFromMenu = () => {
    const status = orders.length > 0 ? `Latest order: ${orders[0].status}` : 'No active orders';
    setOrderStatusText(status);
    setScreenMode('status');
    closeMenu();
  };

  const advanceOrderStatus = async (
    orderId: string,
    status: 'paid' | 'pending' | 'processing'
  ) => {
    if (status === 'pending') {
      await updateOrderStatus(orderId, 'processing');
      return;
    }
    if (status === 'processing') {
      await updateOrderStatus(orderId, 'paid');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loaderText}>Loading your personalized store...</Text>
      </View>
    );
  }

  if (screenMode === 'details' && selectedProduct) {
    return (
      <ProductDetailScreen
        product={selectedProduct}
        onBack={() => setScreenMode('store')}
        onAddToCart={(product, quantity) => addToCart(product, quantity)}
        onCheckoutNow={handleCheckoutNowFromDetails}
      />
    );
  }

  if (screenMode === 'checkout') {
    return (
      <>
        <CheckoutScreen
          onBack={() => setScreenMode('store')}
          onMenuPress={() => setMenuOpen(true)}
          onPlaceOrder={handlePlaceOrder}
        />
        <StoreDrawer
          open={menuOpen}
          statusText={orderStatusText}
          onClose={closeMenu}
          onAccount={openAccountFromMenu}
          onWishlist={openWishlistFromMenu}
          onCheckout={openCheckoutFromMenu}
          onOrderStatus={openOrderStatusFromMenu}
          onOrderHistory={openOrdersFromMenu}
          onClearSearch={() => { setSearch(''); closeMenu(); }}
          onResetFilters={() => { setActiveTab('For You'); setSelectedCategory('all'); closeMenu(); }}
        />
      </>
    );
  }

  if (screenMode === 'orders') {
    return (
      <>
        <OrderHistoryScreen onBack={() => setScreenMode('store')} onMenuPress={() => setMenuOpen(true)} />
        <StoreDrawer
          open={menuOpen}
          statusText={orderStatusText}
          onClose={closeMenu}
          onAccount={openAccountFromMenu}
          onWishlist={openWishlistFromMenu}
          onCheckout={openCheckoutFromMenu}
          onOrderStatus={openOrderStatusFromMenu}
          onOrderHistory={openOrdersFromMenu}
          onClearSearch={() => { setSearch(''); closeMenu(); }}
          onResetFilters={() => { setActiveTab('For You'); setSelectedCategory('all'); closeMenu(); }}
        />
      </>
    );
  }

  if (screenMode === 'wishlist') {
    return (
      <>
        <WishlistScreen
          items={wishlist}
          onBack={() => setScreenMode('store')}
          onMenuPress={() => setMenuOpen(true)}
          onRemove={async (productId) => {
            setWishlist(prev => prev.filter(item => item.id !== productId));
            await removeStoreWishlistItem(activeUserId, productId);
          }}
          onAddToCart={(product) => addToCart(product, 1)}
        />
        <StoreDrawer
          open={menuOpen}
          statusText={orderStatusText}
          onClose={closeMenu}
          onAccount={openAccountFromMenu}
          onWishlist={openWishlistFromMenu}
          onCheckout={openCheckoutFromMenu}
          onOrderStatus={openOrderStatusFromMenu}
          onOrderHistory={openOrdersFromMenu}
          onClearSearch={() => { setSearch(''); closeMenu(); }}
          onResetFilters={() => { setActiveTab('For You'); setSelectedCategory('all'); closeMenu(); }}
        />
      </>
    );
  }

  if (screenMode === 'status') {
    return (
      <>
        <OrderStatusScreen
          orders={orders}
          onBack={() => setScreenMode('store')}
          onMenuPress={() => setMenuOpen(true)}
          onAdvanceStatus={advanceOrderStatus}
        />
        <StoreDrawer
          open={menuOpen}
          statusText={orderStatusText}
          onClose={closeMenu}
          onAccount={openAccountFromMenu}
          onWishlist={openWishlistFromMenu}
          onCheckout={openCheckoutFromMenu}
          onOrderStatus={openOrderStatusFromMenu}
          onOrderHistory={openOrdersFromMenu}
          onClearSearch={() => { setSearch(''); closeMenu(); }}
          onResetFilters={() => { setActiveTab('For You'); setSelectedCategory('all'); closeMenu(); }}
        />
      </>
    );
  }

  if (screenMode === 'account') {
    return (
      <>
        <AccountScreen onBack={() => setScreenMode('store')} onMenuPress={() => setMenuOpen(true)} />
        <StoreDrawer
          open={menuOpen}
          statusText={orderStatusText}
          onClose={closeMenu}
          onAccount={openAccountFromMenu}
          onWishlist={openWishlistFromMenu}
          onCheckout={openCheckoutFromMenu}
          onOrderStatus={openOrderStatusFromMenu}
          onOrderHistory={openOrdersFromMenu}
          onClearSearch={() => { setSearch(''); closeMenu(); }}
          onResetFilters={() => { setActiveTab('For You'); setSelectedCategory('all'); closeMenu(); }}
        />
      </>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
      >
        <View style={styles.topBar}>
          <Text style={styles.logo}>FitStore</Text>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setMenuOpen(true)}>
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search healthy foods, gear, supplements..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.searchAction}>
            <Ionicons name="camera-outline" size={18} color={colors.buttonText} />
          </TouchableOpacity>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.locationText}>Delivering to your fitness profile</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map(category => {
            const isActive = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  { backgroundColor: isActive ? Colors.primary : colors.surface },
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <View style={styles.categoryIconWrap}>
                  <Image source={{ uri: category.icon }} style={styles.categoryIcon} />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.categoryLabel,
                    { color: isActive ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {topDeal ? (
          <View style={styles.bannerCard}>
            <Image source={{ uri: topDeal.image }} style={styles.bannerImage} />
            <View style={styles.bannerInfo}>
              <Text style={styles.bannerTitle}>New Arrivals</Text>
              <Text style={styles.bannerSubtitle}>
                {formatCurrency(topDeal.price)}
                {topDeal.previousPrice ? `  (was ${formatCurrency(topDeal.previousPrice)})` : ''}
              </Text>
              <TouchableOpacity
                style={styles.bannerButton}
                onPress={() => openProductDetails(topDeal)}
              >
                <Text style={styles.bannerButtonText}>Shop Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {tabs.map(tab => {
            const isActive = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabChip,
                  { backgroundColor: isActive ? colors.primary : colors.card },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, { color: isActive ? '#FFFFFF' : colors.textSecondary }]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Flash Sale</Text>
          <Text style={styles.sectionCount}>{filteredProducts.length} items</Text>
        </View>

        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No products match this filter.</Text>
              <Text style={styles.emptySubtitle}>Try another category, tab, or search term.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.productCard}
              onPress={() => openProductDetails(item)}
            >
              <Image source={{ uri: item.image }} style={styles.productImage} />
              <View style={styles.badgeRow}>
                {item.onSale ? <Text style={styles.saleBadge}>SALE</Text> : null}
                {item.isNew ? <Text style={styles.newBadge}>NEW</Text> : null}
              </View>
              <Text numberOfLines={2} style={styles.productName}>{item.name}</Text>
              <Text style={styles.productCategory}>{item.category}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
                {item.previousPrice ? (
                  <Text style={styles.previousPrice}>{formatCurrency(item.previousPrice)}</Text>
                ) : null}
              </View>
              <View style={styles.productFooter}>
                <Text style={styles.ratingText}>⭐ {(item.rating ?? 4.5).toFixed(1)}</Text>
                <View style={styles.productActionRow}>
                  <TouchableOpacity
                    style={styles.wishlistButton}
                    onPress={() => toggleWishlist(item)}
                  >
                    <Ionicons
                      name={wishlistIdSet.has(item.id) ? 'heart' : 'heart-outline'}
                      size={15}
                      color={wishlistIdSet.has(item.id) ? '#ff4d6d' : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => addToCart(item, 1)}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </ScrollView>

      <TouchableOpacity style={styles.cartFab} onPress={() => setScreenMode('checkout')}>
        <Ionicons name="cart" size={16} color={colors.buttonText} />
        <Text style={styles.cartFabText}>{cartItemCount}</Text>
      </TouchableOpacity>

      <StoreDrawer
        open={menuOpen}
        statusText={orderStatusText}
        onClose={closeMenu}
        onAccount={openAccountFromMenu}
        onWishlist={openWishlistFromMenu}
        onCheckout={openCheckoutFromMenu}
        onOrderStatus={openOrderStatusFromMenu}
        onOrderHistory={openOrdersFromMenu}
        onClearSearch={() => { setSearch(''); closeMenu(); }}
        onResetFilters={() => { setActiveTab('For You'); setSelectedCategory('all'); closeMenu(); }}
      />
    </View>
  );
}

export default function StoreScreen() {
  return (
    <OrderProvider>
      <CartProvider>
        <StoreScreenInner />
      </CartProvider>
    </OrderProvider>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loaderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      gap: 10,
    },
    loaderText: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.body,
    },
    scrollContent: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      paddingBottom: 140,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    logo: {
      fontSize: Typography.sizes.heading,
      fontWeight: Typography.weights.bold,
      color: colors.text,
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    historyButton: {
      backgroundColor: '#1C2460',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderWidth: 1.3,
      borderColor: '#5865F2',
      shadowColor: '#5865F2',
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
    },
    historyButtonText: {
      color: '#F3F6FF',
      fontSize: 15,
      fontWeight: '800',
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.small,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      paddingHorizontal: 10,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: Typography.sizes.bodyLarge,
      paddingVertical: 10,
    },
    searchAction: {
      width: 34,
      height: 34,
      borderRadius: BorderRadius.sm,
      backgroundColor: Colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: Spacing.sm,
    },
    locationText: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.body,
    },
    categoryScroll: {
      marginBottom: Spacing.sm,
    },
    categoryChip: {
      width: 94,
      marginRight: Spacing.sm,
      borderRadius: BorderRadius.md,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 102,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    categoryIcon: {
      width: 30,
      height: 30,
    },
    categoryLabel: {
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'center',
      lineHeight: 16,
    },
    bannerCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      padding: 10,
      marginBottom: Spacing.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.small,
    },
    bannerImage: {
      width: 74,
      height: 74,
      borderRadius: 10,
      marginRight: 12,
    },
    bannerInfo: {
      flex: 1,
    },
    bannerTitle: {
      color: colors.text,
      fontSize: Typography.sizes.bodyLarge,
      fontWeight: Typography.weights.bold,
      marginBottom: 2,
    },
    bannerSubtitle: {
      color: Colors.success,
      fontSize: Typography.sizes.caption,
      fontWeight: Typography.weights.semibold,
      marginBottom: 8,
    },
    bannerButton: {
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.sm,
      paddingVertical: 7,
      paddingHorizontal: 12,
      alignSelf: 'flex-start',
    },
    bannerButtonText: {
      color: colors.buttonText,
      fontWeight: '700',
      fontSize: 12,
    },
    tabScroll: {
      marginBottom: Spacing.sm,
    },
    tabChip: {
      marginRight: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabText: {
      fontSize: 15,
      fontWeight: '800',
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    sectionTitle: {
      fontSize: Typography.sizes.subtitle,
      color: colors.text,
      fontWeight: Typography.weights.bold,
    },
    sectionCount: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.caption,
      fontWeight: Typography.weights.medium,
    },
    productList: {
      paddingBottom: 8,
      gap: 10,
    },
    productRow: {
      justifyContent: 'space-between',
    },
    productCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    productImage: {
      width: '100%',
      height: 100,
      borderRadius: 10,
      marginBottom: 8,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 4,
      minHeight: 20,
    },
    saleBadge: {
      backgroundColor: '#ef4444',
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    newBadge: {
      backgroundColor: '#22c55e',
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    productName: {
      color: colors.text,
      fontSize: Typography.sizes.body,
      fontWeight: Typography.weights.bold,
      minHeight: 34,
    },
    productCategory: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.caption,
      marginBottom: 4,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    productPrice: {
      color: Colors.success,
      fontWeight: Typography.weights.bold,
      fontSize: Typography.sizes.bodyLarge,
    },
    previousPrice: {
      color: colors.textTertiary,
      textDecorationLine: 'line-through',
      fontSize: 11,
    },
    productFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    ratingText: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.caption,
      fontWeight: Typography.weights.medium,
    },
    addButton: {
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    productActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    wishlistButton: {
      width: 30,
      height: 30,
      borderRadius: BorderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonText: {
      color: colors.buttonText,
      fontWeight: '700',
      fontSize: 12,
    },
    emptyState: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      padding: 16,
      marginTop: 6,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: Typography.sizes.bodyLarge,
      fontWeight: Typography.weights.semibold,
      marginBottom: 4,
    },
    emptySubtitle: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.caption,
    },
    cartFab: {
      position: 'absolute',
      right: 18,
      bottom: 34,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: Colors.primary,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 16,
      ...Shadows.glow,
    },
    cartFabText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: '800',
    },
  });

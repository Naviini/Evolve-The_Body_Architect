import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTabEntranceAnimation } from '@/hooks/useTabEntranceAnimation';
import { BorderRadius, Colors, Shadows, Spacing, Typography, TAB_SCROLL_GUTTER, TAB_SCROLL_BOTTOM_GAP } from '@/constants/theme';
import { CartProvider, useCart } from '../../components/store/CartContext';
import { OrderProvider, useOrders } from '../../components/store/OrderContext';
import OrderHistoryScreen from '../../components/store/OrderHistoryScreen';
import ProductDetailScreen from '../../components/store/ProductDetailScreen';
import CheckoutScreen from '../../components/store/CheckoutScreen';
import WishlistScreen from '../../components/store/WishlistScreen';
import OrderStatusScreen from '../../components/store/OrderStatusScreen';
import AccountScreen from '../../components/store/AccountScreen';
import StoreDrawer from '../../components/store/StoreDrawer';
import { HeaderIconButton } from '@/components/ui/header-icon-button';
import { StoreProduct } from '../../components/store/products';
import { storeProductImageSource } from '../../components/store/productImages';
import { getPersonalizedRecommendations } from '../../src/services/recommendationService';
import { getAllProducts } from '../../src/services/storeService';
import { getDailyLog, getStoreWishlistItems, getUserHealthProfileForProcessing, initDatabase, removeStoreWishlistItem, upsertStoreWishlistItem } from '../../src/lib/database';
import { useAuth } from '../../src/contexts/AuthContext';

/** Matches Analytics / Diary elevated blocks — surfaceLight → card */
function fitstoreBlockGradient(colors: { surfaceLight: string; card: string }) {
  return [colors.surfaceLight, colors.card] as const;
}

export type FitStoreBrowseTab =
  | 'Browse All'
  | 'For You'
  | 'Restaurants'
  | 'Deals'
  | 'Top Rated'
  | 'New';

/** Single ordered chip strip — tab + catalogue category per tile (Healthy Meals intentionally omitted per product spec). */
type StoreChipDef = {
  key: string;
  label: string;
  icon: string;
  tab: FitStoreBrowseTab;
  categoryId: string;
};

const STORE_CHIPS_ORDERED: StoreChipDef[] = [
  { key: 'all', label: 'All', icon: 'https://img.icons8.com/color/96/shop.png', tab: 'Browse All', categoryId: 'all' },
  { key: 'for_you', label: 'For You', icon: 'https://img.icons8.com/color/96/sparkling.png', tab: 'For You', categoryId: 'all' },
  { key: 'restaurants', label: 'Restaurants', icon: 'https://img.icons8.com/color/96/food-and-wine.png', tab: 'Restaurants', categoryId: 'all' },
  { key: 'supplements', label: 'Supplement', icon: 'https://img.icons8.com/color/96/pill.png', tab: 'For You', categoryId: 'Supplements' },
  { key: 'body_care', label: 'Body Care', icon: 'https://img.icons8.com/color/96/cream-tube.png', tab: 'For You', categoryId: 'Body Care' },
  { key: 'food', label: 'Food', icon: 'https://img.icons8.com/color/96/salad.png', tab: 'For You', categoryId: 'Food & Drink' },
  { key: 'health', label: 'Health', icon: 'https://img.icons8.com/color/96/heart-with-pulse.png', tab: 'For You', categoryId: 'Health' },
  { key: 'top', label: 'Top', icon: 'https://img.icons8.com/color/96/christmas-star.png', tab: 'Top Rated', categoryId: 'all' },
  { key: 'deals', label: 'Deals', icon: 'https://img.icons8.com/color/96/discount.png', tab: 'Deals', categoryId: 'all' },
  { key: 'new', label: 'New', icon: 'https://img.icons8.com/color/96/new.png', tab: 'New', categoryId: 'all' },
  { key: 'gear', label: 'Gear', icon: 'https://img.icons8.com/color/96/dumbbell.png', tab: 'For You', categoryId: 'Gear' },
  { key: 'accessories', label: 'Accessories', icon: 'https://img.icons8.com/color/96/water-bottle.png', tab: 'For You', categoryId: 'Accessories' },
];

const CATEGORY_LABEL_FALLBACK: Record<string, string> = {
  'Food & Drink': 'Food',
  Supplements: 'Supplement',
  'Body Care': 'Body Care',
  Health: 'Health',
  Gear: 'Gear',
  Accessories: 'Accessories',
};

const RESTAURANT_SHOW: Record<
  string,
  { cuisine: string; eta: string }
> = {
  'Green Fork Kitchen': { cuisine: 'Bowls · High protein', eta: '20–35 min' },
  'Ceylon Balance': { cuisine: 'Sri Lankan · Seafood', eta: '25–40 min' },
  'Metro Protein Bar': { cuisine: 'Lean plates · Steak house', eta: '30–45 min' },
  'Plant & Flow': { cuisine: 'Plant-based · Vegan', eta: '20–30 min' },
  'Sunrise Deli': { cuisine: 'Breakfast wraps', eta: '15–28 min' },
  'Spice Route Lean': { cuisine: 'Curries · Vegetarian friendly', eta: '22–38 min' },
  'Fresh Stack': { cuisine: 'Yogurt · Light meals', eta: '18–32 min' },
  'Pacific Lean Co': { cuisine: 'Salmon · Poke-inspired', eta: '28–42 min' },
};

function restaurantDisplayMeta(partnerName: string): { cuisine: string; eta: string } {
  return RESTAURANT_SHOW[partnerName] ?? { cuisine: 'Healthy meals · FitStore partner', eta: '25–40 min' };
}

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

function StoreScreenInner() {
  const params = useLocalSearchParams<{ screen?: string; tab?: string }>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const fitstoreGrad = fitstoreBlockGradient(colors);
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
  const [activeTab, setActiveTab] = useState<FitStoreBrowseTab>('Browse All');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderStatusText, setOrderStatusText] = useState('No active orders');

  const entranceReplayKey = loading
    ? 'loading'
    : `${screenMode}:${screenMode === 'details' && selectedProduct ? selectedProduct.id : '_'}`;
  const { entranceStyle } = useTabEntranceAnimation({
    replayDeps: [entranceReplayKey],
  });

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

  useEffect(() => {
    if (typeof params.tab === 'string' && params.tab === 'Restaurants') {
      setActiveTab('Restaurants');
      setSelectedCategory('all');
      setScreenMode('store');
    }
  }, [params.tab]);

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const filteredProducts = useMemo(() => {
    let list = [...catalog];

    if (activeTab === 'Restaurants') {
      list = [];
    } else if (activeTab === 'For You' && recommended.length > 0) {
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
  }, [activeTab, recommended, catalog, search, selectedCategory]);

  const pickStoreChip = useCallback((chip: StoreChipDef) => {
    setActiveTab(chip.tab);
    setSelectedCategory(chip.categoryId);
  }, []);

  /** Meal SKUs grouped by partner kitchen — Uber Eats style list (Restaurants tab only). */
  const restaurantClusters = useMemo(() => {
    if (activeTab !== 'Restaurants') return [];

    if (selectedCategory !== 'all') {
      return [];
    }

    let meals = catalog.filter(p => p.category === 'Healthy Meals');

    const query = search.trim().toLowerCase();
    if (query) {
      meals = meals.filter(product => {
        const partner = (product.partnerName ?? '').toLowerCase();
        const inName = product.name.toLowerCase().includes(query);
        const inTags = product.tags?.some(tag => tag.toLowerCase().includes(query));
        const inPartner = partner.includes(query);
        return inName || inTags || inPartner;
      });
    }

    const byPartner = new Map<string, StoreProduct[]>();
    for (const p of meals) {
      const key = p.partnerName?.trim() || 'Partner Kitchen';
      if (!byPartner.has(key)) byPartner.set(key, []);
      byPartner.get(key)!.push(p);
    }

    const clusters = Array.from(byPartner.entries()).map(([partnerName, items]) => {
      const sorted = [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      const avgRating = sorted.reduce((s, i) => s + (i.rating ?? 4.5), 0) / sorted.length;
      return { partnerName, items: sorted, heroProduct: sorted[0], avgRating };
    });

    clusters.sort((a, b) => b.avgRating - a.avgRating);
    return clusters;
  }, [activeTab, catalog, search, selectedCategory]);

  const restaurantDishTotal = useMemo(
    () => restaurantClusters.reduce((sum, c) => sum + c.items.length, 0),
    [restaurantClusters]
  );

  const topDeal = useMemo(
    () => catalog.find(product => product.onSale && product.previousPrice),
    [catalog]
  );

  const catalogueHeading = useMemo(() => {
    let title = 'Shop catalogue';
    if (activeTab === 'Deals') title = 'Deals';
    else if (activeTab === 'Top Rated') title = 'Top rated picks';
    else if (activeTab === 'New') title = 'New arrivals';
    else if (activeTab === 'For You' && recommended.length > 0) title = 'Recommended for you';
    else if (selectedCategory !== 'all') {
      title = CATEGORY_LABEL_FALLBACK[selectedCategory] ?? selectedCategory;
    }
    const sub =
      filteredProducts.length === 1 ? '1 item' : `${filteredProducts.length} items`;
    return { title, sub };
  }, [activeTab, recommended.length, selectedCategory, filteredProducts.length]);

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
        <Animated.View
          style={[
            { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
            entranceStyle,
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Loading your personalized store...</Text>
        </Animated.View>
      </View>
    );
  }

  if (screenMode === 'details' && selectedProduct) {
    return (
      <>
        <Animated.View style={[{ flex: 1 }, entranceStyle]}>
        <ProductDetailScreen
          product={selectedProduct}
          onBack={() => setScreenMode('store')}
          onMenuPress={() => setMenuOpen(true)}
          isWishlisted={wishlistIdSet.has(selectedProduct.id)}
          onToggleWishlist={() => toggleWishlist(selectedProduct)}
          onAddToCart={(product, quantity) => addToCart(product, quantity)}
          onCheckoutNow={handleCheckoutNowFromDetails}
        />
        </Animated.View>
        <StoreDrawer
          open={menuOpen}
          statusText={orderStatusText}
          onClose={closeMenu}
          onAccount={openAccountFromMenu}
          onWishlist={openWishlistFromMenu}
          onCheckout={openCheckoutFromMenu}
          onOrderStatus={openOrderStatusFromMenu}
          onOrderHistory={openOrdersFromMenu}
          onClearSearch={() => {
            setSearch('');
            closeMenu();
          }}
          onResetFilters={() => {
            setActiveTab('Browse All');
            setSelectedCategory('all');
            closeMenu();
          }}
        />
      </>
    );
  }

  if (screenMode === 'checkout') {
    return (
      <>
        <Animated.View style={[{ flex: 1 }, entranceStyle]}>
        <CheckoutScreen
          onBack={() => setScreenMode('store')}
          onMenuPress={() => setMenuOpen(true)}
          onPlaceOrder={handlePlaceOrder}
        />
        </Animated.View>
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
          onResetFilters={() => { setActiveTab('Browse All'); setSelectedCategory('all'); closeMenu(); }}
        />
      </>
    );
  }

  if (screenMode === 'orders') {
    return (
      <>
        <Animated.View style={[{ flex: 1 }, entranceStyle]}>
        <OrderHistoryScreen onBack={() => setScreenMode('store')} onMenuPress={() => setMenuOpen(true)} />
        </Animated.View>
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
          onResetFilters={() => { setActiveTab('Browse All'); setSelectedCategory('all'); closeMenu(); }}
        />
      </>
    );
  }

  if (screenMode === 'wishlist') {
    return (
      <>
        <Animated.View style={[{ flex: 1 }, entranceStyle]}>
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
        </Animated.View>
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
          onResetFilters={() => { setActiveTab('Browse All'); setSelectedCategory('all'); closeMenu(); }}
        />
      </>
    );
  }

  if (screenMode === 'status') {
    return (
      <>
        <Animated.View style={[{ flex: 1 }, entranceStyle]}>
        <OrderStatusScreen
          orders={orders}
          onBack={() => setScreenMode('store')}
          onMenuPress={() => setMenuOpen(true)}
          onAdvanceStatus={advanceOrderStatus}
        />
        </Animated.View>
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
          onResetFilters={() => { setActiveTab('Browse All'); setSelectedCategory('all'); closeMenu(); }}
        />
      </>
    );
  }

  if (screenMode === 'account') {
    return (
      <>
        <Animated.View style={[{ flex: 1 }, entranceStyle]}>
        <AccountScreen onBack={() => setScreenMode('store')} onMenuPress={() => setMenuOpen(true)} />
        </Animated.View>
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
          onResetFilters={() => { setActiveTab('Browse All'); setSelectedCategory('all'); closeMenu(); }}
        />
      </>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[{ flex: 1 }, entranceStyle]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + TAB_SCROLL_BOTTOM_GAP },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <Text style={styles.logo}>FitStore</Text>
            <Ionicons name="bag" size={24} color={colors.text} />
          </View>
          <View style={styles.topActions}>
            <HeaderIconButton
              icon="menu"
              iconSize={22}
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="Open navigation menu"
            />
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
            <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.browseChipScroll}
          contentContainerStyle={styles.browseChipScrollContent}
        >
          {STORE_CHIPS_ORDERED.map(chip => {
            const isActive = activeTab === chip.tab && selectedCategory === chip.categoryId;
            /** Selected: same primary → accent ramp as charts / CTAs; idle: same block fill as catalogue cards */
            const activeFaceColors = [...Colors.gradients.primary] as readonly [string, string];
            const sheenColors = (
              ['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0)'] as const
            );
            const sheenIdle = (
              ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.045)', 'rgba(255,255,255,0.012)', 'rgba(255,255,255,0)'] as const
            );
            const rimTop = 'rgba(255,255,255,0.38)';
            const rimLeft = 'rgba(255,255,255,0.22)';
            const rimRight = `${Colors.primaryDark}8C`;
            const rimBottom = `${Colors.accent}55`;
            const idleRimTop = 'rgba(255,255,255,0.16)';
            const idleRimLeft = 'rgba(255,255,255,0.10)';
            const idleRimRight = 'rgba(0,0,0,0.22)';
            const idleRimBottom = 'rgba(0,0,0,0.36)';
            const iconBgActive = 'rgba(255,255,255,0.28)';
            const iconTopActive = 'rgba(255,255,255,0.48)';
            const iconBottomActive = `${Colors.primaryDark}66`;
            const iconBgIdle = colors.surface;
            const iconTopIdle = 'rgba(255,255,255,0.12)';
            const iconBottomIdle = 'rgba(0,0,0,0.32)';
            const chipInner = (
              <View style={styles.browseChipInner}>
                <View
                  style={[
                    styles.browseChipIconCircle,
                    isActive
                      ? {
                          backgroundColor: iconBgActive,
                          borderTopColor: iconTopActive,
                          borderBottomColor: iconBottomActive,
                          borderLeftColor: iconTopActive,
                          borderRightColor: iconBottomActive,
                          transform: [{ scale: 1.05 }],
                        }
                      : {
                          backgroundColor: iconBgIdle,
                          borderWidth: 1,
                          borderTopColor: iconTopIdle,
                          borderLeftColor: iconTopIdle,
                          borderBottomColor: iconBottomIdle,
                          borderRightColor: iconBottomIdle,
                          transform: [{ scale: 1 }],
                        },
                  ]}
                >
                  <Image source={{ uri: chip.icon }} style={styles.browseChipIcon} />
                </View>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.browseChipLabel,
                    { color: isActive ? '#FFFFFF' : colors.text },
                    isActive ? styles.browseChipLabelActive : null,
                  ]}
                >
                  {chip.label}
                </Text>
                {isActive ? (
                  <LinearGradient
                    colors={[Colors.accent, Colors.primaryLight]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.browseChipActiveBar}
                  />
                ) : (
                  <View style={styles.browseChipInactiveBarSpacer} />
                )}
              </View>
            );
            return (
              <TouchableOpacity
                key={chip.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${chip.label}. ${isActive ? 'Selected.' : ''}`}
                activeOpacity={0.88}
                style={styles.browseChipTouchable}
                onPress={() => pickStoreChip(chip)}
              >
                <View style={[styles.browseChipElevated, isActive ? styles.browseChipElevatedActive : styles.browseChipElevatedIdle]}>
                  {isActive ? (
                    <LinearGradient
                      colors={activeFaceColors}
                      locations={[0, 1]}
                      start={{ x: 0.12, y: 0 }}
                      end={{ x: 0.88, y: 1 }}
                      style={[
                        styles.browseChipFace,
                        {
                          borderTopColor: rimTop,
                          borderLeftColor: rimLeft,
                          borderRightColor: rimRight,
                          borderBottomColor: rimBottom,
                        },
                      ]}
                    >
                      <LinearGradient
                        pointerEvents="none"
                        colors={[...sheenColors]}
                        locations={[0, 0.36, 0.68, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.browseChipSheen}
                      />
                      {chipInner}
                    </LinearGradient>
                  ) : (
                    <LinearGradient
                      colors={fitstoreGrad}
                      locations={[0, 1]}
                      start={{ x: 0.12, y: 0 }}
                      end={{ x: 0.88, y: 1 }}
                      style={[
                        styles.browseChipFace,
                        {
                          borderTopColor: idleRimTop,
                          borderLeftColor: idleRimLeft,
                          borderRightColor: idleRimRight,
                          borderBottomColor: idleRimBottom,
                        },
                      ]}
                    >
                      <LinearGradient
                        pointerEvents="none"
                        colors={[...sheenIdle]}
                        locations={[0, 0.36, 0.68, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.browseChipSheen}
                      />
                      {chipInner}
                    </LinearGradient>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.locationText}>Delivering to your fitness profile — gear, supplements & healthy meals</Text>
        </View>

        {topDeal &&
        (activeTab === 'Browse All' || activeTab === 'For You') &&
        selectedCategory === 'all' ? (
          <LinearGradient colors={fitstoreGrad} style={styles.bannerCard}>
            {(() => {
              const src = storeProductImageSource(topDeal.id, topDeal.image);
              return src ? (
                <Image source={src} style={styles.bannerImage} resizeMode="cover" />
              ) : (
                <View style={[styles.bannerImage, styles.imagePlaceholderTiny]}>
                  <Ionicons name="image-outline" size={22} color={colors.textTertiary} />
                </View>
              );
            })()}
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
          </LinearGradient>
        ) : null}

        {activeTab === 'Restaurants' ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Partner restaurants</Text>
              <Text style={styles.sectionCount}>
                {restaurantClusters.length > 0
                  ? `${restaurantClusters.length} kitchens · ${restaurantDishTotal} dishes`
                  : 'Uber Eats-style healthy picks'}
              </Text>
            </View>

            {restaurantClusters.length === 0 ? (
              <LinearGradient colors={fitstoreGrad} style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No restaurants to show.</Text>
                <Text style={styles.emptySubtitle}>
                  Keep <Text style={{ fontWeight: '700', color: colors.text }}>Restaurants</Text> selected and choose{' '}
                  <Text style={{ fontWeight: '700', color: colors.text }}>All</Text> above—or clear your search.
                </Text>
              </LinearGradient>
            ) : (
              restaurantClusters.map(({ partnerName, items, heroProduct, avgRating }) => {
                const meta = restaurantDisplayMeta(partnerName);
                const fromPrice = Math.min(...items.map(i => i.price));
                const heroSrc = storeProductImageSource(heroProduct.id, heroProduct.image);

                return (
                  <LinearGradient
                    key={partnerName}
                    colors={fitstoreGrad}
                    style={[styles.restaurantBlock, { borderColor: colors.border }]}
                  >
                    <View style={styles.restaurantHero}>
                      {heroSrc ? (
                        <Image source={heroSrc} style={styles.restaurantHeroImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.restaurantHeroImage, styles.imagePlaceholderTiny]}>
                          <Ionicons name="restaurant-outline" size={36} color={colors.textTertiary} />
                        </View>
                      )}
                      <View style={styles.restaurantHeroOverlay}>
                        <View style={styles.restaurantHeroTopRow}>
                          <View style={styles.fitstorePartnerBadge}>
                            <Text style={styles.fitstorePartnerBadgeText}>FitStore partner</Text>
                          </View>
                          <View style={styles.etaBadge}>
                            <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                            <Text style={styles.etaBadgeText}>{meta.eta}</Text>
                          </View>
                        </View>
                        <Text style={styles.restaurantPartnerTitle}>{partnerName}</Text>
                        <Text style={styles.restaurantPartnerSub} numberOfLines={1}>
                          {meta.cuisine}
                        </Text>
                        <View style={styles.restaurantHeroMeta}>
                          <Text style={styles.restaurantHeroRating}>
                            ⭐ {avgRating.toFixed(1)} · {items.length}{' '}
                            {items.length === 1 ? 'dish' : 'dishes'}
                          </Text>
                          <Text style={styles.restaurantHeroFrom}>From {formatCurrency(fromPrice)}</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.restaurantMenuLabel, { color: colors.textSecondary }]}>
                      Popular on the menu
                    </Text>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.restaurantDishStrip}
                    >
                      {items.map(item => {
                        const thumb = storeProductImageSource(item.id, item.image);
                        return (
                          <LinearGradient
                            key={item.id}
                            colors={fitstoreGrad}
                            style={[styles.restaurantDishCard, { borderColor: colors.border }]}
                          >
                            <TouchableOpacity activeOpacity={0.9} onPress={() => openProductDetails(item)}>
                              {thumb ? (
                                <Image source={thumb} style={styles.restaurantDishImage} resizeMode="cover" />
                              ) : (
                                <View style={[styles.restaurantDishImage, styles.productImagePlaceholder]}>
                                  <Ionicons name="fast-food-outline" size={26} color={colors.textTertiary} />
                                </View>
                              )}
                              <View style={styles.restaurantDishBadgeRow}>
                                {item.onSale ? <Text style={styles.saleBadge}>SALE</Text> : null}
                                {item.isNew ? <Text style={styles.newBadge}>NEW</Text> : null}
                              </View>
                              <Text style={[styles.restaurantDishName, { color: colors.text }]} numberOfLines={2}>
                                {item.name}
                              </Text>
                              {item.nutrition?.calories != null ? (
                                <Text style={[styles.restaurantDishMacros, { color: colors.textTertiary }]}>
                                  {Math.round(item.nutrition.calories)} kcal
                                  {item.nutrition.protein != null
                                    ? ` · ${Math.round(item.nutrition.protein)}g protein`
                                    : ''}
                                </Text>
                              ) : null}
                              <Text style={[styles.restaurantDishPrice, { color: Colors.success }]}>
                                {formatCurrency(item.price)}
                              </Text>
                            </TouchableOpacity>
                            <View style={styles.restaurantDishActions}>
                              <TouchableOpacity
                                style={[styles.restaurantWishlistChip, { borderColor: colors.border }]}
                                onPress={() => toggleWishlist(item)}
                              >
                                <Ionicons
                                  name={wishlistIdSet.has(item.id) ? 'heart' : 'heart-outline'}
                                  size={16}
                                  color={wishlistIdSet.has(item.id) ? Colors.protein : colors.textSecondary}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.restaurantQuickAdd, { backgroundColor: Colors.primary }]}
                                onPress={() => addToCart(item, 1)}
                              >
                                <Text style={styles.restaurantQuickAddText}>Add</Text>
                              </TouchableOpacity>
                            </View>
                          </LinearGradient>
                        );
                      })}
                    </ScrollView>
                  </LinearGradient>
                );
              })
            )}
          </>
        ) : (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{catalogueHeading.title}</Text>
              <Text style={styles.sectionCount}>{catalogueHeading.sub}</Text>
            </View>

            <FlatList
              data={filteredProducts}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              numColumns={2}
              columnWrapperStyle={styles.productRow}
              contentContainerStyle={styles.productList}
              ListEmptyComponent={
                <LinearGradient colors={fitstoreGrad} style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No products match this filter.</Text>
                  <Text style={styles.emptySubtitle}>Try another category, tab, or search term.</Text>
                </LinearGradient>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.productCardWrap}
                  onPress={() => openProductDetails(item)}
                >
                  <LinearGradient colors={fitstoreGrad} style={styles.productCard}>
                  {(() => {
                    const thumb = storeProductImageSource(item.id, item.image);
                    return thumb ? (
                      <Image source={thumb} style={styles.productImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.productImage, styles.productImagePlaceholder]}>
                        <Ionicons name="image-outline" size={28} color={colors.textTertiary} />
                      </View>
                    );
                  })()}
                  <View style={styles.badgeRow}>
                    {item.onSale ? <Text style={styles.saleBadge}>SALE</Text> : null}
                    {item.isNew ? <Text style={styles.newBadge}>NEW</Text> : null}
                  </View>
                  <Text numberOfLines={2} style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productCategory}>
                    {CATEGORY_LABEL_FALLBACK[item.category] ?? item.category}
                  </Text>
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
                          color={wishlistIdSet.has(item.id) ? Colors.protein : colors.textSecondary}
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
                  </LinearGradient>
                </TouchableOpacity>
              )}
            />
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.88}
        style={[styles.cartFabOuter, { bottom: Math.max(insets.bottom, Spacing.sm) + Spacing.md }]}
        onPress={() => setScreenMode('checkout')}
      >
        <LinearGradient
          colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
          locations={[0, 0.48, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.cartFabGradient}
        >
          <Ionicons name="cart" size={16} color="#FFFFFF" />
          <Text style={styles.cartFabText}>{cartItemCount}</Text>
        </LinearGradient>
      </TouchableOpacity>
      </Animated.View>

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
        onResetFilters={() => { setActiveTab('Browse All'); setSelectedCategory('all'); closeMenu(); }}
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
      paddingHorizontal: TAB_SCROLL_GUTTER,
      paddingTop: Spacing.lg,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    logoRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginRight: Spacing.sm,
    },
    logo: {
      fontSize: Typography.sizes.heading,
      fontWeight: Typography.weights.bold,
      color: colors.text,
      letterSpacing: -0.4,
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    historyButton: {
      backgroundColor: colors.surfaceLight,
      borderRadius: BorderRadius.md,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.primary,
      ...Shadows.card,
    },
    historyButtonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: Typography.weights.bold,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.sm,
      marginBottom: Spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...Shadows.card,
    },
    searchIcon: {
      marginRight: Spacing.sm,
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
      gap: Spacing.xs,
      marginBottom: Spacing.md,
    },
    locationText: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.body,
    },
    browseChipScroll: {
      marginBottom: Spacing.md,
      flexGrow: 0,
    },
    browseChipScrollContent: {
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.sm,
    },
    browseChipTouchable: {
      marginRight: Spacing.sm,
    },
    browseChipElevated: {
      width: 94,
      borderRadius: BorderRadius.md,
      backgroundColor: 'transparent',
      ...Platform.select({
        ios: {
          shadowColor: '#050510',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        },
        android: { elevation: 10 },
        default: {
          shadowColor: '#050510',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        },
      }),
    },
    browseChipElevatedActive: Platform.select({
      ios: {
        shadowColor: Colors.primaryDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.42,
        shadowRadius: 14,
      },
      android: { elevation: 14 },
      default: {
        shadowColor: Colors.primaryDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.42,
        shadowRadius: 14,
      },
    }),
    browseChipElevatedIdle: Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.34,
        shadowRadius: 7,
      },
      android: { elevation: 9 },
      default: {
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.34,
        shadowRadius: 7,
      },
    }),
    browseChipFace: {
      width: '100%',
      minHeight: 104,
      borderRadius: BorderRadius.md,
      borderWidth: StyleSheet.hairlineWidth + 1,
      paddingVertical: 10,
      paddingHorizontal: 6,
      overflow: 'hidden',
      justifyContent: 'center',
    },
    browseChipSheen: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: BorderRadius.md - 1,
    },
    browseChipInner: {
      flex: 1,
      width: '100%',
      minHeight: 84,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2,
      zIndex: 1,
    },
    browseChipIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      borderWidth: 1,
    },
    browseChipIcon: {
      width: 30,
      height: 30,
    },
    browseChipLabel: {
      fontSize: 11,
      fontWeight: Typography.weights.heavy,
      textAlign: 'center',
      lineHeight: 14,
      maxWidth: '100%',
      letterSpacing: 0.15,
    },
    browseChipLabelActive: {
      textShadowColor: 'rgba(0,0,0,0.45)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
      letterSpacing: 0.25,
    },
    browseChipActiveBar: {
      marginTop: 6,
      width: 30,
      height: 3,
      borderRadius: 2,
      opacity: 0.95,
    },
    browseChipInactiveBarSpacer: {
      marginTop: 6,
      height: 3,
      width: 30,
      opacity: 0,
    },
    bannerCard: {
      flexDirection: 'row',
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
      ...Shadows.card,
    },
    bannerImage: {
      width: 74,
      height: 74,
      borderRadius: BorderRadius.sm + 2,
      marginRight: Spacing.md,
    },
    imagePlaceholderTiny: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    bannerInfo: {
      flex: 1,
    },
    bannerTitle: {
      color: colors.text,
      fontSize: Typography.sizes.bodyLarge,
      fontWeight: Typography.weights.bold,
      marginBottom: Spacing.xs,
    },
    bannerSubtitle: {
      color: Colors.success,
      fontSize: Typography.sizes.caption,
      fontWeight: Typography.weights.semibold,
      marginBottom: Spacing.sm,
    },
    bannerButton: {
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.sm,
      paddingVertical: 7,
      paddingHorizontal: 12,
      alignSelf: 'flex-start',
    },
    bannerButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 12,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    sectionTitle: {
      fontSize: Typography.sizes.subtitle,
      color: colors.text,
      fontWeight: Typography.weights.bold,
      letterSpacing: -0.2,
    },
    sectionCount: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.caption,
      fontWeight: Typography.weights.medium,
    },
    productList: {
      paddingBottom: Spacing.md,
      gap: Spacing.md,
    },
    productRow: {
      justifyContent: 'space-between',
    },
    productCardWrap: {
      width: '48%',
    },
    productCard: {
      flex: 1,
      minHeight: 1,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
      ...Shadows.card,
    },
    productImage: {
      width: '100%',
      height: 100,
      borderRadius: BorderRadius.sm + 2,
      marginBottom: Spacing.sm,
    },
    productImagePlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: Spacing.xs + 2,
      marginBottom: Spacing.xs,
      minHeight: 20,
    },
    saleBadge: {
      backgroundColor: Colors.error,
      color: '#fff',
      fontSize: 10,
      fontWeight: Typography.weights.heavy,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    newBadge: {
      backgroundColor: Colors.success,
      color: '#fff',
      fontSize: 10,
      fontWeight: Typography.weights.heavy,
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
      marginBottom: Spacing.xs,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs + 2,
      marginBottom: Spacing.sm,
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
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 12,
    },
    emptyState: {
      width: '100%',
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginTop: Spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
      ...Shadows.card,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: Typography.sizes.bodyLarge,
      fontWeight: Typography.weights.semibold,
      marginBottom: Spacing.xs,
    },
    emptySubtitle: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.caption,
    },
    cartFabOuter: {
      position: 'absolute',
      right: Spacing.md + 2,
      borderRadius: 999,
      ...Platform.select({
        ios: {
          shadowColor: Colors.primaryDark,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.48,
          shadowRadius: 12,
        },
        android: { elevation: 14 },
        default: {
          shadowColor: Colors.primaryDark,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.48,
          shadowRadius: 12,
        },
      }),
    },
    cartFabGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderBottomWidth: 3,
      borderRightWidth: 2,
      borderTopColor: 'rgba(255,255,255,0.38)',
      borderLeftColor: 'rgba(255,255,255,0.26)',
      borderBottomColor: 'rgba(28,22,92,0.88)',
      borderRightColor: 'rgba(38,30,118,0.72)',
      overflow: 'hidden',
    },
    cartFabText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      textShadowColor: 'rgba(0,0,0,0.35)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    restaurantBlock: {
      marginBottom: Spacing.lg,
      borderRadius: BorderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingBottom: Spacing.md,
      ...Shadows.card,
    },
    restaurantHero: {
      height: 154,
      borderRadius: BorderRadius.md,
      overflow: 'hidden',
      position: 'relative',
      marginBottom: Spacing.md,
    },
    restaurantHeroImage: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    restaurantHeroOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      padding: 12,
      backgroundColor: 'rgba(9, 9, 26, 0.52)',
    },
    restaurantHeroTopRow: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    fitstorePartnerBadge: {
      backgroundColor: `${Colors.primary}E6`,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    fitstorePartnerBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    etaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
    },
    etaBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    restaurantPartnerTitle: {
      color: '#FFFFFF',
      fontSize: Typography.sizes.subtitle,
      fontWeight: Typography.weights.bold,
      marginBottom: 4,
      textShadowColor: 'rgba(0,0,0,0.35)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    restaurantPartnerSub: {
      color: 'rgba(255,255,255,0.92)',
      fontSize: Typography.sizes.caption,
      marginBottom: 8,
      fontWeight: Typography.weights.medium,
    },
    restaurantHeroMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    restaurantHeroRating: {
      color: '#FFFFFF',
      fontSize: Typography.sizes.caption,
      fontWeight: Typography.weights.semibold,
    },
    restaurantHeroFrom: {
      color: Colors.success,
      fontSize: Typography.sizes.caption,
      fontWeight: Typography.weights.bold,
    },
    restaurantMenuLabel: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    restaurantDishStrip: {
      paddingBottom: 4,
      gap: 10,
      paddingRight: 4,
    },
    restaurantDishCard: {
      width: 156,
      borderRadius: BorderRadius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingBottom: 10,
      ...Shadows.small,
    },
    restaurantDishImage: {
      width: '100%',
      height: 104,
      borderTopLeftRadius: BorderRadius.sm,
      borderTopRightRadius: BorderRadius.sm,
    },
    restaurantDishBadgeRow: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 8,
      marginTop: 6,
      minHeight: 18,
      flexWrap: 'wrap',
    },
    restaurantDishName: {
      fontSize: 13,
      fontWeight: Typography.weights.bold,
      paddingHorizontal: 8,
      marginTop: 4,
      minHeight: 34,
      lineHeight: 17,
    },
    restaurantDishMacros: {
      fontSize: 11,
      paddingHorizontal: 8,
      marginTop: 2,
    },
    restaurantDishPrice: {
      fontSize: Typography.sizes.body,
      fontWeight: Typography.weights.bold,
      paddingHorizontal: 8,
      marginTop: 6,
    },
    restaurantDishActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 8,
      marginTop: 8,
    },
    restaurantWishlistChip: {
      width: 34,
      height: 34,
      borderRadius: BorderRadius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    restaurantQuickAdd: {
      flex: 1,
      borderRadius: BorderRadius.sm,
      paddingVertical: 8,
      alignItems: 'center',
    },
    restaurantQuickAddText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 13,
    },
  });

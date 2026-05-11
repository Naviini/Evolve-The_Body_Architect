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
import { storeProductImageSource } from '../../components/store/productImages';
import { getPersonalizedRecommendations } from '../../src/services/recommendationService';
import { getAllProducts } from '../../src/services/storeService';
import { getDailyLog, getStoreWishlistItems, getUserHealthProfileForProcessing, initDatabase, removeStoreWishlistItem, upsertStoreWishlistItem } from '../../src/lib/database';
import { useAuth } from '../../src/contexts/AuthContext';

const categories = [
  { id: 'all', name: 'All', icon: 'https://img.icons8.com/color/96/shop.png' },
  { id: 'Healthy Meals', name: 'Meals', icon: 'https://img.icons8.com/color/96/restaurant-table.png' },
  { id: 'Supplements', name: 'Supplements', icon: 'https://img.icons8.com/color/96/pill.png' },
  { id: 'Food & Drink', name: 'Food', icon: 'https://img.icons8.com/color/96/salad.png' },
  { id: 'Gear', name: 'Gear', icon: 'https://img.icons8.com/color/96/dumbbell.png' },
  { id: 'Accessories', name: 'Accessories', icon: 'https://img.icons8.com/color/96/water-bottle.png' },
  { id: 'Health', name: 'Health', icon: 'https://img.icons8.com/color/96/heart-with-pulse.png' },
  { id: 'Body Care', name: 'Body Care', icon: 'https://img.icons8.com/color/96/cream-tube.png' },
];

const tabs = ['For You', 'Restaurants', 'Deals', 'Top Rated', 'New'] as const;

/** Extra display fields for Uber Eats–style partner rows (kitchens mapped from meal SKUs). */
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

  useEffect(() => {
    if (typeof params.tab === 'string' && params.tab === 'Restaurants') {
      setActiveTab('Restaurants');
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

  /** Meal SKUs grouped by partner kitchen — Uber Eats style list (Restaurants tab only). */
  const restaurantClusters = useMemo(() => {
    if (activeTab !== 'Restaurants') return [];

    if (selectedCategory !== 'all' && selectedCategory !== 'Healthy Meals') {
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
      <>
        <ProductDetailScreen
          product={selectedProduct}
          onBack={() => setScreenMode('store')}
          onMenuPress={() => setMenuOpen(true)}
          isWishlisted={wishlistIdSet.has(selectedProduct.id)}
          onToggleWishlist={() => toggleWishlist(selectedProduct)}
          onAddToCart={(product, quantity) => addToCart(product, quantity)}
          onCheckoutNow={handleCheckoutNowFromDetails}
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
          onClearSearch={() => {
            setSearch('');
            closeMenu();
          }}
          onResetFilters={() => {
            setActiveTab('For You');
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
            <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.locationText}>Delivering to your fitness profile — gear, supplements & healthy meals</Text>
        </View>

        <View style={[styles.mealsInfoCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={[styles.mealsInfoIconWrap, { backgroundColor: Colors.primary + '22' }]}>
            <Ionicons name="restaurant-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.mealsInfoTextWrap}>
            <Text style={[styles.mealsInfoTitle, { color: colors.text }]}>Restaurant-style healthy meals</Text>
            <Text style={[styles.mealsInfoSub, { color: colors.textSecondary }]}>
              Order macro-friendly bowls, local plates, and breakfast options from partner kitchens—same FitStore checkout and delivery flow as the rest of your basket.
            </Text>
          </View>
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

        {topDeal && activeTab !== 'Restaurants' ? (
          <View style={styles.bannerCard}>
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
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No restaurants to show.</Text>
                <Text style={styles.emptySubtitle}>
                  Switch category to{' '}
                  <Text style={{ fontWeight: '700', color: colors.text }}>All</Text> or{' '}
                  <Text style={{ fontWeight: '700', color: colors.text }}>Meals</Text>, then try again—or clear your search.
                </Text>
              </View>
            ) : (
              restaurantClusters.map(({ partnerName, items, heroProduct, avgRating }) => {
                const meta = restaurantDisplayMeta(partnerName);
                const fromPrice = Math.min(...items.map(i => i.price));
                const heroSrc = storeProductImageSource(heroProduct.id, heroProduct.image);

                return (
                  <View
                    key={partnerName}
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
                          <View key={item.id} style={[styles.restaurantDishCard, { borderColor: colors.border }]}>
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
                                  color={wishlistIdSet.has(item.id) ? '#ff4d6d' : colors.textSecondary}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.restaurantQuickAdd, { backgroundColor: Colors.primary }]}
                                onPress={() => addToCart(item, 1)}
                              >
                                <Text style={styles.restaurantQuickAddText}>Add</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
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
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.cartFab} onPress={() => setScreenMode('checkout')}>
        <Ionicons name="cart" size={16} color="#FFFFFF" />
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
    mealsInfoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: Spacing.sm,
      marginBottom: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
    },
    mealsInfoIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mealsInfoTextWrap: { flex: 1 },
    mealsInfoTitle: {
      fontSize: Typography.sizes.body,
      fontWeight: Typography.weights.bold,
      marginBottom: 4,
    },
    mealsInfoSub: {
      fontSize: Typography.sizes.caption,
      lineHeight: 18,
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
    imagePlaceholderTiny: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: '#FFFFFF',
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
    productImagePlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: '#FFFFFF',
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
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
    restaurantBlock: {
      marginBottom: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      ...Shadows.small,
    },
    restaurantHero: {
      height: 154,
      borderRadius: BorderRadius.md,
      overflow: 'hidden',
      position: 'relative',
      marginBottom: 10,
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
      backgroundColor: 'rgba(17,24,39,0.52)',
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
      backgroundColor: 'rgba(139,92,246,0.92)',
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
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.sm,
      borderWidth: 1,
      overflow: 'hidden',
      paddingBottom: 10,
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
      borderWidth: 1,
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

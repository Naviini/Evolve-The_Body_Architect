
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import StoreProductCard from '../../components/store/StoreProductCard';
import CartScreen from '../../components/store/CartScreen';
import { CartProvider, useCart } from '../../components/store/CartContext';
import { OrderProvider, useOrders } from '../../components/store/OrderContext';
import OrderHistoryScreen from '../../components/store/OrderHistoryScreen';
import { products } from '../../components/store/products';
import { getPersonalizedRecommendations } from '../../src/services/recommendationService';
import { getOnboardingProfile, getDailyLog, initDatabase } from '../../src/lib/database';
import { useAuth } from '../../src/contexts/AuthContext';



const categories = [
  { id: 'cat1', name: 'Supplements', icon: 'https://img.icons8.com/color/48/000000/vitamins.png' },
  { id: 'cat2', name: 'Food & Drink', icon: 'https://img.icons8.com/color/48/000000/salad.png' },
  { id: 'cat3', name: 'Gear', icon: 'https://img.icons8.com/color/48/000000/dumbbell.png' },
  { id: 'cat4', name: 'Accessories', icon: 'https://img.icons8.com/color/48/000000/water-bottle.png' },
  { id: 'cat5', name: 'Health', icon: 'https://img.icons8.com/color/48/000000/heart-with-pulse.png' },
  { id: 'cat6', name: 'Body Care', icon: 'https://img.icons8.com/color/48/000000/skin-care.png' },
];

const tabs = ['For You', 'Voucher Max', 'Global Deals', 'New'];


function StoreScreenInner() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  const { user } = useAuth();
  const { addToCart, cart } = useCart();
  const { addOrder } = useOrders();
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('For You');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        await initDatabase();
        const onboarding = await getOnboardingProfile(user.id);
        const today = new Date().toISOString().split('T')[0];
        const daily = await getDailyLog(user.id, today);
        const recUser = {
          deficiencies: onboarding?.deficiencies || [],
          allergies: onboarding?.food_allergies || [],
          goals: onboarding?.dream_food_habits || [],
        };
        const recDaily = {
          consumedFoods: daily?.consumed_foods || [],
          recentWorkouts: daily?.recent_workouts || [],
        };
        const recs = getPersonalizedRecommendations(recUser, recDaily);
        setRecommended(recs);
      } catch (error) {
        console.error('Store data init error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleCheckout = () => {
    // Simulate payment and add order
    if (cart.length === 0) return;
    const order = {
      id: Date.now().toString(),
      items: cart.map(item => ({ name: item.product.name, quantity: item.quantity, price: item.product.price })),
      total: cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
      date: new Date().toLocaleString(),
      status: 'paid',
    };
    addOrder(order);
    setShowCart(false);
    alert('Payment successful! Order placed.');
  };

  if (showCart) {
    return <CartScreen onCheckout={handleCheckout} />;
  }
  if (showOrders) {
    return <OrderHistoryScreen />;
  }

  // Filter products by search
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>🏋️‍♂️ FitStore</Text>
        <View style={styles.topIcons}>
          <TouchableOpacity><Ionicons name="cart-outline" size={24} color={colors.primary} /></TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 16 }}><Ionicons name="notifications-outline" size={24} color={colors.primary} /></TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} color={colors.textTertiary} style={{ marginHorizontal: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Find healthy food, gear, supplements..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.searchBtn}><Ionicons name="camera-outline" size={20} color={colors.primary} /></TouchableOpacity>
      </View>

      {/* (Optional) Delivery/Location Row */}
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={16} color={colors.primary} />
        <Text style={styles.locationText}>Deliver to: Your Fitness Profile</Text>
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
        {categories.map(cat => (
          <TouchableOpacity key={cat.id} style={[styles.catCircle, { backgroundColor: colors.card }]}> 
            <Image source={{ uri: cat.icon }} style={styles.catIcon} />
            <Text style={[styles.catLabel, { color: colors.textPrimary }]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* New Arrivals */}
      <View style={[styles.arrivalsCard, { backgroundColor: colors.card }]}> 
        <Image source={{ uri: 'https://img.icons8.com/color/96/000000/shirt.png' }} style={styles.arrivalsImg} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.arrivalsTitle, { color: colors.textPrimary }]}>New Arrivals</Text>
          <TouchableOpacity style={[styles.arrivalsBtn, { backgroundColor: colors.primary }]}> 
            <Text style={[styles.arrivalsBtnText, { color: colors.buttonText }]}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Flash Sale / Featured */}
      <View style={styles.flashRow}>
        <Text style={[styles.flashTitle, { color: colors.textPrimary }]}>Flash Sale</Text>
        <TouchableOpacity><Text style={[styles.flashSeeAll, { color: colors.primary }]}>See all</Text></TouchableOpacity>
      </View>
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.flashCard, { backgroundColor: colors.card }]}> 
            <Image source={{ uri: item.image || 'https://img.icons8.com/color/96/000000/box.png' }} style={styles.flashImg} />
            <Text style={[styles.flashName, { color: colors.textPrimary }]}>{item.name}</Text>
            <Text style={[styles.flashPrice, { color: colors.success }]}>{`Rs.${item.price.toLocaleString()}`}</Text>
            <TouchableOpacity style={[styles.flashAddBtn, { backgroundColor: colors.primary }]} onPress={() => addToCart(item)}>
              <Text style={[styles.flashAddText, { color: colors.buttonText }]}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.flashList}
      />

      {/* Floating Cart Button */}
      <CartFloatingButton count={cart.length} onPress={() => setShowCart(true)} />
      {/* Order History Button */}
      <View style={{ position: 'absolute', top: 32, right: 24 }}>
        <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }} onPress={() => setShowOrders(true)}>
          View Order History
        </Text>
      </View>
    </View>
  );
}

function AddToCartButton({ product, onAdd }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={{ color: '#6c63ff', fontWeight: 'bold' }} onPress={() => onAdd(product)}>
        Add to Cart
      </Text>
    </View>
  );
}

function CartFloatingButton({ count, onPress }) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.cartFabContainer}>
      <Text style={styles.cartFab} onPress={onPress}>
        🛒 {count}
      </Text>
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

const createStyles = (colors: any) => StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  topIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: 'transparent',
    paddingVertical: 4,
  },
  searchBtn: {
    marginLeft: 8,
    padding: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  locationText: {
    color: colors.textTertiary,
    marginLeft: 4,
    fontSize: 13,
  },
  catScroll: {
    marginBottom: 8,
    marginLeft: 8,
    paddingRight: 16,
  },
  catCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderRadius: 32,
    width: 64,
    height: 64,
    elevation: 2,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  catIcon: {
    width: 32,
    height: 32,
    marginBottom: 2,
  },
  catLabel: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  arrivalsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: colors.card,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  arrivalsImg: {
    width: 64,
    height: 64,
    marginRight: 16,
  },
  arrivalsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  arrivalsBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  arrivalsBtnText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  flashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 4,
  },
  flashTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  flashSeeAll: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  flashList: {
    paddingLeft: 12,
    paddingBottom: 32,
  },
  flashCard: {
    width: 140,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginRight: 16,
    alignItems: 'center',
    padding: 12,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  flashImg: {
    width: 60,
    height: 60,
    marginBottom: 6,
  },
  flashName: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
    textAlign: 'center',
  },
  flashPrice: {
    color: colors.success,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  flashAddBtn: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  flashAddText: {
    fontWeight: 'bold',
  },
      searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
      },
      searchInput: {
        flex: 1,
        fontSize: 16,
        padding: 8,
        backgroundColor: 'transparent',
      },
      searchBtn: {
        backgroundColor: '#ff3366',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginLeft: 6,
      },
      searchBtnText: {
        color: '#fff',
        fontWeight: 'bold',
      },
      cameraBtn: {
        marginLeft: 6,
        padding: 6,
      },
      cameraIcon: {
        fontSize: 20,
      },
      featuredScroll: {
        marginBottom: 10,
      },
      featuredCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginRight: 12,
        alignItems: 'center',
        padding: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        minWidth: 120,
      },
      featuredImg: {
        width: 60,
        height: 60,
        marginBottom: 6,
      },
      featuredName: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2,
      },
      featuredPrice: {
        color: '#2e7d32',
        fontWeight: 'bold',
      },
      featuredDiscount: {
        color: '#ff3366',
        fontWeight: 'bold',
        fontSize: 12,
      },
      catSection: {
        marginBottom: 10,
      },
      catCard: {
        alignItems: 'center',
        marginRight: 16,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 8,
        elevation: 1,
        minWidth: 80,
      },
      catIcon: {
        width: 36,
        height: 36,
        marginBottom: 4,
      },
      catName: {
        fontSize: 12,
        textAlign: 'center',
      },
      tabsRow: {
        flexDirection: 'row',
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 4,
      },
      tab: {
        marginRight: 18,
        fontSize: 16,
        color: '#888',
        paddingBottom: 2,
      },
      tabActive: {
        color: '#ff3366',
        borderBottomWidth: 2,
        borderBottomColor: '#ff3366',
        fontWeight: 'bold',
      },
      grid: {
        paddingBottom: 32,
        gap: 8,
      },
      productCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 10,
        margin: 6,
        alignItems: 'center',
        padding: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        minWidth: 140,
        maxWidth: '48%',
      },
      productImg: {
        width: 60,
        height: 60,
        marginBottom: 6,
      },
      productName: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2,
        textAlign: 'center',
      },
      productPrice: {
        color: '#2e7d32',
        fontWeight: 'bold',
        marginBottom: 4,
      },
      addToCartBtn: {
        backgroundColor: '#ff3366',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 16,
        marginTop: 4,
      },
      addToCartText: {
        color: '#fff',
        fontWeight: 'bold',
      },
  cartFabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    zIndex: 10,
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cartFab: {
    backgroundColor: colors.primary,
    color: colors.buttonText,
    fontWeight: 'bold',
    fontSize: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 32,
    overflow: 'hidden',
    textAlign: 'center',
    minWidth: 64,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 0,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subheader: {
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 12,
  },
  section: {
    marginBottom: 16,
  },
  recommendList: {
    paddingBottom: 8,
  },
  list: {
    paddingBottom: 32,
  },
});

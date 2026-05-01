import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useCart } from './CartContext';

export default function CartScreen({
  onCheckout,
  onBack,
}: {
  onCheckout?: () => void;
  onBack?: () => void;
}) {
  const { cart, removeFromCart, clearCart } = useCart();
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Your Cart</Text>
      </View>
      {cart.length === 0 ? (
        <Text style={styles.empty}>Your cart is empty.</Text>
      ) : (
        <FlatList
          data={cart}
          keyExtractor={item => item.product.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.name}>{item.product.name} x{item.quantity}</Text>
              <Text style={styles.price}>Rs. {(item.product.price * item.quantity).toLocaleString()}</Text>
              <TouchableOpacity onPress={() => removeFromCart(item.product.id)}>
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <Text style={styles.total}>Total: Rs. {total.toLocaleString()}</Text>
      <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout} disabled={cart.length === 0}>
        <Text style={styles.checkoutText}>Checkout</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.clearBtn} onPress={clearCart} disabled={cart.length === 0}>
        <Text style={styles.clearText}>Clear Cart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { color: '#6c63ff', fontSize: 16, fontWeight: '700', marginRight: 12 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  empty: { fontSize: 16, color: '#888', marginVertical: 32 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' },
  name: { fontSize: 16, flex: 1 },
  price: { fontSize: 16, color: '#2e7d32', fontWeight: '600', marginHorizontal: 8 },
  remove: { color: '#e53935', fontWeight: 'bold' },
  total: { fontSize: 20, fontWeight: 'bold', marginVertical: 16 },
  checkoutBtn: { backgroundColor: '#6c63ff', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  checkoutText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  clearBtn: { backgroundColor: '#eee', padding: 10, borderRadius: 8, alignItems: 'center' },
  clearText: { color: '#888', fontWeight: 'bold' },
});

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useOrders } from './OrderContext';

export default function OrderHistoryScreen() {
  const { orders } = useOrders();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Order History</Text>
      {orders.length === 0 ? (
        <Text style={styles.empty}>No orders yet.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.order}>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.status}>{item.status === 'paid' ? 'Paid' : 'Pending'}</Text>
              <FlatList
                data={item.items}
                keyExtractor={i => i.name}
                renderItem={({ item: prod }) => (
                  <Text style={styles.item}>{prod.name} x{prod.quantity} - ${prod.price.toFixed(2)}</Text>
                )}
              />
              <Text style={styles.total}>Total: ${item.total.toFixed(2)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  empty: { fontSize: 16, color: '#888', marginVertical: 32 },
  order: { marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 10 },
  date: { fontSize: 14, color: '#888' },
  status: { fontWeight: 'bold', marginBottom: 8 },
  item: { fontSize: 16 },
  total: { fontWeight: 'bold', marginTop: 8 },
});

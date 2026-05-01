import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface StoreProductCardProps {
  product: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
}

const StoreProductCard: React.FC<StoreProductCardProps> = ({ product }) => {
  return (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.category}>{product.category}</Text>
      <Text style={styles.price}>${product.price.toFixed(2)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  category: {
    fontSize: 14,
    color: '#888',
    marginVertical: 4,
  },
  price: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '600',
  },
});

export default StoreProductCard;

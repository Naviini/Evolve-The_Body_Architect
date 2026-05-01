// This is a placeholder for a backend API route or service to fetch products.
// In a real app, this would connect to a database or external API.

import { products, StoreProduct } from '../../components/store/products';

export function getAllProducts(): StoreProduct[] {
  // In a real backend, fetch from DB
  return products;
}

export function getProductById(id: string): StoreProduct | undefined {
  return products.find(p => p.id === id);
}

// For future: add, update, delete products, etc.

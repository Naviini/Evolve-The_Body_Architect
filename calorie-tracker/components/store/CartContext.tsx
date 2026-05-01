import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { StoreProduct } from '../../components/store/products';
import { useAuth } from '../../src/contexts/AuthContext';
import { clearStoreCart, getStoreCartItems, initDatabase, removeStoreCartItem, upsertStoreCartItem } from '../../src/lib/database';

interface CartItem {
  product: StoreProduct;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  loading: boolean;
  addToCart: (product: StoreProduct, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const activeUserId = useMemo(() => user?.id || 'guest-store-user', [user?.id]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadCart = async () => {
      setLoading(true);
      try {
        await initDatabase();
        const persisted = await getStoreCartItems(activeUserId);
        if (!mounted) return;
        setCart(
          persisted.map(item => ({
            product: item.product,
            quantity: item.quantity,
          }))
        );
      } catch (error) {
        console.error('Failed to load store cart:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadCart();
    return () => {
      mounted = false;
    };
  }, [activeUserId]);

  const addToCart = (product: StoreProduct, quantity: number = 1) => {
    if (quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });

    upsertStoreCartItem(activeUserId, product, quantity).catch(error => {
      console.error('Failed to persist cart item:', error);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    removeStoreCartItem(activeUserId, productId).catch(error => {
      console.error('Failed to remove cart item:', error);
    });
  };

  const clearCart = () => {
    setCart([]);
    clearStoreCart(activeUserId).catch(error => {
      console.error('Failed to clear cart:', error);
    });
  };

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { createStoreOrder, getStoreOrders, initDatabase, updateStoreOrderStatus } from '../../src/lib/database';
import { StoreProduct } from './products';

interface Order {
  id: string;
  items: { name: string; quantity: number; price: number; product?: StoreProduct }[];
  subtotal?: number;
  shippingFee?: number;
  discount?: number;
  promoCode?: string;
  shippingAddress?: string;
  total: number;
  date: string;
  status: 'paid' | 'pending' | 'processing';
}

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Order) => Promise<void>;
  updateOrderStatus: (orderId: string, status: 'paid' | 'pending' | 'processing') => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const activeUserId = useMemo(() => user?.id || 'guest-store-user', [user?.id]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadOrders = async () => {
      setLoading(true);
      try {
        await initDatabase();
        const persisted = await getStoreOrders(activeUserId);
        if (!mounted) return;
        setOrders(
          persisted.map(order => ({
            id: order.id,
            items: order.items.map(item => ({
              name: item.productName,
              quantity: item.quantity,
              price: item.unitPrice,
              product: item.product,
            })),
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discount: order.discount,
            promoCode: order.promoCode,
            shippingAddress: order.shippingAddress,
            total: order.total,
            date: new Date(order.placedAt).toLocaleString(),
            status: order.status,
          }))
        );
      } catch (error) {
        console.error('Failed to load orders:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOrders();
    return () => {
      mounted = false;
    };
  }, [activeUserId]);

  const addOrder = async (order: Order) => {
    const orderId = await createStoreOrder(activeUserId, {
      items: order.items.map(item => ({
        product: item.product || {
          id: `snapshot-${item.name}`,
          name: item.name,
          category: 'Unknown',
          price: item.price,
        },
        quantity: item.quantity,
      })),
      subtotal: order.subtotal ?? order.total,
      shippingFee: order.shippingFee ?? 0,
      discount: order.discount ?? 0,
      total: order.total,
      promoCode: order.promoCode,
      status: order.status,
      shippingAddress: order.shippingAddress,
    });

    setOrders(prev => [{ ...order, id: orderId }, ...prev]);
  };

  const updateOrderStatusInContext = async (
    orderId: string,
    status: 'paid' | 'pending' | 'processing'
  ) => {
    await updateStoreOrderStatus(orderId, status);
    setOrders(prev =>
      prev.map(order => (order.id === orderId ? { ...order, status } : order))
    );
  };

  return (
    <OrderContext.Provider value={{ orders, loading, addOrder, updateOrderStatus: updateOrderStatusInContext }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used within an OrderProvider');
  return ctx;
}

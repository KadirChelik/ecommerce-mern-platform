import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { INITIAL_ORDERS, INITIAL_PRODUCTS } from '../../shared/catalogSeed.js';
import { calculateCartTotals, getVariantStock } from '../../shared/commerce.js';
import type {
  AdminOverviewStats,
  AuthUser,
  CartItem,
  CartTotals,
  Language,
  Order,
  OrderStatus,
  Product,
  UserRole,
} from '../../shared/types.js';
import { TRANSLATIONS } from '../i18n/translations.js';

const STORAGE_KEYS = {
  lang: 'hann_v2_lang',
  cart: 'hann_v2_cart',
  coupon: 'hann_v2_coupon',
  orders: 'hann_v2_orders',
  products: 'hann_v2_products',
  role: 'hann_v2_role',
} as const;

export interface CreateOrderRequest {
  shipping: Order['shipping'];
  deliveryMethod: 'standard' | 'express';
  paymentLast4: string;
  couponCode?: string;
}

interface StoreContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (typeof TRANSLATIONS)['tr'];
  user: AuthUser;
  token: string | null;
  switchRole: (role: UserRole) => Promise<void>;
  products: Product[];
  orders: Order[];
  overview: AdminOverviewStats | null;
  storageMode: 'demo' | 'mongodb';
  s3Configured: boolean;
  loading: boolean;
  cart: CartItem[];
  couponCode: string;
  setCouponCode: (code: string) => void;
  cartTotals: CartTotals;
  totalCartCount: number;
  addToCart: (product: Product, sku: string, quantity?: number) => { added: boolean; reason?: string };
  updateCartQty: (sku: string, quantity: number) => void;
  removeFromCart: (sku: string) => void;
  clearCart: () => void;
  placeOrder: (input: CreateOrderRequest) => Promise<Order>;
  createProduct: (payload: Omit<Product, 'id' | 'slug' | 'createdAt'> & { slug?: string }) => Promise<Product>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<Order>;
  refreshAdminOverview: () => Promise<void>;
  resetDemoState: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function buildLocalOverview(products: Product[], orders: Order[]): AdminOverviewStats {
  const totalRevenueTry = orders.reduce((s, o) => s + o.totalTry, 0);
  const totalOrders = orders.length;
  const averageOrderValueTry = totalOrders > 0 ? Math.round(totalRevenueTry / totalOrders) : 0;
  let lowStockSkuCount = 0;
  let outOfStockSkuCount = 0;
  const categoryMap = new Map(products.map((p) => [p.id, p.category]));
  const catTotals = {
    outerwear: { revenueTry: 0, units: 0 },
    women: { revenueTry: 0, units: 0 },
    men: { revenueTry: 0, units: 0 },
    tailoring: { revenueTry: 0, units: 0 },
  };

  for (const p of products) {
    for (const v of p.variants) {
      if (v.stock === 0) outOfStockSkuCount += 1;
      else if (v.stock <= 3) lowStockSkuCount += 1;
    }
  }
  for (const o of orders) {
    for (const item of o.items) {
      const cat = categoryMap.get(item.productId) ?? 'outerwear';
      catTotals[cat].revenueTry += item.unitPriceTry * item.quantity;
      catTotals[cat].units += item.quantity;
    }
  }
  return {
    totalRevenueTry,
    totalOrders,
    averageOrderValueTry,
    lowStockSkuCount,
    outOfStockSkuCount,
    revenueByMonth: [
      { month: 'Jun', revenueTry: 38400, orders: 8 },
      { month: 'Jul', revenueTry: 42150, orders: 10 },
      { month: 'Aug', revenueTry: 49800, orders: 11 },
      { month: 'Sep', revenueTry: 56200, orders: 13 },
      { month: 'Oct', revenueTry: 64900, orders: 15 },
      { month: 'Nov', revenueTry: 52000 + totalRevenueTry, orders: 11 + totalOrders },
    ],
    revenueByCategory: (Object.keys(catTotals) as Array<keyof typeof catTotals>).map((category) => ({
      category,
      revenueTry: catTotals[category].revenueTry,
      units: catTotals[category].units,
    })),
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.lang);
    return saved === 'en' ? 'en' : 'tr';
  });

  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.role);
    return saved === 'admin' ? 'admin' : 'customer';
  });

  const [user, setUser] = useState<AuthUser>(() =>
    role === 'admin'
      ? { id: 'usr-admin-demo', name: 'Kadir Çelik (Studio Admin)', email: 'admin@hannstudio.com', role: 'admin' }
      : { id: 'usr-customer-demo', name: 'Selin Demir', email: 'selin.demir@example.com', role: 'customer' },
  );
  const [token, setToken] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(() =>
    readLocalJson<Product[]>(STORAGE_KEYS.products, INITIAL_PRODUCTS),
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    readLocalJson<Order[]>(STORAGE_KEYS.orders, INITIAL_ORDERS),
  );
  const [cart, setCart] = useState<CartItem[]>(() => readLocalJson<CartItem[]>(STORAGE_KEYS.cart, []));
  const [couponCode, setCouponCodeState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.coupon) ?? '',
  );
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [storageMode, setStorageMode] = useState<'demo' | 'mongodb'>('demo');
  const [s3Configured, setS3Configured] = useState(false);
  const [loading, setLoading] = useState(true);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEYS.lang, next);
  }, []);

  const setCouponCode = useCallback((code: string) => {
    setCouponCodeState(code);
    localStorage.setItem(STORAGE_KEYS.coupon, code);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
  }, [orders]);

  const fetchOrdersForToken = useCallback(async (authToken: string | null): Promise<Order[] | null> => {
    if (!authToken) return null;
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { orders: Order[] };
        return Array.isArray(data.orders) ? data.orders : null;
      }
    } catch {
      // network offline
    }
    return null;
  }, []);

  const fetchOverviewForToken = useCallback(async (authToken: string | null, nextRole: UserRole) => {
    if (!authToken || nextRole !== 'admin') return;
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          overview: AdminOverviewStats;
          storageMode: 'demo' | 'mongodb';
          s3Configured: boolean;
        };
        setStorageMode(data.storageMode);
        setS3Configured(data.s3Configured);
        setOverview(data.overview);
      }
    } catch {
      // keep existing/fallback overview
    }
  }, []);

  const authenticateRole = useCallback(async (nextRole: UserRole): Promise<string | null> => {
    setRole(nextRole);
    localStorage.setItem(STORAGE_KEYS.role, nextRole);
    try {
      const res = await fetch('/api/auth/demo-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      if (res.ok) {
        const data = (await res.json()) as { user: AuthUser; token: string };
        setUser(data.user);
        setToken(data.token);
        return data.token;
      }
    } catch {
      // Fallback to local user object if offline
    }
    setUser(
      nextRole === 'admin'
        ? { id: 'usr-admin-demo', name: 'Kadir Çelik (Studio Admin)', email: 'admin@hannstudio.com', role: 'admin' }
        : { id: 'usr-customer-demo', name: 'Selin Demir', email: 'selin.demir@example.com', role: 'customer' },
    );
    return null;
  }, []);

  const switchRole = useCallback(
    async (nextRole: UserRole) => {
      const nextToken = await authenticateRole(nextRole);
      if (nextToken) {
        const serverOrders = await fetchOrdersForToken(nextToken);
        if (serverOrders) {
          setOrders(serverOrders);
        }
        await fetchOverviewForToken(nextToken, nextRole);
      }
    },
    [authenticateRole, fetchOrdersForToken, fetchOverviewForToken],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const initialToken = await authenticateRole(role);
        if (!active) return;

        const [healthRes, prodRes, serverOrders] = await Promise.all([
          fetch('/api/health').catch(() => null),
          fetch('/api/products').catch(() => null),
          fetchOrdersForToken(initialToken),
        ]);
        if (!active) return;

        if (healthRes?.ok) {
          const h = (await healthRes.json()) as { storageMode: 'demo' | 'mongodb'; s3Configured: boolean };
          setStorageMode(h.storageMode);
          setS3Configured(h.s3Configured);
        }
        // Server is primary source of truth when reachable; localStorage remains offline fallback
        if (prodRes?.ok) {
          const p = (await prodRes.json()) as { products: Product[] };
          if (Array.isArray(p.products)) setProducts(p.products);
        }
        if (serverOrders) {
          setOrders(serverOrders);
        }
        if (initialToken && role === 'admin') {
          await fetchOverviewForToken(initialToken, role);
        }
      } catch {
        // Seeded / cached state already available synchronously for offline fallback
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAdminOverview = useCallback(async () => {
    if (token && user.role === 'admin') {
      try {
        const res = await fetch('/api/admin/overview', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as {
            overview: AdminOverviewStats;
            storageMode: 'demo' | 'mongodb';
            s3Configured: boolean;
          };
          setStorageMode(data.storageMode);
          setS3Configured(data.s3Configured);
          setOverview(data.overview);
          return;
        }
      } catch {
        // fallback below when offline
      }
    }
    setOverview(buildLocalOverview(products, orders));
  }, [orders, products, token, user.role]);

  useEffect(() => {
    setOverview((prev) => prev ?? buildLocalOverview(products, orders));
  }, [products, orders]);

  const addToCart = useCallback(
    (product: Product, sku: string, quantity = 1): { added: boolean; reason?: string } => {
      const stock = getVariantStock(product, sku);
      const variant = product.variants.find((v) => v.sku === sku);
      if (!variant || stock <= 0) {
        return { added: false, reason: 'OUT_OF_STOCK' };
      }

      const existing = cart.find((item) => item.sku === sku);
      const nextQty = (existing?.quantity ?? 0) + quantity;
      if (nextQty > stock) {
        return { added: false, reason: 'MAX_STOCK' };
      }

      setCart((prev) => {
        const idx = prev.findIndex((item) => item.sku === sku);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity };
          return copy;
        }
        return [
          ...prev,
          {
            productId: product.id,
            sku,
            colorId: variant.colorId,
            size: variant.size,
            quantity,
            titleSnapshot: product.title,
            priceTry: product.priceTry,
            image: product.image,
          },
        ];
      });
      return { added: true };
    },
    [cart],
  );

  const updateCartQty = useCallback(
    (sku: string, quantity: number) => {
      if (quantity <= 0) {
        setCart((prev) => prev.filter((item) => item.sku !== sku));
        return;
      }
      setCart((prev) =>
        prev.map((item) => {
          if (item.sku !== sku) return item;
          const product = products.find((p) => p.id === item.productId);
          const maxStock = product ? getVariantStock(product, sku) : 20;
          return { ...item, quantity: Math.min(quantity, Math.max(1, maxStock)) };
        }),
      );
    },
    [products],
  );

  const removeFromCart = useCallback((sku: string) => {
    setCart((prev) => prev.filter((item) => item.sku !== sku));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCouponCode('');
  }, [setCouponCode]);

  const cartTotals = useMemo(
    () => calculateCartTotals(cart, couponCode, 'standard'),
    [cart, couponCode],
  );

  const totalCartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const placeOrder = useCallback(
    async (input: CreateOrderRequest): Promise<Order> => {
      const payload = {
        ...input,
        items: cart.map((c) => ({ productId: c.productId, sku: c.sku, quantity: c.quantity })),
      };

      let createdOrder: Order | null = null;
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = (await res.json()) as { order: Order };
          createdOrder = data.order;
        } else if (res.status >= 400 && res.status < 500) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errBody.error || 'Order validation or stock error');
        }
      } catch (err) {
        // Re-throw 4xx business/stock errors; only fall back to local simulation on network failures
        if (err instanceof Error && !(err instanceof TypeError)) {
          throw err;
        }
      }

      if (!createdOrder) {
        const totals = calculateCartTotals(cart, input.couponCode, input.deliveryMethod);
        const now = new Date().toISOString();
        createdOrder = {
          id: `ord-${Date.now().toString(36)}`,
          orderNumber: `HN-2026-${1044 + orders.length}`,
          customerEmail: input.shipping.email,
          shipping: input.shipping,
          deliveryMethod: input.deliveryMethod,
          paymentLast4: input.paymentLast4,
          couponCode: totals.appliedCoupon?.code,
          subtotalTry: totals.subtotalTry,
          discountTry: totals.discountTry,
          shippingTry: totals.shippingTry,
          totalTry: totals.totalTry,
          status: 'received',
          items: cart.map((item) => {
            const prod = products.find((p) => p.id === item.productId);
            const col = prod?.colors.find((c) => c.id === item.colorId);
            return {
              productId: item.productId,
              sku: item.sku,
              title: item.titleSnapshot,
              colorName: col?.name ?? { tr: item.colorId, en: item.colorId },
              size: item.size,
              quantity: item.quantity,
              unitPriceTry: item.priceTry,
              image: item.image,
            };
          }),
          timeline: [
            {
              status: 'received',
              timestamp: now,
              note: {
                tr: 'Siparişiniz Studio sistemine ulaştı.',
                en: 'Order confirmed in Studio system.',
              },
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
      }

      // Decrement local product stock cleanly
      setProducts((prev) =>
        prev.map((p) => {
          const orderedForProd = cart.filter((c) => c.productId === p.id);
          if (orderedForProd.length === 0) return p;
          return {
            ...p,
            variants: p.variants.map((v) => {
              const match = orderedForProd.find((c) => c.sku === v.sku);
              return match ? { ...v, stock: Math.max(0, v.stock - match.quantity) } : v;
            }),
          };
        }),
      );

      setOrders((prev) => [createdOrder!, ...prev]);
      clearCart();
      if (token && user.role === 'admin') {
        void fetchOverviewForToken(token, user.role);
      }
      return createdOrder;
    },
    [cart, clearCart, fetchOverviewForToken, orders.length, products, token, user.role],
  );

  const ensureAdminToken = useCallback(async (): Promise<string | null> => {
    if (token && user.role === 'admin') return token;
    const res = await fetch('/api/auth/demo-switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: AuthUser; token: string };
    setUser(data.user);
    setToken(data.token);
    return data.token;
  }, [token, user.role]);

  const createProduct = useCallback(
    async (payload: Omit<Product, 'id' | 'slug' | 'createdAt'> & { slug?: string }): Promise<Product> => {
      const authToken = await ensureAdminToken();
      let created: Product | null = null;
      if (authToken) {
        try {
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = (await res.json()) as { product: Product };
            created = data.product;
          }
        } catch {
          // fallback below
        }
      }
      if (!created) {
        const id = `prod-${Date.now().toString(36)}`;
        created = {
          ...payload,
          id,
          slug: payload.slug || id,
          createdAt: new Date().toISOString(),
        };
      }
      setProducts((prev) => [created!, ...prev]);
      if (authToken) void fetchOverviewForToken(authToken, 'admin');
      return created;
    },
    [ensureAdminToken, fetchOverviewForToken],
  );

  const updateProduct = useCallback(
    async (id: string, patch: Partial<Product>): Promise<Product> => {
      const authToken = await ensureAdminToken();
      let updated: Product | null = null;
      if (authToken) {
        try {
          const res = await fetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(patch),
          });
          if (res.ok) {
            const data = (await res.json()) as { product: Product };
            updated = data.product;
          }
        } catch {
          // fallback below
        }
      }
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const next = updated ?? { ...p, ...patch, id: p.id, createdAt: p.createdAt };
          updated = next;
          return next;
        }),
      );
      if (!updated) throw new Error('Product not found');
      if (authToken) void fetchOverviewForToken(authToken, 'admin');
      return updated;
    },
    [ensureAdminToken, fetchOverviewForToken],
  );

  const deleteProduct = useCallback(
    async (id: string): Promise<void> => {
      const authToken = await ensureAdminToken();
      if (authToken) {
        try {
          await fetch(`/api/products/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` },
          });
        } catch {
          // fallback below
        }
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (authToken) void fetchOverviewForToken(authToken, 'admin');
    },
    [ensureAdminToken, fetchOverviewForToken],
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus): Promise<Order> => {
      const authToken = await ensureAdminToken();
      let updatedOrder: Order | null = null;
      if (authToken) {
        try {
          const res = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ status }),
          });
          if (res.ok) {
            const data = (await res.json()) as { order: Order };
            updatedOrder = data.order;
          }
        } catch {
          // fallback below
        }
      }
      const now = new Date().toISOString();
      const notes: Record<OrderStatus, { tr: string; en: string }> = {
        received: { tr: 'Sipariş alındı.', en: 'Order received.' },
        preparing: { tr: 'Studio deposunda hazırlanıyor.', en: 'Preparing at studio warehouse.' },
        shipped: { tr: 'Kargoya teslim edildi.', en: 'Dispatched with courier.' },
        delivered: { tr: 'Alıcıya teslim edildi.', en: 'Delivered to recipient.' },
      };

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId && o.orderNumber !== orderId) return o;
          const next =
            updatedOrder ??
            ({
              ...o,
              status,
              updatedAt: now,
              timeline: [...o.timeline, { status, timestamp: now, note: notes[status] }],
            } satisfies Order);
          updatedOrder = next;
          return next;
        }),
      );
      if (!updatedOrder) throw new Error('Order not found');
      if (authToken) void fetchOverviewForToken(authToken, 'admin');
      return updatedOrder;
    },
    [ensureAdminToken, fetchOverviewForToken],
  );

  const resetDemoState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.products);
    localStorage.removeItem(STORAGE_KEYS.orders);
    localStorage.removeItem(STORAGE_KEYS.cart);
    localStorage.removeItem(STORAGE_KEYS.coupon);
    setProducts(structuredClone(INITIAL_PRODUCTS));
    setOrders(structuredClone(INITIAL_ORDERS));
    setCart([]);
    setCouponCodeState('');
  }, []);

  const value: StoreContextValue = {
    lang,
    setLang,
    t: TRANSLATIONS[lang],
    user,
    token,
    switchRole,
    products,
    orders,
    overview,
    storageMode,
    s3Configured,
    loading,
    cart,
    couponCode,
    setCouponCode,
    cartTotals,
    totalCartCount,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    placeOrder,
    createProduct,
    updateProduct,
    deleteProduct,
    updateOrderStatus,
    refreshAdminOverview,
    resetDemoState,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

import { MongoClient, type Db } from 'mongodb';
import { INITIAL_ORDERS, INITIAL_PRODUCTS } from '../shared/catalogSeed.js';
import { calculateCartTotals } from '../shared/commerce.js';
import type {
  AdminOverviewStats,
  CartItem,
  CategoryId,
  Order,
  OrderItemRecord,
  OrderStatus,
  Product,
} from '../shared/types.js';

export interface CreateOrderInput {
  shipping: Order['shipping'];
  deliveryMethod: 'standard' | 'express';
  paymentLast4: string;
  couponCode?: string;
  items: Array<{ productId: string; sku: string; quantity: number }>;
}

export class StoreError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface CommerceStore {
  mode: 'demo' | 'mongodb';
  listProducts(): Promise<Product[]>;
  getProduct(idOrSlug: string): Promise<Product | null>;
  createProduct(data: Omit<Product, 'id' | 'slug' | 'createdAt'> & { slug?: string }): Promise<Product>;
  updateProduct(id: string, patch: Partial<Product>): Promise<Product | null>;
  deleteProduct(id: string): Promise<boolean>;
  listOrders(filter?: { email?: string; orderNumber?: string }): Promise<Order[]>;
  getOrder(idOrNumber: string): Promise<Order | null>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  updateOrderStatus(id: string, status: OrderStatus, noteTr?: string, noteEn?: string): Promise<Order | null>;
  getAdminOverview(): Promise<AdminOverviewStats>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

const DEFAULT_STATUS_NOTES: Record<OrderStatus, { tr: string; en: string }> = {
  received: { tr: 'Siparişiniz Studio sistemine ulaştı.', en: 'Order confirmed in Studio system.' },
  preparing: { tr: 'Kalite kontrolü ve özel paketleme aşamasında.', en: 'Undergoing quality check and studio packing.' },
  shipped: { tr: 'Kurye teslim aldı ve dağıtıma çıktı.', en: 'Dispatched with express courier.' },
  delivered: { tr: 'Sipariş alıcıya teslim edildi.', en: 'Order delivered to recipient.' },
};

function computeOverview(products: Product[], orders: Order[]): AdminOverviewStats {
  const totalRevenueTry = orders.reduce((sum, o) => sum + o.totalTry, 0);
  const totalOrders = orders.length;
  const averageOrderValueTry = totalOrders > 0 ? Math.round(totalRevenueTry / totalOrders) : 0;

  let lowStockSkuCount = 0;
  let outOfStockSkuCount = 0;
  const productCategoryMap = new Map<string, CategoryId>();

  for (const product of products) {
    productCategoryMap.set(product.id, product.category);
    for (const v of product.variants) {
      if (v.stock === 0) outOfStockSkuCount += 1;
      else if (v.stock <= 3) lowStockSkuCount += 1;
    }
  }

  const categoryTotals: Record<CategoryId, { revenueTry: number; units: number }> = {
    outerwear: { revenueTry: 0, units: 0 },
    women: { revenueTry: 0, units: 0 },
    men: { revenueTry: 0, units: 0 },
    tailoring: { revenueTry: 0, units: 0 },
  };

  for (const order of orders) {
    for (const item of order.items) {
      const cat = productCategoryMap.get(item.productId) ?? 'outerwear';
      categoryTotals[cat].revenueTry += item.unitPriceTry * item.quantity;
      categoryTotals[cat].units += item.quantity;
    }
  }

  // Monthly baseline + live order contribution
  const liveNovRevenue = orders.reduce((s, o) => s + o.totalTry, 0);
  const revenueByMonth = [
    { month: 'Jun', revenueTry: 38400, orders: 8 },
    { month: 'Jul', revenueTry: 42150, orders: 10 },
    { month: 'Aug', revenueTry: 49800, orders: 11 },
    { month: 'Sep', revenueTry: 56200, orders: 13 },
    { month: 'Oct', revenueTry: 64900, orders: 15 },
    { month: 'Nov', revenueTry: 52000 + liveNovRevenue, orders: 11 + orders.length },
  ];

  const revenueByCategory = (Object.keys(categoryTotals) as CategoryId[]).map((category) => ({
    category,
    revenueTry: categoryTotals[category].revenueTry,
    units: categoryTotals[category].units,
  }));

  return {
    totalRevenueTry,
    totalOrders,
    averageOrderValueTry,
    lowStockSkuCount,
    outOfStockSkuCount,
    revenueByMonth,
    revenueByCategory,
  };
}

export class DemoStore implements CommerceStore {
  mode = 'demo' as const;
  private products: Product[] = structuredClone(INITIAL_PRODUCTS);
  private orders: Order[] = structuredClone(INITIAL_ORDERS);

  reset(): void {
    this.products = structuredClone(INITIAL_PRODUCTS);
    this.orders = structuredClone(INITIAL_ORDERS);
  }

  async listProducts(): Promise<Product[]> {
    return structuredClone(this.products);
  }

  async getProduct(idOrSlug: string): Promise<Product | null> {
    const found = this.products.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
    return found ? structuredClone(found) : null;
  }

  async createProduct(
    data: Omit<Product, 'id' | 'slug' | 'createdAt'> & { slug?: string },
  ): Promise<Product> {
    const id = `prod-${Date.now().toString(36)}`;
    const baseSlug = slugify(data.slug || data.title.en || data.title.tr) || id;
    const uniqueSlug = this.products.some((p) => p.slug === baseSlug)
      ? `${baseSlug}-${Date.now().toString(36).slice(-4)}`
      : baseSlug;

    const created: Product = {
      ...structuredClone(data),
      id,
      slug: uniqueSlug,
      createdAt: new Date().toISOString(),
    };
    this.products.unshift(created);
    return structuredClone(created);
  }

  async updateProduct(id: string, patch: Partial<Product>): Promise<Product | null> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const current = this.products[index];
    const updated: Product = {
      ...current,
      ...structuredClone(patch),
      id: current.id,
      createdAt: current.createdAt,
    };
    this.products[index] = updated;
    return structuredClone(updated);
  }

  async deleteProduct(id: string): Promise<boolean> {
    const before = this.products.length;
    this.products = this.products.filter((p) => p.id !== id);
    return this.products.length < before;
  }

  async listOrders(filter?: { email?: string; orderNumber?: string }): Promise<Order[]> {
    let result = [...this.orders];
    if (filter?.email) {
      const targetEmail = filter.email.trim().toLowerCase();
      result = result.filter((o) => o.customerEmail.toLowerCase() === targetEmail);
    }
    if (filter?.orderNumber) {
      const targetNum = filter.orderNumber.trim().toLowerCase();
      result = result.filter((o) => o.orderNumber.toLowerCase() === targetNum);
    }
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return structuredClone(result);
  }

  async getOrder(idOrNumber: string): Promise<Order | null> {
    const target = idOrNumber.trim().toLowerCase();
    const found = this.orders.find(
      (o) => o.id.toLowerCase() === target || o.orderNumber.toLowerCase() === target,
    );
    return found ? structuredClone(found) : null;
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const resolvedItems: OrderItemRecord[] = [];
    const cartForTotals: CartItem[] = [];

    // First validate all quantities against current variant stock
    for (const reqItem of input.items) {
      const product = this.products.find((p) => p.id === reqItem.productId);
      if (!product) {
        throw new StoreError(404, 'PRODUCT_NOT_FOUND', `Product ${reqItem.productId} not found`);
      }
      const variant = product.variants.find((v) => v.sku === reqItem.sku);
      if (!variant) {
        throw new StoreError(400, 'VARIANT_NOT_FOUND', `Variant ${reqItem.sku} not found`);
      }
      if (variant.stock < reqItem.quantity) {
        throw new StoreError(
          409,
          'INSUFFICIENT_STOCK',
          `Only ${variant.stock} units left for ${variant.sku}`,
        );
      }

      const colorObj = product.colors.find((c) => c.id === variant.colorId);
      resolvedItems.push({
        productId: product.id,
        sku: variant.sku,
        title: product.title,
        colorName: colorObj?.name ?? { tr: variant.colorId, en: variant.colorId },
        size: variant.size,
        quantity: reqItem.quantity,
        unitPriceTry: product.priceTry,
        image: product.image,
      });

      cartForTotals.push({
        productId: product.id,
        sku: variant.sku,
        colorId: variant.colorId,
        size: variant.size,
        quantity: reqItem.quantity,
        titleSnapshot: product.title,
        priceTry: product.priceTry,
        image: product.image,
      });
    }

    // Decrement stock
    for (const reqItem of input.items) {
      const product = this.products.find((p) => p.id === reqItem.productId)!;
      const variant = product.variants.find((v) => v.sku === reqItem.sku)!;
      variant.stock = Math.max(0, variant.stock - reqItem.quantity);
    }

    const totals = calculateCartTotals(cartForTotals, input.couponCode, input.deliveryMethod);
    const now = new Date().toISOString();
    const seq = 1044 + this.orders.length;

    const order: Order = {
      id: `ord-${Date.now().toString(36)}`,
      orderNumber: `HN-2026-${seq}`,
      customerEmail: input.shipping.email,
      shipping: structuredClone(input.shipping),
      deliveryMethod: input.deliveryMethod,
      paymentLast4: input.paymentLast4,
      couponCode: totals.appliedCoupon?.code,
      subtotalTry: totals.subtotalTry,
      discountTry: totals.discountTry,
      shippingTry: totals.shippingTry,
      totalTry: totals.totalTry,
      status: 'received',
      items: resolvedItems,
      timeline: [
        {
          status: 'received',
          timestamp: now,
          note: DEFAULT_STATUS_NOTES.received,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.orders.unshift(order);
    return structuredClone(order);
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    noteTr?: string,
    noteEn?: string,
  ): Promise<Order | null> {
    const order = this.orders.find((o) => o.id === id || o.orderNumber === id);
    if (!order) return null;

    const now = new Date().toISOString();
    order.status = status;
    order.updatedAt = now;
    order.timeline.push({
      status,
      timestamp: now,
      note: {
        tr: noteTr?.trim() || DEFAULT_STATUS_NOTES[status].tr,
        en: noteEn?.trim() || DEFAULT_STATUS_NOTES[status].en,
      },
    });
    return structuredClone(order);
  }

  async getAdminOverview(): Promise<AdminOverviewStats> {
    return computeOverview(this.products, this.orders);
  }
}

class MongoStore implements CommerceStore {
  mode = 'mongodb' as const;
  private client: MongoClient;
  private dbPromise: Promise<Db> | null = null;

  constructor(uri: string, private dbName: string) {
    this.client = new MongoClient(uri);
  }

  private async getDb(): Promise<Db> {
    if (!this.dbPromise) {
      this.dbPromise = (async () => {
        await this.client.connect();
        const db = this.client.db(this.dbName);
        const count = await db.collection<Product>('products').countDocuments();
        if (count === 0) {
          await db.collection<Product>('products').insertMany(structuredClone(INITIAL_PRODUCTS));
          await db.collection<Order>('orders').insertMany(structuredClone(INITIAL_ORDERS));
        }
        return db;
      })();
    }
    return this.dbPromise;
  }

  async listProducts(): Promise<Product[]> {
    const db = await this.getDb();
    return db.collection<Product>('products').find({}, { projection: { _id: 0 } }).toArray();
  }

  async getProduct(idOrSlug: string): Promise<Product | null> {
    const db = await this.getDb();
    return db
      .collection<Product>('products')
      .findOne({ $or: [{ id: idOrSlug }, { slug: idOrSlug }] }, { projection: { _id: 0 } });
  }

  async createProduct(
    data: Omit<Product, 'id' | 'slug' | 'createdAt'> & { slug?: string },
  ): Promise<Product> {
    const db = await this.getDb();
    const id = `prod-${Date.now().toString(36)}`;
    const slug = slugify(data.slug || data.title.en || data.title.tr) || id;
    const product: Product = {
      ...structuredClone(data),
      id,
      slug,
      createdAt: new Date().toISOString(),
    };
    await db.collection<Product>('products').insertOne(structuredClone(product));
    return product;
  }

  async updateProduct(id: string, patch: Partial<Product>): Promise<Product | null> {
    const db = await this.getDb();
    const existing = await this.getProduct(id);
    if (!existing) return null;
    const updated: Product = {
      ...existing,
      ...structuredClone(patch),
      id: existing.id,
      createdAt: existing.createdAt,
    };
    await db.collection<Product>('products').updateOne({ id }, { $set: updated });
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const db = await this.getDb();
    const res = await db.collection<Product>('products').deleteOne({ id });
    return res.deletedCount > 0;
  }

  async listOrders(filter?: { email?: string; orderNumber?: string }): Promise<Order[]> {
    const db = await this.getDb();
    const query: Record<string, unknown> = {};
    if (filter?.email) query.customerEmail = filter.email.trim();
    if (filter?.orderNumber) query.orderNumber = filter.orderNumber.trim();
    return db
      .collection<Order>('orders')
      .find(query, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getOrder(idOrNumber: string): Promise<Order | null> {
    const db = await this.getDb();
    return db
      .collection<Order>('orders')
      .findOne({ $or: [{ id: idOrNumber }, { orderNumber: idOrNumber }] }, { projection: { _id: 0 } });
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const db = await this.getDb();
    const productsCol = db.collection<Product>('products');
    const resolvedItems: OrderItemRecord[] = [];
    const cartForTotals: CartItem[] = [];

    for (const reqItem of input.items) {
      const product = await productsCol.findOne({ id: reqItem.productId }, { projection: { _id: 0 } });
      if (!product) {
        throw new StoreError(404, 'PRODUCT_NOT_FOUND', `Product ${reqItem.productId} not found`);
      }
      const variant = product.variants.find((v) => v.sku === reqItem.sku);
      if (!variant) {
        throw new StoreError(400, 'VARIANT_NOT_FOUND', `Variant ${reqItem.sku} not found`);
      }
      if (variant.stock < reqItem.quantity) {
        throw new StoreError(409, 'INSUFFICIENT_STOCK', `Only ${variant.stock} units left for ${variant.sku}`);
      }

      const colorObj = product.colors.find((c) => c.id === variant.colorId);
      resolvedItems.push({
        productId: product.id,
        sku: variant.sku,
        title: product.title,
        colorName: colorObj?.name ?? { tr: variant.colorId, en: variant.colorId },
        size: variant.size,
        quantity: reqItem.quantity,
        unitPriceTry: product.priceTry,
        image: product.image,
      });

      cartForTotals.push({
        productId: product.id,
        sku: variant.sku,
        colorId: variant.colorId,
        size: variant.size,
        quantity: reqItem.quantity,
        titleSnapshot: product.title,
        priceTry: product.priceTry,
        image: product.image,
      });
    }

    for (const reqItem of input.items) {
      await productsCol.updateOne(
        { id: reqItem.productId, 'variants.sku': reqItem.sku },
        { $inc: { 'variants.$.stock': -reqItem.quantity } },
      );
    }

    const existingCount = await db.collection<Order>('orders').countDocuments();
    const totals = calculateCartTotals(cartForTotals, input.couponCode, input.deliveryMethod);
    const now = new Date().toISOString();
    const order: Order = {
      id: `ord-${Date.now().toString(36)}`,
      orderNumber: `HN-2026-${1044 + existingCount}`,
      customerEmail: input.shipping.email,
      shipping: structuredClone(input.shipping),
      deliveryMethod: input.deliveryMethod,
      paymentLast4: input.paymentLast4,
      couponCode: totals.appliedCoupon?.code,
      subtotalTry: totals.subtotalTry,
      discountTry: totals.discountTry,
      shippingTry: totals.shippingTry,
      totalTry: totals.totalTry,
      status: 'received',
      items: resolvedItems,
      timeline: [{ status: 'received', timestamp: now, note: DEFAULT_STATUS_NOTES.received }],
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<Order>('orders').insertOne(structuredClone(order));
    return order;
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    noteTr?: string,
    noteEn?: string,
  ): Promise<Order | null> {
    const db = await this.getDb();
    const order = await this.getOrder(id);
    if (!order) return null;

    const now = new Date().toISOString();
    const entry = {
      status,
      timestamp: now,
      note: {
        tr: noteTr?.trim() || DEFAULT_STATUS_NOTES[status].tr,
        en: noteEn?.trim() || DEFAULT_STATUS_NOTES[status].en,
      },
    };
    await db.collection<Order>('orders').updateOne(
      { id: order.id },
      {
        $set: { status, updatedAt: now },
        $push: { timeline: entry },
      },
    );
    return { ...order, status, updatedAt: now, timeline: [...order.timeline, entry] };
  }

  async getAdminOverview(): Promise<AdminOverviewStats> {
    const [products, orders] = await Promise.all([this.listProducts(), this.listOrders()]);
    return computeOverview(products, orders);
  }
}

export const demoStore = new DemoStore();
let activeStore: CommerceStore | null = null;

export function getStore(): CommerceStore {
  if (activeStore) return activeStore;
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (mongoUri) {
    activeStore = new MongoStore(mongoUri, process.env.MONGODB_DB?.trim() || 'hann_studio');
  } else {
    activeStore = demoStore;
  }
  return activeStore;
}

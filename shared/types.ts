export type Language = 'tr' | 'en';
export type UserRole = 'customer' | 'admin';
export type CategoryId = 'outerwear' | 'women' | 'men' | 'tailoring';
export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc';
export type OrderStatus = 'received' | 'preparing' | 'shipped' | 'delivered';

export interface LocalizedText {
  tr: string;
  en: string;
}

export interface ProductColorOption {
  id: string;
  name: LocalizedText;
  hex: string;
}

export interface ProductVariant {
  sku: string;
  colorId: string;
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  description: LocalizedText;
  composition: LocalizedText;
  care: LocalizedText;
  category: CategoryId;
  collectionTag: string;
  priceTry: number;
  compareAtTry?: number;
  image: string;
  colors: ProductColorOption[];
  sizes: string[];
  variants: ProductVariant[];
  featured: boolean;
  isNew: boolean;
  createdAt: string;
}

export interface CatalogFilterState {
  category?: CategoryId;
  sizes: string[];
  colors: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly: boolean;
  search: string;
  sort: SortOption;
}

export interface FacetCounts {
  categories: Record<CategoryId, number>;
  sizes: Record<string, number>;
  colors: Record<string, number>;
  inStock: number;
  total: number;
}

export interface CartItem {
  productId: string;
  sku: string;
  colorId: string;
  size: string;
  quantity: number;
  titleSnapshot: LocalizedText;
  priceTry: number;
  image: string;
}

export interface CouponRule {
  code: string;
  type: 'percent' | 'shipping';
  value: number;
  minSubtotalTry: number;
  label: LocalizedText;
}

export interface CartTotals {
  subtotalTry: number;
  discountTry: number;
  shippingTry: number;
  totalTry: number;
  freeShippingThresholdTry: number;
  amountToFreeShippingTry: number;
  appliedCoupon: CouponRule | null;
  couponError?: 'INVALID_CODE' | 'MIN_SUBTOTAL_NOT_MET';
}

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  addressLine: string;
  postalCode: string;
}

export interface OrderItemRecord {
  productId: string;
  sku: string;
  title: LocalizedText;
  colorName: LocalizedText;
  size: string;
  quantity: number;
  unitPriceTry: number;
  image: string;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  timestamp: string;
  note: LocalizedText;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  shipping: ShippingAddress;
  deliveryMethod: 'standard' | 'express';
  paymentLast4: string;
  couponCode?: string;
  subtotalTry: number;
  discountTry: number;
  shippingTry: number;
  totalTry: number;
  status: OrderStatus;
  items: OrderItemRecord[];
  timeline: OrderTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AdminOverviewStats {
  totalRevenueTry: number;
  totalOrders: number;
  averageOrderValueTry: number;
  lowStockSkuCount: number;
  outOfStockSkuCount: number;
  revenueByMonth: Array<{ month: string; revenueTry: number; orders: number }>;
  revenueByCategory: Array<{ category: CategoryId; revenueTry: number; units: number }>;
}

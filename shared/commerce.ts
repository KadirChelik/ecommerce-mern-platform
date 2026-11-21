import type {
  CartItem,
  CartTotals,
  CatalogFilterState,
  CategoryId,
  CouponRule,
  FacetCounts,
  Language,
  Product,
  SortOption,
} from './types.js';

export const FREE_SHIPPING_THRESHOLD_TRY = 3000;
export const STANDARD_SHIPPING_TRY = 120;
export const EXPRESS_SHIPPING_TRY = 240;

export const COUPON_RULES: Record<string, CouponRule> = {
  HANN10: {
    code: 'HANN10',
    type: 'percent',
    value: 10,
    minSubtotalTry: 1000,
    label: { tr: '%10 Hoş Geldin İndirimi', en: '10% Welcome Discount' },
  },
  STUDIO20: {
    code: 'STUDIO20',
    type: 'percent',
    value: 20,
    minSubtotalTry: 4000,
    label: { tr: '4.000 TL Üzeri %20 Studio İndirimi', en: '20% Studio Discount Over 4,000 TRY' },
  },
  FREESHIP: {
    code: 'FREESHIP',
    type: 'shipping',
    value: 100,
    minSubtotalTry: 500,
    label: { tr: 'Ücretsiz Kargo', en: 'Complimentary Shipping' },
  },
};

export function getProductTotalStock(product: Product): number {
  return product.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
}

export function getVariantStock(product: Product, sku: string): number {
  const found = product.variants.find((v) => v.sku === sku);
  return found ? Math.max(0, found.stock) : 0;
}

export function matchesFilterWithoutFacet(
  product: Product,
  filters: CatalogFilterState,
  omitFacet?: 'category' | 'size' | 'color' | 'inStock',
): boolean {
  if (omitFacet !== 'category' && filters.category && product.category !== filters.category) {
    return false;
  }

  if (omitFacet !== 'inStock' && filters.inStockOnly && getProductTotalStock(product) <= 0) {
    return false;
  }

  if (
    omitFacet !== 'size' &&
    filters.sizes.length > 0 &&
    !product.variants.some((v) => v.stock > 0 && filters.sizes.includes(v.size))
  ) {
    return false;
  }

  if (
    omitFacet !== 'color' &&
    filters.colors.length > 0 &&
    !product.variants.some((v) => v.stock > 0 && filters.colors.includes(v.colorId))
  ) {
    return false;
  }

  if (typeof filters.minPrice === 'number' && product.priceTry < filters.minPrice) {
    return false;
  }

  if (typeof filters.maxPrice === 'number' && product.priceTry > filters.maxPrice) {
    return false;
  }

  if (filters.search.trim().length > 0) {
    const q = filters.search.trim().toLowerCase();
    const haystack = [
      product.title.tr,
      product.title.en,
      product.subtitle.tr,
      product.subtitle.en,
      product.description.tr,
      product.description.en,
      product.collectionTag,
      product.category,
    ]
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(q)) {
      return false;
    }
  }

  return true;
}

export function filterAndSortProducts(products: Product[], filters: CatalogFilterState): Product[] {
  const filtered = products.filter((p) => matchesFilterWithoutFacet(p, filters));

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    switch (filters.sort) {
      case 'price-asc':
        return a.priceTry - b.priceTry;
      case 'price-desc':
        return b.priceTry - a.priceTry;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'featured':
      default: {
        const featDiff = Number(b.featured) - Number(a.featured);
        if (featDiff !== 0) return featDiff;
        return Number(b.isNew) - Number(a.isNew);
      }
    }
  });

  return sorted;
}

export function computeFacetCounts(products: Product[], filters: CatalogFilterState): FacetCounts {
  const categories: Record<CategoryId, number> = {
    outerwear: 0,
    women: 0,
    men: 0,
    tailoring: 0,
  };
  const sizes: Record<string, number> = {};
  const colors: Record<string, number> = {};
  let inStock = 0;

  for (const product of products) {
    if (matchesFilterWithoutFacet(product, filters, 'category')) {
      categories[product.category] = (categories[product.category] ?? 0) + 1;
    }
    if (matchesFilterWithoutFacet(product, filters, 'size')) {
      const availableSizes = new Set(product.variants.filter((v) => v.stock > 0).map((v) => v.size));
      for (const s of availableSizes) {
        sizes[s] = (sizes[s] ?? 0) + 1;
      }
    }
    if (matchesFilterWithoutFacet(product, filters, 'color')) {
      const availableColors = new Set(
        product.variants.filter((v) => v.stock > 0).map((v) => v.colorId),
      );
      for (const c of availableColors) {
        colors[c] = (colors[c] ?? 0) + 1;
      }
    }
    if (matchesFilterWithoutFacet(product, filters, 'inStock') && getProductTotalStock(product) > 0) {
      inStock += 1;
    }
  }

  const total = products.filter((p) => matchesFilterWithoutFacet(p, filters)).length;
  return { categories, sizes, colors, inStock, total };
}

export function calculateCartTotals(
  items: CartItem[],
  couponCode?: string,
  deliveryMethod: 'standard' | 'express' = 'standard',
): CartTotals {
  const subtotalTry = items.reduce((sum, item) => sum + item.priceTry * item.quantity, 0);
  const normalizedCode = couponCode?.trim().toUpperCase();
  let appliedCoupon: CouponRule | null = null;
  let couponError: CartTotals['couponError'];

  if (normalizedCode) {
    const rule = COUPON_RULES[normalizedCode];
    if (!rule) {
      couponError = 'INVALID_CODE';
    } else if (subtotalTry < rule.minSubtotalTry) {
      couponError = 'MIN_SUBTOTAL_NOT_MET';
    } else {
      appliedCoupon = rule;
    }
  }

  let discountTry = 0;
  if (appliedCoupon?.type === 'percent') {
    discountTry = Math.round((subtotalTry * appliedCoupon.value) / 100);
  }

  const afterDiscount = Math.max(0, subtotalTry - discountTry);
  const baseShipping =
    items.length === 0
      ? 0
      : deliveryMethod === 'express'
        ? EXPRESS_SHIPPING_TRY
        : afterDiscount >= FREE_SHIPPING_THRESHOLD_TRY
          ? 0
          : STANDARD_SHIPPING_TRY;

  const shippingTry =
    appliedCoupon?.type === 'shipping' && deliveryMethod === 'standard' ? 0 : baseShipping;

  const amountToFreeShippingTry = Math.max(0, FREE_SHIPPING_THRESHOLD_TRY - afterDiscount);

  return {
    subtotalTry,
    discountTry,
    shippingTry,
    totalTry: afterDiscount + shippingTry,
    freeShippingThresholdTry: FREE_SHIPPING_THRESHOLD_TRY,
    amountToFreeShippingTry,
    appliedCoupon,
    couponError,
  };
}

export function serializeFiltersToSearch(filters: CatalogFilterState): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.sizes.length > 0) params.set('size', filters.sizes.join(','));
  if (filters.colors.length > 0) params.set('color', filters.colors.join(','));
  if (typeof filters.minPrice === 'number') params.set('minPrice', String(filters.minPrice));
  if (typeof filters.maxPrice === 'number') params.set('maxPrice', String(filters.maxPrice));
  if (filters.inStockOnly) params.set('inStock', '1');
  if (filters.search.trim()) params.set('q', filters.search.trim());
  if (filters.sort !== 'featured') params.set('sort', filters.sort);
  const str = params.toString();
  return str ? `?${str}` : '';
}

const VALID_CATEGORIES = new Set<CategoryId>(['outerwear', 'women', 'men', 'tailoring']);
const VALID_SORTS = new Set<SortOption>(['featured', 'newest', 'price-asc', 'price-desc']);

export function parseFiltersFromSearch(searchString: string): CatalogFilterState {
  const params = new URLSearchParams(searchString.startsWith('?') ? searchString.slice(1) : searchString);
  const rawCategory = params.get('category') as CategoryId | null;
  const rawSort = params.get('sort') as SortOption | null;
  const minRaw = params.get('minPrice');
  const maxRaw = params.get('maxPrice');
  const minParsed = minRaw !== null && minRaw !== '' ? Number(minRaw) : undefined;
  const maxParsed = maxRaw !== null && maxRaw !== '' ? Number(maxRaw) : undefined;

  return {
    category: rawCategory && VALID_CATEGORIES.has(rawCategory) ? rawCategory : undefined,
    sizes: params.get('size')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [],
    colors: params.get('color')?.split(',').map((c) => c.trim()).filter(Boolean) ?? [],
    minPrice: typeof minParsed === 'number' && Number.isFinite(minParsed) && minParsed >= 0 ? minParsed : undefined,
    maxPrice: typeof maxParsed === 'number' && Number.isFinite(maxParsed) && maxParsed >= 0 ? maxParsed : undefined,
    inStockOnly: params.get('inStock') === '1',
    search: params.get('q') ?? '',
    sort: rawSort && VALID_SORTS.has(rawSort) ? rawSort : 'featured',
  };
}

export function formatPriceTry(amount: number, lang: Language = 'tr'): string {
  return new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(amount);
}

import { describe, expect, it } from 'vitest';
import { INITIAL_PRODUCTS } from '../shared/catalogSeed.js';
import {
  calculateCartTotals,
  computeFacetCounts,
  filterAndSortProducts,
  parseFiltersFromSearch,
  serializeFiltersToSearch,
} from '../shared/commerce.js';
import { createOrderSchema, shippingAddressSchema } from '../shared/schemas.js';

describe('HANN Studio commerce & faceted filtering', () => {
  it('filters by category, size, color, price range and sorts accurately', () => {
    const res = filterAndSortProducts(INITIAL_PRODUCTS, {
      category: 'outerwear',
      sizes: ['M'],
      colors: ['charcoal'],
      minPrice: 5000,
      maxPrice: 7000,
      inStockOnly: true,
      search: '',
      sort: 'price-desc',
    });

    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('prod-wool-coat');
  });

  it('computes dynamic facet counts excluding active facet dimension', () => {
    const facets = computeFacetCounts(INITIAL_PRODUCTS, {
      category: 'outerwear',
      sizes: [],
      colors: [],
      inStockOnly: false,
      search: '',
      sort: 'featured',
    });

    expect(facets.categories.outerwear).toBe(3);
    expect(facets.categories.women).toBe(3);
    expect(facets.categories.men).toBe(2);
    expect(facets.categories.tailoring).toBe(2);
    expect(facets.total).toBe(3);
  });

  it('round-trips filter state through URL query string cleanly', () => {
    const original = {
      category: 'women' as const,
      sizes: ['S', 'M'],
      colors: ['ivory', 'stone'],
      minPrice: 2000,
      maxPrice: 5000,
      inStockOnly: true,
      search: 'kupro',
      sort: 'price-asc' as const,
    };

    const query = serializeFiltersToSearch(original);
    const parsed = parseFiltersFromSearch(query);
    expect(parsed).toEqual(original);
  });

  it('calculates cart totals, coupons, and free shipping thresholds', () => {
    const items = [
      {
        productId: 'prod-silk-blouse',
        sku: 'HN-SB05-IVO-S',
        colorId: 'ivory',
        size: 'S',
        quantity: 1,
        titleSnapshot: { tr: 'Gömlek', en: 'Shirt' },
        priceTry: 2490,
        image: '/products/draped-silk-blouse.webp',
      },
    ];

    const noCoupon = calculateCartTotals(items, '', 'standard');
    expect(noCoupon.subtotalTry).toBe(2490);
    expect(noCoupon.shippingTry).toBe(120);
    expect(noCoupon.amountToFreeShippingTry).toBe(510);

    const hann10 = calculateCartTotals(items, 'HANN10', 'standard');
    expect(hann10.discountTry).toBe(249);
    expect(hann10.appliedCoupon?.code).toBe('HANN10');
    expect(hann10.totalTry).toBe(2490 - 249 + 120);

    const studio20BelowMin = calculateCartTotals(items, 'STUDIO20', 'standard');
    expect(studio20BelowMin.couponError).toBe('MIN_SUBTOTAL_NOT_MET');

    const invalid = calculateCartTotals(items, 'NOPE', 'standard');
    expect(invalid.couponError).toBe('INVALID_CODE');

    const freeShip = calculateCartTotals(items, 'FREESHIP', 'standard');
    expect(freeShip.shippingTry).toBe(0);
  });

  it('validates shipping and order payloads with Zod', () => {
    const validShipping = shippingAddressSchema.safeParse({
      fullName: 'Kadir Çelik',
      email: 'kadir@example.com',
      phone: '+90 536 781 4060',
      city: 'Aydın',
      district: 'Didim',
      addressLine: 'Cumhuriyet Cad. No: 12',
      postalCode: '09270',
    });
    expect(validShipping.success).toBe(true);

    const invalidOrder = createOrderSchema.safeParse({
      shipping: { fullName: 'A', email: 'bad', phone: '1', city: '', district: '', addressLine: '', postalCode: '' },
      deliveryMethod: 'standard',
      paymentLast4: '12',
      items: [],
    });
    expect(invalidOrder.success).toBe(false);
  });
});

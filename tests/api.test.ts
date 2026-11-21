import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { isS3Configured } from '../server/s3.js';
import { demoStore } from '../server/store.js';

describe('HANN Studio Express API & JWT RBAC', () => {
  const app = createApp();

  beforeEach(() => {
    demoStore.reset();
  });

  it('serves health check and faceted product catalog', async () => {
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.ok).toBe(true);
    expect(health.body.storageMode).toBe('demo');

    const catalog = await request(app).get('/api/products?category=outerwear&sort=price-asc');
    expect(catalog.status).toBe(200);
    expect(catalog.body.products).toHaveLength(3);
    expect(catalog.body.products[0].priceTry).toBeLessThanOrEqual(catalog.body.products[1].priceTry);
  });

  it('enforces JWT RBAC for admin product CRUD and order status updates', async () => {
    const unauth = await request(app).get('/api/admin/overview');
    expect(unauth.status).toBe(401);

    const customerLogin = await request(app)
      .post('/api/auth/demo-switch')
      .send({ role: 'customer' });
    expect(customerLogin.status).toBe(200);
    const customerToken = customerLogin.body.token as string;

    const forbidden = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(forbidden.status).toBe(403);

    const adminLogin = await request(app)
      .post('/api/auth/demo-switch')
      .send({ role: 'admin' });
    const adminToken = adminLogin.body.token as string;

    const overview = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(overview.status).toBe(200);
    expect(overview.body.overview.totalOrders).toBeGreaterThanOrEqual(3);

    const created = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: { tr: 'Test Kaşmir Palto', en: 'Test Cashmere Coat' },
        subtitle: { tr: 'Test Alt Başlık', en: 'Test Subtitle' },
        description: { tr: 'Açıklama metni', en: 'Description text' },
        composition: { tr: '%100 Kaşmir', en: '100% Cashmere' },
        care: { tr: 'Kuru temizleme', en: 'Dry clean' },
        category: 'outerwear',
        collectionTag: 'TEST',
        priceTry: 5500,
        image: '/products/structured-wool-coat.webp',
        colors: [{ id: 'black', name: { tr: 'Siyah', en: 'Black' }, hex: '#181818' }],
        sizes: ['M'],
        variants: [{ sku: 'TEST-SKU-M', colorId: 'black', size: 'M', stock: 3 }],
      });
    expect(created.status).toBe(201);
    expect(created.body.product.id).toBeTruthy();

    const presign = await request(app)
      .post('/api/uploads/presign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ filename: 'lookbook.webp', contentType: 'image/webp', sizeBytes: 120000 });
    expect(presign.status).toBe(200);
    expect(presign.body.mode).toBe('demo');
  });

  it('creates an order, decrements variant stock, rejects oversell, and updates order lifecycle', async () => {
    // HN-WC01-CHA-XS has stock: 2
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        shipping: {
          fullName: 'Selin Demir',
          email: 'selin@example.com',
          phone: '+90 532 111 2233',
          city: 'İstanbul',
          district: 'Beşiktaş',
          addressLine: 'Abbasağa Mah. No: 5',
          postalCode: '34353',
        },
        deliveryMethod: 'standard',
        paymentLast4: '4821',
        couponCode: 'HANN10',
        items: [{ productId: 'prod-wool-coat', sku: 'HN-WC01-CHA-XS', quantity: 2 }],
      });

    expect(orderRes.status).toBe(201);
    const createdOrderId = orderRes.body.order.id as string;

    // Attempting to buy 1 more of the same exhausted SKU should return 409
    const oversell = await request(app)
      .post('/api/orders')
      .send({
        shipping: {
          fullName: 'Selin Demir',
          email: 'selin@example.com',
          phone: '+90 532 111 2233',
          city: 'İstanbul',
          district: 'Beşiktaş',
          addressLine: 'Abbasağa Mah. No: 5',
          postalCode: '34353',
        },
        deliveryMethod: 'standard',
        paymentLast4: '4821',
        items: [{ productId: 'prod-wool-coat', sku: 'HN-WC01-CHA-XS', quantity: 1 }],
      });
    expect(oversell.status).toBe(409);
    expect(oversell.body.code).toBe('INSUFFICIENT_STOCK');

    // Admin advances order status
    const adminLogin = await request(app)
      .post('/api/auth/demo-switch')
      .send({ role: 'admin' });
    const statusRes = await request(app)
      .patch(`/api/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
      .send({ status: 'shipped' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.order.status).toBe('shipped');
    expect(statusRes.body.order.timeline).toHaveLength(2);
  });

  it('protects customer order PII on /api/orders and /api/orders/:id and aggregates duplicate SKU stock checks', async () => {
    // 1. Unauthenticated bulk /api/orders must be rejected
    const unauthList = await request(app).get('/api/orders');
    expect(unauthList.status).toBe(401);

    // 2. Unauthenticated single lookup requires both orderNumber and matching email
    const guestWrongEmail = await request(app).get('/api/orders?orderNumber=HN-2026-1042&email=wrong@example.com');
    expect(guestWrongEmail.status).toBe(200);
    expect(guestWrongEmail.body.orders).toHaveLength(0);

    const guestMatch = await request(app).get('/api/orders?orderNumber=HN-2026-1042&email=emre.kaya@example.com');
    expect(guestMatch.status).toBe(200);
    expect(guestMatch.body.orders).toHaveLength(1);
    expect(guestMatch.body.orders[0].id).toBe('ord-1042');

    // 3. Authenticated customer only sees their own orders (selin.demir@example.com -> ord-1041)
    const customerLogin = await request(app).post('/api/auth/demo-switch').send({ role: 'customer' });
    const customerToken = customerLogin.body.token as string;
    const customerOrders = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(customerOrders.status).toBe(200);
    expect(customerOrders.body.orders).toHaveLength(1);
    expect(customerOrders.body.orders[0].customerEmail).toBe('selin.demir@example.com');

    // Customer cannot view another customer's order by ID
    const crossOrder = await request(app)
      .get('/api/orders/ord-1042')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(crossOrder.status).toBe(403);

    // Unauthenticated /api/orders/:id without email is 401
    const unauthById = await request(app).get('/api/orders/ord-1041');
    expect(unauthById.status).toBe(401);

    // Owner and Admin can view /api/orders/:id
    const ownerById = await request(app)
      .get('/api/orders/ord-1041')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(ownerById.status).toBe(200);

    const adminLogin = await request(app).post('/api/auth/demo-switch').send({ role: 'admin' });
    const adminOrders = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    expect(adminOrders.status).toBe(200);
    expect(adminOrders.body.orders.length).toBeGreaterThanOrEqual(3);

    // 4. Duplicate line items for the same SKU (stock=2, 2 + 1 = 3) must fail atomically with 409
    const dupSkuOversell = await request(app)
      .post('/api/orders')
      .send({
        shipping: {
          fullName: 'Selin Demir',
          email: 'selin.demir@example.com',
          phone: '+90 532 111 2233',
          city: 'İstanbul',
          district: 'Beşiktaş',
          addressLine: 'Abbasağa Mah. No: 5',
          postalCode: '34353',
        },
        deliveryMethod: 'standard',
        paymentLast4: '4821',
        items: [
          { productId: 'prod-wool-coat', sku: 'HN-WC01-CHA-XS', quantity: 2 },
          { productId: 'prod-wool-coat', sku: 'HN-WC01-CHA-XS', quantity: 1 },
        ],
      });
    expect(dupSkuOversell.status).toBe(409);
    expect(dupSkuOversell.body.code).toBe('INSUFFICIENT_STOCK');
  });

  it('recognizes legacy AWS_S3_BUCKET_NAME in S3 configuration checks', () => {
    const prevKey = process.env.AWS_ACCESS_KEY_ID;
    const prevSecret = process.env.AWS_SECRET_ACCESS_KEY;
    const prevBucket = process.env.AWS_S3_BUCKET;
    const prevLegacyBucket = process.env.AWS_S3_BUCKET_NAME;

    try {
      delete process.env.AWS_S3_BUCKET;
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      process.env.AWS_S3_BUCKET_NAME = 'legacy-hann-bucket';
      expect(isS3Configured()).toBe(true);
    } finally {
      if (prevKey === undefined) delete process.env.AWS_ACCESS_KEY_ID;
      else process.env.AWS_ACCESS_KEY_ID = prevKey;
      if (prevSecret === undefined) delete process.env.AWS_SECRET_ACCESS_KEY;
      else process.env.AWS_SECRET_ACCESS_KEY = prevSecret;
      if (prevBucket === undefined) delete process.env.AWS_S3_BUCKET;
      else process.env.AWS_S3_BUCKET = prevBucket;
      if (prevLegacyBucket === undefined) delete process.env.AWS_S3_BUCKET_NAME;
      else process.env.AWS_S3_BUCKET_NAME = prevLegacyBucket;
    }
  });
});

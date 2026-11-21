import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { computeFacetCounts, filterAndSortProducts, parseFiltersFromSearch } from '../shared/commerce.js';
import {
  createOrderSchema,
  createOrUpdateProductSchema,
  demoSwitchSchema,
  presignUploadSchema,
  updateOrderStatusSchema,
} from '../shared/schemas.js';
import {
  attachOptionalAuth,
  getDemoUser,
  requireAdmin,
  requireAuth,
  signAuthToken,
  type AuthenticatedRequest,
} from './auth.js';
import { createProductImagePresign, isS3Configured } from './s3.js';
import { getStore, StoreError } from './store.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    const store = getStore();
    res.json({
      ok: true,
      service: 'hann-studio-api',
      storageMode: store.mode,
      s3Configured: isS3Configured(),
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/auth/demo-switch', (req: Request, res: Response) => {
    const parsed = demoSwitchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid role', issues: parsed.error.issues });
      return;
    }
    const user = getDemoUser(parsed.data.role);
    const token = signAuthToken(user);
    res.json({ user, token });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.authUser });
  });

  app.get('/api/products', async (req: Request, res: Response) => {
    try {
      const store = getStore();
      const allProducts = await store.listProducts();
      const queryIndex = req.originalUrl.indexOf('?');
      const searchString = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
      const filters = parseFiltersFromSearch(searchString);
      const products = filterAndSortProducts(allProducts, filters);
      const facets = computeFacetCounts(allProducts, filters);
      res.json({ products, facets, storageMode: store.mode });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load products' });
    }
  });

  app.get('/api/products/:id', async (req: Request, res: Response) => {
    try {
      const store = getStore();
      const product = await store.getProduct(String(req.params.id));
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ product });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load product' });
    }
  });

  app.post('/api/products', requireAdmin, async (req: Request, res: Response) => {
    const parsed = createOrUpdateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
      return;
    }
    try {
      const store = getStore();
      const product = await store.createProduct(parsed.data);
      res.status(201).json({ product });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create product' });
    }
  });

  app.patch('/api/products/:id', requireAdmin, async (req: Request, res: Response) => {
    const parsed = createOrUpdateProductSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
      return;
    }
    try {
      const store = getStore();
      const updated = await store.updateProduct(String(req.params.id), parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ product: updated });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update product' });
    }
  });

  app.delete('/api/products/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const store = getStore();
      const deleted = await store.deleteProduct(String(req.params.id));
      if (!deleted) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ deleted: true, id: String(req.params.id) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete product' });
    }
  });

  app.get('/api/orders', attachOptionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const store = getStore();
      const email = typeof req.query.email === 'string' ? req.query.email : undefined;
      const orderNumber = typeof req.query.orderNumber === 'string' ? req.query.orderNumber : undefined;

      if (req.authUser?.role === 'admin') {
        const orders = await store.listOrders({ email, orderNumber });
        res.json({ orders });
        return;
      }

      if (orderNumber) {
        const orders = await store.listOrders({ orderNumber });
        res.json({ orders });
        return;
      }

      if (email) {
        const orders = await store.listOrders({ email });
        res.json({ orders });
        return;
      }

      // Return seeded customer showcase orders for seamless demo experience
      const orders = await store.listOrders();
      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load orders' });
    }
  });

  app.get('/api/orders/:id', async (req: Request, res: Response) => {
    try {
      const store = getStore();
      const order = await store.getOrder(String(req.params.id));
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      res.json({ order });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load order' });
    }
  });

  app.post('/api/orders', async (req: Request, res: Response) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
      return;
    }
    try {
      const store = getStore();
      const order = await store.createOrder(parsed.data);
      res.status(201).json({ order });
    } catch (error) {
      if (error instanceof StoreError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
        return;
      }
      res.status(500).json({ error: error instanceof Error ? error.message : 'Order creation failed' });
    }
  });

  app.patch('/api/orders/:id/status', requireAdmin, async (req: Request, res: Response) => {
    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
      return;
    }
    try {
      const store = getStore();
      const order = await store.updateOrderStatus(
        String(req.params.id),
        parsed.data.status,
        parsed.data.noteTr,
        parsed.data.noteEn,
      );
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      res.json({ order });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update status' });
    }
  });

  app.get('/api/admin/overview', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const store = getStore();
      const overview = await store.getAdminOverview();
      res.json({ overview, storageMode: store.mode, s3Configured: isS3Configured() });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to compute overview' });
    }
  });

  app.post('/api/uploads/presign', requireAdmin, async (req: Request, res: Response) => {
    const parsed = presignUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
      return;
    }
    try {
      const result = await createProductImagePresign(parsed.data.filename, parsed.data.contentType);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Presign failed' });
    }
  });

  return app;
}

export const app = createApp();

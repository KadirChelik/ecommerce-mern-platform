# HANN Studio — Full-Stack Editorial E-Commerce Platform (v2)

**Live Demo:** [hann-avm.vercel.app](https://hann-avm.vercel.app/)

**HANN Studio** is a modernized, full-stack editorial fashion & lifestyle concept store engineered with **React 19**, **TypeScript**, **Tailwind CSS v4**, **Node/Express**, **MongoDB + Instant DemoStore**, **JWT RBAC**, and an **AWS S3** presigned upload adapter.

---

## Highlights & Engineering Architecture

- **Zero-Cold-Start Hybrid Persistence (`server/store.ts`)**: Runs an instant seeded `DemoStore` (paired with client `localStorage` resilience) out-of-the-box so recruiters can test every flow without login barriers or cold starts, and switches automatically to `MongoStore` when `MONGODB_URI` is provided.
- **URL-Synced Faceted Filtering & `Cmd+K` Command Palette (`shared/commerce.ts`)**: Bidirectional query-parameter synchronization (`category`, `size`, `color`, `minPrice`, `maxPrice`, `inStock`, `q`, `sort`) with live facet counts and keyboard-accessible instant search.
- **Variant-Level Stock & Coupon Engine**: Enforces live per-SKU inventory boundaries during bag updates and checkout (`409 INSUFFICIENT_STOCK` guard) alongside promo rules (`HANN10`, `STUDIO20`, `FREESHIP`).
- **1-Click JWT RBAC Operations Console (`Customer ↔ Admin`)**: Issues signed JWTs via `/api/auth/demo-switch` and protects product CRUD, AWS S3 presigning (`/api/uploads/presign`), admin revenue KPIs + Recharts analytics, and order lifecycle transitions (`received → preparing → shipped → delivered`).
- **Bilingual (`TR / EN`)**: Full localization across storefront catalog, checkout validation, order tracking timeline, and admin analytics.

---

## Project Structure

```text
├── api/[...route].ts      # Vercel Serverless entry forwarding /api/* to Express
├── public/products/       # Cohesive studio .webp imagery + hero campaign
├── server/                # Express app, JWT RBAC middleware, S3 presigner, DemoStore/MongoStore
├── shared/                # Shared TypeScript types, Zod schemas, commerce math & catalog seed
├── src/                   # React 19 + TypeScript + Tailwind v4 SPA
├── tests/                 # Vitest unit & Supertest API integration tests
└── vercel.json            # Single-project Vercel API + SPA rewrite configuration
```

> **Vercel Deployment Note:** v2 consolidates the legacy `frontend/` and `backend/` folders into a single unified root repository. When deploying this branch (`v2-modernize`) to Vercel, ensure **Project Settings → Root Directory** is set to repository root (`.`).

---

## Local Development & Verification

```bash
npm install
npm run dev        # Vite SPA + Express /api/* middleware on http://localhost:5173
npm run typecheck  # Strict TypeScript check
npm run test       # Vitest unit + Supertest API suite
npm run build      # Production Vite bundle
```

Optional environment variables in `.env` (see `.env.example`):
- `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Check, Edit3, Plus, RotateCcw, ShieldAlert, Trash2, Upload, X } from 'lucide-react';
import { formatPriceTry, getProductTotalStock } from '../../shared/commerce.js';
import type {
  CategoryId,
  OrderStatus,
  Product,
  ProductColorOption,
  ProductVariant,
} from '../../shared/types.js';
import { useStore } from '../context/StoreContext.js';

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;

const STUDIO_COLOR_PRESETS: ProductColorOption[] = [
  { id: 'charcoal', name: { tr: 'Antrasit', en: 'Charcoal' }, hex: '#2F3032' },
  { id: 'black', name: { tr: 'Siyah', en: 'Black' }, hex: '#141413' },
  { id: 'stone', name: { tr: 'Taş Beji', en: 'Warm Stone' }, hex: '#CFC6B6' },
  { id: 'ivory', name: { tr: 'Fildişi', en: 'Ivory' }, hex: '#F4F1EA' },
  { id: 'camel', name: { tr: 'Deve Tüyü', en: 'Camel' }, hex: '#B99771' },
  { id: 'espresso', name: { tr: 'Espresso', en: 'Espresso' }, hex: '#3D2C24' },
  { id: 'sand', name: { tr: 'Kum', en: 'Sand' }, hex: '#D6C7B2' },
  { id: 'navy', name: { tr: 'Lacivert', en: 'Navy' }, hex: '#1E293B' },
];

const DEFAULT_CREATE_STOCK_BY_SIZE: Record<string, number> = {
  XS: 3,
  S: 5,
  M: 8,
  L: 6,
  XL: 3,
};

interface ProductFormState {
  titleTr: string;
  titleEn: string;
  subtitleTr: string;
  subtitleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  compositionTr: string;
  compositionEn: string;
  careTr: string;
  careEn: string;
  category: CategoryId;
  collectionTag: string;
  priceTry: number;
  compareAtTry: string;
  image: string;
  isNew: boolean;
  featured: boolean;
  colors: ProductColorOption[];
  sizes: string[];
  stockByKey: Record<string, number>;
  skuByKey: Record<string, string>;
}

function variantKey(colorId: string, size: string): string {
  return `${colorId}:${size}`;
}

function sortSizesCanonically(sizes: string[]): string[] {
  const rank = new Map<string, number>(STANDARD_SIZES.map((s, i) => [s, i]));
  return [...sizes].sort((a, b) => {
    const ra = rank.get(a);
    const rb = rank.get(b);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a.localeCompare(b);
  });
}

function clampStock(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(9999, Math.trunc(val)));
}

function createInitialFormState(): ProductFormState {
  const defaultColor = STUDIO_COLOR_PRESETS[0];
  const defaultSizes = [...STANDARD_SIZES];
  const stockByKey: Record<string, number> = {};
  for (const size of defaultSizes) {
    stockByKey[variantKey(defaultColor.id, size)] = DEFAULT_CREATE_STOCK_BY_SIZE[size] ?? 5;
  }
  return {
    titleTr: '',
    titleEn: '',
    subtitleTr: 'Sınırlı Sayıda Kapsül Parça',
    subtitleEn: 'Limited Capsule Piece',
    descriptionTr: 'Atelier AW26 koleksiyonu için mimari kesimle üretildi.',
    descriptionEn: 'Tailored with architectural proportions for Atelier AW26.',
    compositionTr: '%100 Doğal Elyaf',
    compositionEn: '100% Natural Fiber',
    careTr: '30°C hassas bakım',
    careEn: '30°C gentle care',
    category: 'outerwear',
    collectionTag: 'ATELIER AW26',
    priceTry: 3490,
    compareAtTry: '',
    image: '/products/structured-wool-coat.webp',
    isNew: true,
    featured: false,
    colors: [defaultColor],
    sizes: defaultSizes,
    stockByKey,
    skuByKey: {},
  };
}

async function fileToOptimizedWebPDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 720;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.82));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AdminDashboard() {
  const {
    lang,
    t,
    user,
    token,
    switchRole,
    products,
    orders,
    overview,
    storageMode,
    s3Configured,
    createProduct,
    updateProduct,
    deleteProduct,
    updateOrderStatus,
    refreshAdminOverview,
    resetDemoState,
  } = useStore();

  useEffect(() => {
    if (user.role === 'admin') {
      void refreshAdminOverview();
    }
  }, [user.role, refreshAdminOverview]);

  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkStock, setBulkStock] = useState(6);
  const [toast, setToast] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(() => createInitialFormState());

  useEffect(() => {
    if (!modalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [modalOpen]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 2400);
  };

  if (user.role !== 'admin') {
    return (
      <section className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-[#E7E5E0] bg-white p-10 shadow-xs">
          <ShieldAlert className="mx-auto h-10 w-10 text-[#1F3A2E]" />
          <h1 className="mt-4 font-editorial text-3xl font-medium text-[#141413]">
            {t.admin.requireAdminTitle}
          </h1>
          <p className="mt-2 text-sm text-[#57534C]">{t.admin.requireAdminDesc}</p>
          <button
            type="button"
            onClick={() => void switchRole('admin')}
            className="mt-6 rounded-full bg-[#1F3A2E] px-6 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#FAF9F6] cursor-pointer"
          >
            {t.admin.switchToAdminBtn}
          </button>
        </div>
      </section>
    );
  }

  const openCreateModal = () => {
    setEditingProduct(null);
    setBulkStock(6);
    setFormState(createInitialFormState());
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setBulkStock(6);
    const stockByKey: Record<string, number> = {};
    const skuByKey: Record<string, string> = {};
    for (const v of product.variants) {
      const key = variantKey(v.colorId, v.size);
      stockByKey[key] = v.stock;
      skuByKey[key] = v.sku;
    }
    const colors = product.colors.length > 0 ? product.colors : [STUDIO_COLOR_PRESETS[0]];
    const sizes = product.sizes.length > 0 ? sortSizesCanonically(product.sizes) : [...STANDARD_SIZES];
    for (const c of colors) {
      for (const s of sizes) {
        const key = variantKey(c.id, s);
        if (stockByKey[key] === undefined) stockByKey[key] = 0;
      }
    }
    setFormState({
      titleTr: product.title.tr,
      titleEn: product.title.en,
      subtitleTr: product.subtitle.tr,
      subtitleEn: product.subtitle.en,
      descriptionTr: product.description.tr,
      descriptionEn: product.description.en,
      compositionTr: product.composition.tr,
      compositionEn: product.composition.en,
      careTr: product.care.tr,
      careEn: product.care.en,
      category: product.category,
      collectionTag: product.collectionTag,
      priceTry: product.priceTry,
      compareAtTry: product.compareAtTry ? String(product.compareAtTry) : '',
      image: product.image,
      isNew: product.isNew,
      featured: product.featured,
      colors,
      sizes,
      stockByKey,
      skuByKey,
    });
    setModalOpen(true);
  };

  const toggleColor = (color: ProductColorOption) => {
    setFormState((prev) => {
      const exists = prev.colors.some((c) => c.id === color.id);
      if (exists) {
        if (prev.colors.length <= 1) return prev;
        return { ...prev, colors: prev.colors.filter((c) => c.id !== color.id) };
      }
      const nextStock = { ...prev.stockByKey };
      for (const size of prev.sizes) {
        const key = variantKey(color.id, size);
        if (nextStock[key] === undefined) nextStock[key] = 6;
      }
      return { ...prev, colors: [...prev.colors, color], stockByKey: nextStock };
    });
  };

  const toggleSize = (size: string) => {
    setFormState((prev) => {
      const exists = prev.sizes.includes(size);
      if (exists) {
        if (prev.sizes.length <= 1) return prev;
        return { ...prev, sizes: prev.sizes.filter((s) => s !== size) };
      }
      const nextSizes = sortSizesCanonically([...prev.sizes, size]);
      const nextStock = { ...prev.stockByKey };
      for (const color of prev.colors) {
        const key = variantKey(color.id, size);
        if (nextStock[key] === undefined) nextStock[key] = DEFAULT_CREATE_STOCK_BY_SIZE[size] ?? 6;
      }
      return { ...prev, sizes: nextSizes, stockByKey: nextStock };
    });
  };

  const setVariantStock = (colorId: string, size: string, rawValue: number) => {
    const key = variantKey(colorId, size);
    const nextVal = clampStock(rawValue);
    setFormState((prev) => ({
      ...prev,
      stockByKey: { ...prev.stockByKey, [key]: nextVal },
    }));
  };

  const applyBulkStock = (rawValue: number) => {
    const val = clampStock(rawValue);
    setBulkStock(val);
    setFormState((prev) => {
      const nextStock = { ...prev.stockByKey };
      for (const color of prev.colors) {
        for (const size of prev.sizes) {
          nextStock[variantKey(color.id, size)] = val;
        }
      }
      return { ...prev, stockByKey: nextStock };
    });
  };

  const availableColorOptions: ProductColorOption[] = [
    ...STUDIO_COLOR_PRESETS,
    ...formState.colors.filter((c) => !STUDIO_COLOR_PRESETS.some((p) => p.id === c.id)),
  ];
  const availableSizeOptions: string[] = sortSizesCanonically(
    Array.from(new Set([...STANDARD_SIZES, ...formState.sizes])),
  );

  const totalUnitsInForm = formState.colors.reduce(
    (sum, c) =>
      sum +
      formState.sizes.reduce((sSum, s) => sSum + clampStock(formState.stockByKey[variantKey(c.id, s)] ?? 0), 0),
    0,
  );
  const totalVariantsInForm = formState.colors.length * formState.sizes.length;

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: (file.type === 'image/png' || file.type === 'image/jpeg'
            ? file.type
            : 'image/webp') as 'image/webp' | 'image/jpeg' | 'image/png',
          sizeBytes: Math.max(1, file.size),
        }),
      });
      if (res.ok) {
        const presign = (await res.json()) as {
          mode: 's3' | 'demo';
          uploadUrl: string | null;
          publicUrl: string | null;
        };
        if (presign.mode === 's3' && presign.uploadUrl && presign.publicUrl) {
          const putRes = await fetch(presign.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          });
          if (putRes.ok) {
            setFormState((prev) => ({ ...prev, image: presign.publicUrl! }));
            return;
          }
        }
      }
      const dataUrl = await fileToOptimizedWebPDataUrl(file);
      setFormState((prev) => ({ ...prev, image: dataUrl }));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.titleTr.trim() || !formState.titleEn.trim()) return;
    if (formState.colors.length === 0 || formState.sizes.length === 0) return;

    setSaving(true);
    try {
      const priceTry = Math.max(100, Math.min(250000, Number(formState.priceTry) || 100));
      const parsedCompare = Number(formState.compareAtTry);
      const compareAtTry =
        formState.compareAtTry.trim() !== '' &&
        Number.isFinite(parsedCompare) &&
        parsedCompare > priceTry &&
        parsedCompare <= 250000
          ? parsedCompare
          : undefined;

      const skuBase = `HN-${Date.now().toString(36).slice(-4).toUpperCase()}`;
      const variants: ProductVariant[] = [];
      for (const color of formState.colors) {
        const colorCode = color.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'CLR';
        for (const size of formState.sizes) {
          const key = variantKey(color.id, size);
          const existingSku = formState.skuByKey[key];
          const sizeCode = size.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'SZ';
          variants.push({
            sku: existingSku ?? `${skuBase}-${colorCode}-${sizeCode}`,
            colorId: color.id,
            size,
            stock: clampStock(formState.stockByKey[key] ?? 0),
          });
        }
      }

      const payload = {
        title: { tr: formState.titleTr.trim(), en: formState.titleEn.trim() },
        subtitle: {
          tr: formState.subtitleTr.trim() || 'Sınırlı Sayıda Kapsül Parça',
          en: formState.subtitleEn.trim() || 'Limited Capsule Piece',
        },
        description: {
          tr: formState.descriptionTr.trim() || 'Atelier AW26 koleksiyonu için mimari kesimle üretildi.',
          en: formState.descriptionEn.trim() || 'Tailored with architectural proportions for Atelier AW26.',
        },
        composition: {
          tr: formState.compositionTr.trim() || '%100 Doğal Elyaf',
          en: formState.compositionEn.trim() || '100% Natural Fiber',
        },
        care: {
          tr: formState.careTr.trim() || '30°C hassas bakım',
          en: formState.careEn.trim() || '30°C gentle care',
        },
        category: formState.category,
        collectionTag: formState.collectionTag.trim() || 'ATELIER AW26',
        priceTry,
        ...(compareAtTry ? { compareAtTry } : {}),
        image: formState.image,
        colors: formState.colors,
        sizes: formState.sizes,
        variants,
        featured: formState.featured,
        isNew: formState.isNew,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await createProduct(payload);
      }

      setModalOpen(false);
      showToast(lang === 'tr' ? 'Ürün ve varyant stokları kaydedildi.' : 'Product & variant stock saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(orderId, status);
    showToast(t.admin.orderStatusUpdated);
  };

  return (
    <section className="mx-auto max-w-[1380px] px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E7E5E0] pb-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-[#1F3A2E] px-2.5 py-0.5 font-medium text-[#FAF9F6]">
              JWT RBAC · ADMIN
            </span>
            <span className="rounded-full border border-[#E7E5E0] bg-white px-2.5 py-0.5 text-[#4A4741]">
              {storageMode === 'mongodb' ? 'MongoDB Atlas' : 'DemoStore Hybrid'}
            </span>
            <span className="rounded-full border border-[#E7E5E0] bg-white px-2.5 py-0.5 text-[#4A4741]">
              {s3Configured ? t.admin.s3Active : t.admin.s3Demo}
            </span>
          </div>
          <h1 className="font-editorial text-4xl font-medium text-[#141413]">{t.admin.title}</h1>
          <p className="mt-1 text-sm text-[#57534C]">{t.admin.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={resetDemoState}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E5E0] bg-white px-4 py-2 text-xs font-medium text-[#141413] hover:bg-[#F2EFE9] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t.admin.resetDemo}</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#141413] px-4 py-2 text-xs font-medium text-[#FAF9F6] hover:bg-[#2C2C2A] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.admin.newProduct.replace('+ ', '')}</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="mt-4 rounded-xl border border-[#1F3A2E]/30 bg-[#1F3A2E]/10 px-4 py-2.5 text-xs font-medium text-[#1F3A2E]">
          {toast}
        </div>
      )}

      {/* KPI Cards */}
      {overview && (
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t.admin.kpis.revenue, value: formatPriceTry(overview.totalRevenueTry, lang) },
            { label: t.admin.kpis.orders, value: String(overview.totalOrders) },
            { label: t.admin.kpis.aov, value: formatPriceTry(overview.averageOrderValueTry, lang) },
            {
              label: t.admin.kpis.lowStock,
              value: `${overview.lowStockSkuCount} / ${overview.outOfStockSkuCount}`,
            },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-[#E7E5E0] bg-white p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#78746C]">
                {kpi.label}
              </p>
              <p className="mt-2 font-editorial text-3xl font-semibold text-[#141413] tabular-nums">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Recharts */}
      {overview && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#E7E5E0] bg-white p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#57534C]">
              {t.admin.charts.monthlyRevenue}
            </h2>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECE8DF" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6A665E' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6A665E' }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="revenueTry"
                    stroke="#1F3A2E"
                    fill="#1F3A2E"
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E7E5E0] bg-white p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#57534C]">
              {t.admin.charts.categoryMix}
            </h2>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overview.revenueByCategory.map((row) => ({
                    ...row,
                    label: t.categories[row.category],
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECE8DF" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6A665E' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6A665E' }} />
                  <Tooltip />
                  <Bar dataKey="revenueTry" fill="#141413" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-8 flex items-center gap-2 border-b border-[#E7E5E0]">
        {(['products', 'orders'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] border-b-2 transition-colors cursor-pointer ${
              activeTab === tab
                ? 'border-[#141413] text-[#141413]'
                : 'border-transparent text-[#78746C] hover:text-[#141413]'
            }`}
          >
            {tab === 'products' ? t.admin.tabs.products : t.admin.tabs.orders}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'products' ? (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[#E7E5E0] bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E7E5E0] bg-[#FAF9F6] text-[11px] uppercase tracking-[0.12em] text-[#6A665E]">
              <tr>
                <th className="px-4 py-3">{lang === 'tr' ? 'Ürün' : 'Piece'}</th>
                <th className="px-4 py-3">{lang === 'tr' ? 'Kategori' : 'Category'}</th>
                <th className="px-4 py-3">{lang === 'tr' ? 'Fiyat' : 'Price'}</th>
                <th className="px-4 py-3">{lang === 'tr' ? 'Stok' : 'Stock'}</th>
                <th className="px-4 py-3 text-right">{lang === 'tr' ? 'İşlemler' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECE8DF]">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[#FAF9F6]/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image}
                        alt={p.title[lang]}
                        className="h-12 w-9 rounded-md border border-[#E7E5E0] bg-[#F3F1EC] object-cover"
                      />
                      <div>
                        <p className="font-medium text-[#141413]">{p.title[lang]}</p>
                        <p className="text-[11px] text-[#78746C]">{p.collectionTag}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#4A4741]">{t.categories[p.category]}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {formatPriceTry(p.priceTry, lang)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className="rounded-full bg-[#F2EFE9] px-2.5 py-1 font-medium text-[#141413]">
                      {getProductTotalStock(p)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="inline-flex items-center gap-1 rounded-full border border-[#E7E5E0] px-3 py-1 text-[11px] font-medium hover:border-[#141413] cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>{t.admin.editProduct}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteProduct(p.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-[#E7E5E0] px-3 py-1 text-[11px] font-medium text-[#991B1B] hover:border-[#991B1B] cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>{t.admin.deleteProduct}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[#E7E5E0] bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E7E5E0] bg-[#FAF9F6] text-[11px] uppercase tracking-[0.12em] text-[#6A665E]">
              <tr>
                <th className="px-4 py-3">{t.orders.orderNumber}</th>
                <th className="px-4 py-3">{lang === 'tr' ? 'Müşteri' : 'Customer'}</th>
                <th className="px-4 py-3">{t.cart.total}</th>
                <th className="px-4 py-3">{lang === 'tr' ? 'Durum' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECE8DF]">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-[#FAF9F6]/60">
                  <td className="px-4 py-3 font-semibold tabular-nums">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#141413]">{order.shipping.fullName}</p>
                    <p className="text-[11px] text-[#78746C]">{order.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {formatPriceTry(order.totalTry, lang)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(e) => void handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className="rounded-full border border-[#E7E5E0] bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-[#141413] outline-none focus:border-[#141413] cursor-pointer"
                    >
                      {(['received', 'preparing', 'shipped', 'delivered'] as OrderStatus[]).map((st) => (
                        <option key={st} value={st}>
                          {t.orders.statuses[st]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={editingProduct ? t.admin.editProduct : t.admin.newProduct}
        >
          <form
            onSubmit={handleSaveProduct}
            onClick={(e) => e.stopPropagation()}
            data-testid="admin-product-modal"
            className="animate-modal-in relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E7E5E0] bg-[#FAF9F6] p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#E7E5E0] pb-3">
              <div>
                <h3 className="font-editorial text-2xl font-medium text-[#141413]">
                  {editingProduct ? t.admin.editProduct : t.admin.newProduct.replace('+ ', '')}
                </h3>
                <p className="mt-0.5 text-[11px] text-[#6A665E]">
                  {lang === 'tr'
                    ? 'Katalog bilgileri, renk/beden seçenekleri ve varyant bazlı stok matrisi.'
                    : 'Catalog metadata, color/size options, and per-variant inventory matrix.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label={t.product.close}
                className="rounded-full p-1.5 text-[#57534C] hover:bg-[#F2EFE9] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Section 1: Basic Merchandising Info */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">
                    {lang === 'tr' ? 'Başlık (TR)' : 'Title (TR)'}
                  </label>
                  <input
                    required
                    value={formState.titleTr}
                    onChange={(e) => setFormState({ ...formState, titleTr: e.target.value })}
                    placeholder={lang === 'tr' ? 'ör. Kaşmir Karışımlı Palto' : 'e.g. Kaşmir Karışımlı Palto'}
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">Title (EN)</label>
                  <input
                    required
                    value={formState.titleEn}
                    onChange={(e) => setFormState({ ...formState, titleEn: e.target.value })}
                    placeholder="e.g. Cashmere Blend Coat"
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">
                    {lang === 'tr' ? 'Alt Başlık (TR)' : 'Subtitle (TR)'}
                  </label>
                  <input
                    value={formState.subtitleTr}
                    onChange={(e) => setFormState({ ...formState, subtitleTr: e.target.value })}
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">Subtitle (EN)</label>
                  <input
                    value={formState.subtitleEn}
                    onChange={(e) => setFormState({ ...formState, subtitleEn: e.target.value })}
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">
                    {lang === 'tr' ? 'Kategori' : 'Category'}
                  </label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      setFormState({ ...formState, category: e.target.value as CategoryId })
                    }
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-2.5 py-2 text-xs"
                  >
                    {(['outerwear', 'women', 'men', 'tailoring'] as CategoryId[]).map((c) => (
                      <option key={c} value={c}>
                        {t.categories[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">
                    {lang === 'tr' ? 'Koleksiyon Etiketi' : 'Collection Tag'}
                  </label>
                  <input
                    value={formState.collectionTag}
                    maxLength={40}
                    onChange={(e) => setFormState({ ...formState, collectionTag: e.target.value })}
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-2.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">
                    {lang === 'tr' ? 'Fiyat (TL)' : 'Price (TRY)'}
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={250000}
                    value={formState.priceTry}
                    onChange={(e) => setFormState({ ...formState, priceTry: Number(e.target.value) })}
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-2.5 py-2 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">
                    {lang === 'tr' ? 'Eski Fiyat (Opsiyonel)' : 'Compare-At (Optional)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={250000}
                    placeholder="—"
                    value={formState.compareAtTry}
                    onChange={(e) => setFormState({ ...formState, compareAtTry: e.target.value })}
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-2.5 py-2 text-xs tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">
                    {lang === 'tr' ? 'Açıklama (TR)' : 'Description (TR)'}
                  </label>
                  <textarea
                    rows={2}
                    value={formState.descriptionTr}
                    onChange={(e) => setFormState({ ...formState, descriptionTr: e.target.value })}
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs resize-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">
                    Description (EN)
                  </label>
                  <textarea
                    rows={2}
                    value={formState.descriptionEn}
                    onChange={(e) => setFormState({ ...formState, descriptionEn: e.target.value })}
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs resize-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">
                    {lang === 'tr' ? 'Kumaş & İçerik (TR)' : 'Fabric / Composition (TR)'}
                  </label>
                  <input
                    value={formState.compositionTr}
                    onChange={(e) => setFormState({ ...formState, compositionTr: e.target.value })}
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">
                    {lang === 'tr' ? 'Kumaş & İçerik (EN)' : 'Composition (EN)'}
                  </label>
                  <input
                    value={formState.compositionEn}
                    onChange={(e) => setFormState({ ...formState, compositionEn: e.target.value })}
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">
                    {lang === 'tr' ? 'Bakım Talimatı (TR)' : 'Care Instructions (TR)'}
                  </label>
                  <input
                    value={formState.careTr}
                    onChange={(e) => setFormState({ ...formState, careTr: e.target.value })}
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#141413]">
                    Care Instructions (EN)
                  </label>
                  <input
                    value={formState.careEn}
                    onChange={(e) => setFormState({ ...formState, careEn: e.target.value })}
                    className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFormState({ ...formState, isNew: !formState.isNew })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                    formState.isNew
                      ? 'border-[#141413] bg-[#141413] text-[#FAF9F6]'
                      : 'border-[#E7E5E0] bg-white text-[#57534C]'
                  }`}
                >
                  {formState.isNew && <Check className="h-3 w-3" />}
                  <span>{lang === 'tr' ? 'Yeni Sezon Rozeti' : 'New Arrival Badge'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormState({ ...formState, featured: !formState.featured })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                    formState.featured
                      ? 'border-[#1F3A2E] bg-[#1F3A2E] text-[#FAF9F6]'
                      : 'border-[#E7E5E0] bg-white text-[#57534C]'
                  }`}
                >
                  {formState.featured && <Check className="h-3 w-3" />}
                  <span>{lang === 'tr' ? 'Öne Çıkan Parça' : 'Featured Piece'}</span>
                </button>
              </div>
            </div>

            {/* Section 2: Colors & Sizes Selection */}
            <div className="space-y-3 border-t border-[#E7E5E0] pt-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-[#141413]">
                  {lang === 'tr' ? 'Renk Seçenekleri' : 'Color Options'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableColorOptions.map((color) => {
                    const active = formState.colors.some((c) => c.id === color.id);
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => toggleColor(color)}
                        data-testid={`modal-color-${color.id}`}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                          active
                            ? 'border-[#141413] bg-[#141413] text-[#FAF9F6]'
                            : 'border-[#E7E5E0] bg-white text-[#4A4741] hover:border-[#141413]'
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span>{color.name[lang]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-[#141413]">
                  {lang === 'tr' ? 'Beden Seçenekleri' : 'Size Range'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableSizeOptions.map((size) => {
                    const active = formState.sizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        data-testid={`modal-size-${size}`}
                        className={`min-w-[40px] rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'border-[#141413] bg-[#141413] text-[#FAF9F6]'
                            : 'border-[#E7E5E0] bg-white text-[#4A4741] hover:border-[#141413]'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 3: Variant Stock Matrix */}
            <div className="space-y-3 border-t border-[#E7E5E0] pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-[#141413]">
                    {lang === 'tr' ? 'Renk & Beden Stok Matrisi' : 'Color × Size Inventory Matrix'}
                  </p>
                  <p className="text-[11px] text-[#6A665E] tabular-nums" data-testid="modal-stock-summary">
                    {lang === 'tr'
                      ? `Toplam: ${totalUnitsInForm} adet · ${totalVariantsInForm} varyant`
                      : `Total: ${totalUnitsInForm} pcs · ${totalVariantsInForm} variants`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {[0, 5, 10].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyBulkStock(preset)}
                      className="rounded-full border border-[#E7E5E0] bg-white px-2.5 py-1 font-medium text-[#4A4741] hover:border-[#141413] hover:text-[#141413] cursor-pointer tabular-nums"
                    >
                      {preset}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={bulkStock}
                    onChange={(e) => setBulkStock(clampStock(Number(e.target.value)))}
                    aria-label={lang === 'tr' ? 'Toplu stok değeri' : 'Bulk stock amount'}
                    className="w-14 rounded-lg border border-[#E7E5E0] bg-white px-2 py-1 text-center text-[11px] tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => applyBulkStock(bulkStock)}
                    className="rounded-full bg-[#F2EFE9] border border-[#D7D2C8] px-2.5 py-1 font-medium text-[#141413] hover:border-[#141413] cursor-pointer"
                  >
                    {lang === 'tr' ? 'Tümüne Uygula' : 'Apply All'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#E7E5E0] bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E7E5E0] bg-[#FAF9F6] text-[10px] uppercase tracking-[0.12em] text-[#6A665E]">
                    <tr>
                      <th className="px-3 py-2">{lang === 'tr' ? 'Renk' : 'Color'}</th>
                      {formState.sizes.map((size) => (
                        <th key={size} className="px-2 py-2 text-center">
                          {size}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECE8DF]">
                    {formState.colors.map((color) => (
                      <tr key={color.id}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: color.hex }}
                            />
                            <span className="font-medium text-[#141413]">{color.name[lang]}</span>
                          </div>
                        </td>
                        {formState.sizes.map((size) => {
                          const key = variantKey(color.id, size);
                          const val = formState.stockByKey[key] ?? 0;
                          const tintClass =
                            val === 0
                              ? 'border-rose-300 bg-rose-50/70 text-rose-900'
                              : val <= 3
                                ? 'border-amber-300 bg-amber-50/70 text-amber-900'
                                : 'border-[#E7E5E0] bg-[#FAF9F6] text-[#141413]';
                          return (
                            <td key={key} className="px-1.5 py-2 text-center">
                              <input
                                type="number"
                                min={0}
                                max={9999}
                                value={val}
                                data-testid={`stock-input-${color.id}-${size}`}
                                aria-label={`${color.name[lang]} ${size}`}
                                onChange={(e) => setVariantStock(color.id, size, Number(e.target.value))}
                                className={`w-14 rounded-lg border px-1.5 py-1 text-center text-xs font-medium tabular-nums outline-none focus:border-[#141413] ${tintClass}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Image */}
            <div className="border-t border-[#E7E5E0] pt-4">
              <label className="mb-1.5 block text-xs font-semibold text-[#141413]">
                {t.admin.uploadImage}
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <img
                  src={formState.image}
                  alt="Preview"
                  className="h-16 w-12 rounded-md border border-[#E7E5E0] bg-[#F3F1EC] object-cover"
                />
                <label className="inline-flex items-center gap-2 rounded-full border border-[#141413] bg-white px-4 py-2 text-xs font-medium cursor-pointer hover:bg-[#F2EFE9]">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploading ? t.admin.uploading : t.admin.uploadImage}</span>
                  <input
                    type="file"
                    accept="image/webp,image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImageUpload(file);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E5E0]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-[#E7E5E0] bg-white px-4 py-2 text-xs font-medium cursor-pointer"
              >
                {t.admin.cancel}
              </button>
              <button
                type="submit"
                disabled={saving}
                data-testid="save-product-submit"
                className="rounded-full bg-[#141413] px-5 py-2 text-xs font-medium text-[#FAF9F6] hover:bg-[#2C2C2A] disabled:opacity-50 cursor-pointer"
              >
                {saving ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...') : t.admin.saveProduct}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

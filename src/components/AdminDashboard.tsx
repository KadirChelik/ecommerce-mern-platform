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
import { Edit3, Plus, RotateCcw, ShieldAlert, Trash2, Upload, X } from 'lucide-react';
import { formatPriceTry, getProductTotalStock } from '../../shared/commerce.js';
import type { CategoryId, OrderStatus, Product } from '../../shared/types.js';
import { useStore } from '../context/StoreContext.js';

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
  const [toast, setToast] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    titleTr: '',
    titleEn: '',
    subtitleTr: '',
    subtitleEn: '',
    descriptionTr: '',
    descriptionEn: '',
    category: 'outerwear' as CategoryId,
    collectionTag: 'ATELIER AW26',
    priceTry: 3490,
    image: '/products/structured-wool-coat.webp',
    stockM: 6,
    stockL: 4,
  });

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
    setFormState({
      titleTr: '',
      titleEn: '',
      subtitleTr: 'Sınırlı Sayıda Kapsül Parça',
      subtitleEn: 'Limited Capsule Piece',
      descriptionTr: 'Atelier AW26 koleksiyonu için mimari kesimle üretildi.',
      descriptionEn: 'Tailored with architectural proportions for Atelier AW26.',
      category: 'outerwear',
      collectionTag: 'ATELIER AW26',
      priceTry: 3490,
      image: '/products/structured-wool-coat.webp',
      stockM: 6,
      stockL: 5,
    });
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    const mStock = product.variants.find((v) => v.size === 'M')?.stock ?? 5;
    const lStock = product.variants.find((v) => v.size === 'L')?.stock ?? 5;
    setFormState({
      titleTr: product.title.tr,
      titleEn: product.title.en,
      subtitleTr: product.subtitle.tr,
      subtitleEn: product.subtitle.en,
      descriptionTr: product.description.tr,
      descriptionEn: product.description.en,
      category: product.category,
      collectionTag: product.collectionTag,
      priceTry: product.priceTry,
      image: product.image,
      stockM: mStock,
      stockL: lStock,
    });
    setModalOpen(true);
  };

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

    if (editingProduct) {
      await updateProduct(editingProduct.id, {
        title: { tr: formState.titleTr, en: formState.titleEn },
        subtitle: { tr: formState.subtitleTr, en: formState.subtitleEn },
        description: { tr: formState.descriptionTr, en: formState.descriptionEn },
        category: formState.category,
        collectionTag: formState.collectionTag,
        priceTry: Number(formState.priceTry),
        image: formState.image,
        variants: editingProduct.variants.map((v) =>
          v.size === 'M'
            ? { ...v, stock: Number(formState.stockM) }
            : v.size === 'L'
              ? { ...v, stock: Number(formState.stockL) }
              : v,
        ),
      });
    } else {
      const skuBase = `HN-${Date.now().toString(36).slice(-4).toUpperCase()}`;
      await createProduct({
        title: { tr: formState.titleTr, en: formState.titleEn },
        subtitle: { tr: formState.subtitleTr, en: formState.subtitleEn },
        description: { tr: formState.descriptionTr, en: formState.descriptionEn },
        composition: { tr: '%100 Doğal Elyaf', en: '100% Natural Fiber' },
        care: { tr: '30°C hassas bakım', en: '30°C gentle care' },
        category: formState.category,
        collectionTag: formState.collectionTag,
        priceTry: Number(formState.priceTry),
        image: formState.image,
        colors: [{ id: 'charcoal', name: { tr: 'Antrasit', en: 'Charcoal' }, hex: '#2F3032' }],
        sizes: ['S', 'M', 'L'],
        variants: [
          { sku: `${skuBase}-CHA-S`, colorId: 'charcoal', size: 'S', stock: 4 },
          { sku: `${skuBase}-CHA-M`, colorId: 'charcoal', size: 'M', stock: Number(formState.stockM) },
          { sku: `${skuBase}-CHA-L`, colorId: 'charcoal', size: 'L', stock: Number(formState.stockL) },
        ],
        featured: false,
        isNew: true,
      });
    }
    setModalOpen(false);
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(orderId, status);
    setToast(t.admin.orderStatusUpdated);
    setTimeout(() => setToast(null), 2000);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveProduct}
            className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#E7E5E0] bg-[#FAF9F6] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E7E5E0] pb-3">
              <h3 className="font-editorial text-2xl font-medium">
                {editingProduct ? t.admin.editProduct : t.admin.newProduct}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1 hover:bg-[#F2EFE9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium">Başlık (TR)</label>
                <input
                  required
                  value={formState.titleTr}
                  onChange={(e) => setFormState({ ...formState, titleTr: e.target.value })}
                  className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Title (EN)</label>
                <input
                  required
                  value={formState.titleEn}
                  onChange={(e) => setFormState({ ...formState, titleEn: e.target.value })}
                  className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Kategori</label>
                <select
                  value={formState.category}
                  onChange={(e) =>
                    setFormState({ ...formState, category: e.target.value as CategoryId })
                  }
                  className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs"
                >
                  {(['outerwear', 'women', 'men', 'tailoring'] as CategoryId[]).map((c) => (
                    <option key={c} value={c}>
                      {t.categories[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Fiyat (TL)</label>
                <input
                  type="number"
                  min={100}
                  value={formState.priceTry}
                  onChange={(e) => setFormState({ ...formState, priceTry: Number(e.target.value) })}
                  className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">M Beden Stok</label>
                <input
                  type="number"
                  min={0}
                  value={formState.stockM}
                  onChange={(e) => setFormState({ ...formState, stockM: Number(e.target.value) })}
                  className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">L Beden Stok</label>
                <input
                  type="number"
                  min={0}
                  value={formState.stockL}
                  onChange={(e) => setFormState({ ...formState, stockL: Number(e.target.value) })}
                  className="w-full rounded-lg border border-[#E7E5E0] bg-white px-3 py-2 text-xs tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">{t.admin.uploadImage}</label>
              <div className="flex items-center gap-3">
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
                className="rounded-full border border-[#E7E5E0] bg-white px-4 py-2 text-xs font-medium"
              >
                {t.admin.cancel}
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#141413] px-5 py-2 text-xs font-medium text-[#FAF9F6] cursor-pointer"
              >
                {t.admin.saveProduct}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

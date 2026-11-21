import { Suspense, lazy, useEffect, useState } from 'react';
import { parseFiltersFromSearch, serializeFiltersToSearch } from '../shared/commerce.js';
import type { CatalogFilterState, CategoryId, Product } from '../shared/types.js';
import { CartDrawer } from './components/CartDrawer.js';
import { CatalogSection } from './components/CatalogSection.js';
import { CommandPalette } from './components/CommandPalette.js';
import { HeroSection } from './components/HeroSection.js';
import { Navbar, type ActiveView } from './components/Navbar.js';
import { ProductDetailModal } from './components/ProductDetailModal.js';
import { StoreProvider, useStore } from './context/StoreContext.js';

const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard.js').then((m) => ({ default: m.AdminDashboard })),
);
const OrdersView = lazy(() =>
  import('./components/OrdersView.js').then((m) => ({ default: m.OrdersView })),
);
const CheckoutModal = lazy(() =>
  import('./components/CheckoutModal.js').then((m) => ({ default: m.CheckoutModal })),
);

function buildSearchWithProduct(filters: CatalogFilterState, productSlug?: string | null): string {
  const base = serializeFiltersToSearch(filters);
  const params = new URLSearchParams(base.startsWith('?') ? base.slice(1) : base);
  if (productSlug) {
    params.set('product', productSlug);
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

function AppShell() {
  const { lang, products, t } = useStore();
  const [activeView, setActiveView] = useState<ActiveView>('storefront');
  const [filters, setFilters] = useState<CatalogFilterState>(() =>
    parseFiltersFromSearch(window.location.search),
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [trackedOrderNumber, setTrackedOrderNumber] = useState<string | undefined>(undefined);

  // Sync URL query params bidirectionally (filters + ?product=<slug>)
  const syncUrl = (nextFilters: CatalogFilterState, nextProductSlug?: string | null) => {
    const search = buildSearchWithProduct(nextFilters, nextProductSlug);
    const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  };

  const updateFilters = (next: CatalogFilterState) => {
    setFilters(next);
    const activeSlug =
      selectedProduct?.slug ?? new URLSearchParams(window.location.search).get('product');
    syncUrl(next, activeSlug);
  };

  const handleSelectProduct = (product: Product | null) => {
    setSelectedProduct(product);
    syncUrl(filters, product?.slug ?? null);
  };

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('product');
    if (slug && products.length > 0) {
      const matched = products.find((p) => p.slug === slug || p.id === slug) ?? null;
      if (matched) setSelectedProduct(matched);
    }
  }, [products]);

  useEffect(() => {
    const onPopState = () => {
      setFilters(parseFiltersFromSearch(window.location.search));
      const slug = new URLSearchParams(window.location.search).get('product');
      setSelectedProduct(slug ? products.find((p) => p.slug === slug || p.id === slug) ?? null : null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [products]);

  const handleSelectCategory = (category?: CategoryId) => {
    updateFilters({ ...filters, category });
  };

  const suspenseFallback = (
    <div className="mx-auto max-w-[1380px] px-4 py-16 text-center text-xs uppercase tracking-[0.16em] text-[#6A665E]">
      {lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#141413]">
      <Navbar
        activeView={activeView}
        activeCategory={filters.category}
        onSelectCategory={handleSelectCategory}
        onNavigateView={setActiveView}
        onOpenSearch={() => setCommandOpen(true)}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        {activeView === 'storefront' && (
          <>
            <HeroSection
              onExploreCatalog={() =>
                document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })
              }
              onSelectCategory={(cat) => {
                handleSelectCategory(cat);
                document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
            <CatalogSection
              filters={filters}
              onChangeFilters={updateFilters}
              onSelectProduct={handleSelectProduct}
            />
          </>
        )}

        {activeView === 'orders' && (
          <Suspense fallback={suspenseFallback}>
            <OrdersView initialOrderNumber={trackedOrderNumber} />
          </Suspense>
        )}
        {activeView === 'admin' && (
          <Suspense fallback={suspenseFallback}>
            <AdminDashboard />
          </Suspense>
        )}
      </main>

      <footer className="border-t border-[#E7E5E0] bg-white py-8">
        <div className="mx-auto flex max-w-[1380px] flex-col justify-between gap-3 px-4 text-xs text-[#6A665E] sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <p className="font-editorial text-lg font-medium tracking-[0.1em] text-[#141413]">
              {t.brand}
            </p>
            <p className="mt-0.5">{t.footer.stackNote}</p>
          </div>
          <p className="max-w-md text-[11px]">{t.footer.demoNotice}</p>
        </div>
      </footer>

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => handleSelectProduct(null)}
        onOpenCart={() => setCartOpen(true)}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      {checkoutOpen && (
        <Suspense fallback={null}>
          <CheckoutModal
            open={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            onOrderCreated={(orderNumber) => {
              setTrackedOrderNumber(orderNumber);
              setActiveView('orders');
            }}
          />
        </Suspense>
      )}

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onSelectProduct={handleSelectProduct}
        onNavigateView={setActiveView}
        onOpenCart={() => setCartOpen(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}

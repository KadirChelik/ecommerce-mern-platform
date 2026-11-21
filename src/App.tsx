import { useEffect, useState } from 'react';
import { parseFiltersFromSearch, serializeFiltersToSearch } from '../shared/commerce.js';
import type { CatalogFilterState, CategoryId, Product } from '../shared/types.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { CartDrawer } from './components/CartDrawer.js';
import { CatalogSection } from './components/CatalogSection.js';
import { CheckoutModal } from './components/CheckoutModal.js';
import { CommandPalette } from './components/CommandPalette.js';
import { HeroSection } from './components/HeroSection.js';
import { Navbar, type ActiveView } from './components/Navbar.js';
import { OrdersView } from './components/OrdersView.js';
import { ProductDetailModal } from './components/ProductDetailModal.js';
import { StoreProvider, useStore } from './context/StoreContext.js';

function AppShell() {
  const { t } = useStore();
  const [activeView, setActiveView] = useState<ActiveView>('storefront');
  const [filters, setFilters] = useState<CatalogFilterState>(() =>
    parseFiltersFromSearch(window.location.search),
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [trackedOrderNumber, setTrackedOrderNumber] = useState<string | undefined>(undefined);

  // Sync URL query params bidirectionally
  const updateFilters = (next: CatalogFilterState) => {
    setFilters(next);
    const search = serializeFiltersToSearch(next);
    const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  };

  useEffect(() => {
    const onPopState = () => {
      setFilters(parseFiltersFromSearch(window.location.search));
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
  }, []);

  const handleSelectCategory = (category?: CategoryId) => {
    updateFilters({ ...filters, category });
  };

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
              onSelectProduct={setSelectedProduct}
            />
          </>
        )}

        {activeView === 'orders' && <OrdersView initialOrderNumber={trackedOrderNumber} />}
        {activeView === 'admin' && <AdminDashboard />}
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
        onClose={() => setSelectedProduct(null)}
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

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onOrderCreated={(orderNumber) => {
          setTrackedOrderNumber(orderNumber);
          setActiveView('orders');
        }}
      />

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onSelectProduct={setSelectedProduct}
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

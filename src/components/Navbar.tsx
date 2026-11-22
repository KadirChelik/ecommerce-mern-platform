import { Search, ShoppingBag, ShieldCheck, User, PackageCheck } from 'lucide-react';
import type { CategoryId } from '../../shared/types.js';
import { useStore } from '../context/StoreContext.js';

export type ActiveView = 'storefront' | 'orders' | 'admin';

interface NavbarProps {
  activeView: ActiveView;
  activeCategory?: CategoryId;
  onSelectCategory: (cat?: CategoryId) => void;
  onNavigateView: (view: ActiveView) => void;
  onOpenSearch: () => void;
  onOpenCart: () => void;
  onPrefetchAdmin?: () => void;
}

const CATEGORIES: CategoryId[] = ['outerwear', 'women', 'men', 'tailoring'];

export function Navbar({
  activeView,
  activeCategory,
  onSelectCategory,
  onNavigateView,
  onOpenSearch,
  onOpenCart,
  onPrefetchAdmin,
}: NavbarProps) {
  const { lang, setLang, t, user, switchRole, totalCartCount } = useStore();
  const isAdmin = user.role === 'admin';

  const handleCategoryClick = (cat?: CategoryId) => {
    onSelectCategory(cat);
    onNavigateView('storefront');
    const el = document.getElementById('catalog-section');
    if (el && activeView === 'storefront') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectCustomer = () => {
    if (isAdmin) {
      void switchRole('customer');
    }
    if (activeView === 'admin') {
      onNavigateView('storefront');
    }
  };

  const handleSelectAdmin = () => {
    if (!isAdmin) {
      void switchRole('admin');
    }
    onNavigateView('admin');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E5E0] bg-[#FAF9F6]/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1380px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + Primary Nav */}
        <div className="flex items-center gap-4 2xl:gap-6 min-w-0">
          <button
            type="button"
            onClick={() => handleCategoryClick(undefined)}
            className="flex items-baseline gap-2.5 text-left cursor-pointer group shrink-0 whitespace-nowrap"
          >
            <span className="font-editorial text-xl font-semibold tracking-[0.12em] text-[#141413] whitespace-nowrap">
              {t.brand}
            </span>
          </button>

          <nav className="hidden xl:flex items-center gap-3.5 2xl:gap-5 shrink-0" aria-label="Main navigation">
            <button
              type="button"
              onClick={() => handleCategoryClick(undefined)}
              className={`whitespace-nowrap text-[11px] uppercase tracking-[0.09em] 2xl:tracking-[0.11em] transition-colors cursor-pointer ${
                activeView === 'storefront' && !activeCategory
                  ? 'text-[#141413] font-semibold underline underline-offset-8 decoration-[#141413]'
                  : 'text-[#6A665E] hover:text-[#141413]'
              }`}
            >
              {t.nav.all}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`whitespace-nowrap text-[11px] uppercase tracking-[0.09em] 2xl:tracking-[0.11em] transition-colors cursor-pointer ${
                  activeView === 'storefront' && activeCategory === cat
                    ? 'text-[#141413] font-semibold underline underline-offset-8 decoration-[#141413]'
                    : 'text-[#6A665E] hover:text-[#141413]'
                }`}
              >
                {t.categories[cat]}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Search, Orders, Role Switcher, Language, Cart */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 rounded-full border border-[#E7E5E0] bg-white px-2.5 xl:px-3 py-1.5 text-xs text-[#6A665E] hover:border-[#141413] hover:text-[#141413] transition-colors cursor-pointer whitespace-nowrap"
            aria-label="Open quick search"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <kbd className="hidden 2xl:inline-block rounded bg-[#F2EFE9] px-1.5 py-0.5 text-[10px] font-medium text-[#524F49]">
              {t.nav.searchShortcut}
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => onNavigateView(activeView === 'orders' ? 'storefront' : 'orders')}
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'orders'
                ? 'border-[#141413] bg-[#141413] text-[#FAF9F6]'
                : 'border-[#E7E5E0] bg-white text-[#141413] hover:border-[#141413]'
            }`}
          >
            <PackageCheck className="h-3.5 w-3.5 shrink-0" />
            <span>{t.nav.orders}</span>
          </button>

          {/* Fixed-Width Sliding Customer ↔ Admin Capsule */}
          <div
            role="group"
            aria-label={t.nav.roleSwitchTooltip}
            title={t.nav.roleSwitchTooltip}
            data-testid="role-switch-group"
            onMouseEnter={() => onPrefetchAdmin?.()}
            onFocus={() => onPrefetchAdmin?.()}
            className="relative inline-grid grid-cols-2 items-center rounded-full border border-[#E7E5E0] bg-[#F2EFE9] p-0.5 text-[11px] font-medium shrink-0"
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full will-change-[translate] transition-[translate,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isAdmin ? 'translate-x-full bg-[#1F3A2E]' : 'translate-x-0 bg-[#141413]'
              }`}
            />
            <button
              type="button"
              onClick={handleSelectCustomer}
              aria-pressed={!isAdmin}
              data-testid="role-customer-btn"
              className={`relative z-10 inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1 whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                !isAdmin ? 'text-[#FAF9F6]' : 'text-[#524F49] hover:text-[#141413]'
              }`}
            >
              <User className="h-3 w-3 shrink-0" />
              <span>{t.nav.customerMode}</span>
            </button>
            <button
              type="button"
              onClick={handleSelectAdmin}
              aria-pressed={isAdmin}
              data-testid="role-admin-btn"
              className={`relative z-10 inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1 whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                isAdmin ? 'text-[#FAF9F6]' : 'text-[#524F49] hover:text-[#141413]'
              }`}
            >
              <ShieldCheck className="h-3 w-3 shrink-0" />
              <span>{t.nav.adminMode}</span>
            </button>
          </div>

          {/* TR / EN Language Switcher */}
          <div
            className="inline-flex rounded-full border border-[#E7E5E0] bg-white p-0.5 text-[11px] font-medium"
            role="group"
            aria-label="Language switch"
          >
            <button
              type="button"
              onClick={() => setLang('tr')}
              className={`rounded-full px-2 py-1 transition-colors cursor-pointer ${
                lang === 'tr' ? 'bg-[#141413] text-[#FAF9F6]' : 'text-[#6A665E] hover:text-[#141413]'
              }`}
            >
              TR
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`rounded-full px-2 py-1 transition-colors cursor-pointer ${
                lang === 'en' ? 'bg-[#141413] text-[#FAF9F6]' : 'text-[#6A665E] hover:text-[#141413]'
              }`}
            >
              EN
            </button>
          </div>

          {/* Bag Trigger */}
          <button
            type="button"
            onClick={onOpenCart}
            data-testid="open-cart-btn"
            className="relative inline-flex items-center gap-1.5 rounded-full border border-[#141413] bg-[#141413] px-3.5 py-1.5 text-xs font-medium text-[#FAF9F6] hover:bg-[#2C2C2A] transition-colors cursor-pointer"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.nav.bag}</span>
            <span className="tabular-nums inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#FAF9F6] px-1 text-[10px] font-semibold text-[#141413]">
              {totalCartCount}
            </span>
          </button>
        </div>
      </div>

      {/* Secondary Category Bar for Tablet / Small Desktop */}
      <div className="flex xl:hidden items-center gap-4 overflow-x-auto border-t border-[#E7E5E0]/70 px-4 py-2 text-[11px] uppercase tracking-[0.15em]">
        <button
          type="button"
          onClick={() => handleCategoryClick(undefined)}
          className={`shrink-0 cursor-pointer ${
            activeView === 'storefront' && !activeCategory ? 'font-semibold text-[#141413]' : 'text-[#6A665E]'
          }`}
        >
          {t.nav.all}
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategoryClick(cat)}
            className={`shrink-0 cursor-pointer ${
              activeView === 'storefront' && activeCategory === cat
                ? 'font-semibold text-[#141413]'
                : 'text-[#6A665E]'
            }`}
          >
            {t.categories[cat]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onNavigateView('orders')}
          className={`shrink-0 sm:hidden cursor-pointer ${
            activeView === 'orders' ? 'font-semibold text-[#141413]' : 'text-[#6A665E]'
          }`}
        >
          {t.nav.orders}
        </button>
      </div>
    </header>
  );
}

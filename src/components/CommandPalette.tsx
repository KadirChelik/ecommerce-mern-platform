import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { formatPriceTry } from '../../shared/commerce.js';
import type { Product } from '../../shared/types.js';
import { useStore } from '../context/StoreContext.js';
import type { ActiveView } from './Navbar.js';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onNavigateView: (view: ActiveView) => void;
  onOpenCart: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onSelectProduct,
  onNavigateView,
  onOpenCart,
}: CommandPaletteProps) {
  const { lang, setLang, t, products, user, switchRole } = useStore();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const matchedProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 5);
    return products
      .filter((p) =>
        [p.title.tr, p.title.en, p.subtitle.tr, p.subtitle.en, p.category, p.collectionTag]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 6);
  }, [products, query]);

  const actions = useMemo(
    () => [
      {
        id: 'role',
        label: user.role === 'admin' ? t.command.actionCustomer : t.command.actionAdmin,
        run: async () => {
          const next = user.role === 'admin' ? 'customer' : 'admin';
          await switchRole(next);
          onNavigateView(next === 'admin' ? 'admin' : 'storefront');
        },
      },
      {
        id: 'orders',
        label: t.command.actionOrders,
        run: () => onNavigateView('orders'),
      },
      {
        id: 'bag',
        label: t.command.actionBag,
        run: () => onOpenCart(),
      },
      {
        id: 'lang',
        label: t.command.actionLang,
        run: () => setLang(lang === 'tr' ? 'en' : 'tr'),
      },
    ],
    [lang, onNavigateView, onOpenCart, setLang, switchRole, t.command, user.role],
  );

  const totalItems = matchedProducts.length + actions.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (totalItems > 0 ? (prev + 1) % totalItems : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (totalItems > 0 ? (prev - 1 + totalItems) % totalItems : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex < matchedProducts.length) {
          onSelectProduct(matchedProducts[activeIndex]);
          onClose();
        } else {
          const action = actions[activeIndex - matchedProducts.length];
          if (action) {
            void action.run();
            onClose();
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions, activeIndex, matchedProducts, onClose, onSelectProduct, open, totalItems]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#E7E5E0] bg-[#FAF9F6] shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-[#E7E5E0] bg-white px-4 py-3.5">
          <Search className="h-4 w-4 text-[#6A665E]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.command.placeholder}
            className="w-full bg-transparent text-sm text-[#141413] placeholder:text-[#969087] outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#6A665E] hover:bg-[#F2EFE9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
          <div>
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#78746C]">
              {t.command.productsGroup}
            </p>
            {matchedProducts.length === 0 ? (
              <p className="px-2 py-3 text-xs text-[#6A665E]">{t.command.noResults}</p>
            ) : (
              <div className="space-y-1">
                {matchedProducts.map((product, idx) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      onSelectProduct(product);
                      onClose();
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer ${
                      activeIndex === idx ? 'bg-[#141413] text-[#FAF9F6]' : 'hover:bg-[#F2EFE9]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image}
                        alt={product.title[lang]}
                        className="h-11 w-9 rounded-md object-cover bg-[#F3F1EC]"
                      />
                      <div>
                        <p className="text-xs font-medium">{product.title[lang]}</p>
                        <p className="text-[11px] opacity-70">{t.categories[product.category]}</p>
                      </div>
                    </div>
                    <span className="tabular-nums text-xs font-semibold">
                      {formatPriceTry(product.priceTry, lang)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[#E7E5E0] pt-3">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#78746C]">
              {t.command.actionsGroup}
            </p>
            <div className="space-y-1">
              {actions.map((action, idx) => {
                const flatIdx = matchedProducts.length + idx;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      void action.run();
                      onClose();
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer ${
                      activeIndex === flatIdx ? 'bg-[#141413] text-[#FAF9F6]' : 'hover:bg-[#F2EFE9] text-[#141413]'
                    }`}
                  >
                    <span>{action.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

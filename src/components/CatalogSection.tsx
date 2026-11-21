import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, X, Check, Eye } from 'lucide-react';
import {
  computeFacetCounts,
  filterAndSortProducts,
  formatPriceTry,
  getProductTotalStock,
} from '../../shared/commerce.js';
import type { CatalogFilterState, CategoryId, Product, SortOption } from '../../shared/types.js';
import { useStore } from '../context/StoreContext.js';

interface CatalogSectionProps {
  filters: CatalogFilterState;
  onChangeFilters: (next: CatalogFilterState) => void;
  onSelectProduct: (product: Product) => void;
  onItemAdded?: (info: { title: string; size: string }) => void;
}

const CATEGORIES: CategoryId[] = ['outerwear', 'women', 'men', 'tailoring'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

const COLOR_SWATCHES: Array<{ id: string; hex: string; tr: string; en: string }> = [
  { id: 'charcoal', hex: '#2F3032', tr: 'Antrasit', en: 'Charcoal' },
  { id: 'black', hex: '#181818', tr: 'Siyah', en: 'Black' },
  { id: 'espresso', hex: '#3D2C24', tr: 'Espresso', en: 'Espresso' },
  { id: 'camel', hex: '#B99771', tr: 'Deve Tüyü / Kum', en: 'Camel / Sand' },
  { id: 'stone', hex: '#CFC6B6', tr: 'Taş Beji', en: 'Warm Stone' },
  { id: 'oat', hex: '#DED6C8', tr: 'Yulaf', en: 'Oat' },
  { id: 'ivory', hex: '#F4F1EA', tr: 'Fildişi', en: 'Ivory' },
  { id: 'ecru', hex: '#EAE5DA', tr: 'Ekru', en: 'Ecru' },
  { id: 'slate', hex: '#5D656D', tr: 'Arduvaz', en: 'Slate' },
];

export function CatalogSection({ filters, onChangeFilters, onSelectProduct, onItemAdded }: CatalogSectionProps) {
  const { lang, t, products, addToCart } = useStore();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [quickSizeProductId, setQuickSizeProductId] = useState<string | null>(null);
  const [quickAdded, setQuickAdded] = useState<{ id: string; size: string } | null>(null);

  useEffect(() => {
    if (!quickSizeProductId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuickSizeProductId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quickSizeProductId]);

  const filteredProducts = useMemo(() => filterAndSortProducts(products, filters), [products, filters]);
  const facets = useMemo(() => computeFacetCounts(products, filters), [products, filters]);

  const hasActiveFilters =
    Boolean(filters.category) ||
    filters.sizes.length > 0 ||
    filters.colors.length > 0 ||
    typeof filters.minPrice === 'number' ||
    typeof filters.maxPrice === 'number' ||
    filters.inStockOnly ||
    filters.search.trim().length > 0;

  const clearAll = () =>
    onChangeFilters({
      sizes: [],
      colors: [],
      inStockOnly: false,
      search: '',
      sort: filters.sort,
    });

  const toggleSize = (size: string) => {
    const exists = filters.sizes.includes(size);
    onChangeFilters({
      ...filters,
      sizes: exists ? filters.sizes.filter((s) => s !== size) : [...filters.sizes, size],
    });
  };

  const toggleColor = (colorId: string) => {
    const exists = filters.colors.includes(colorId);
    onChangeFilters({
      ...filters,
      colors: exists ? filters.colors.filter((c) => c !== colorId) : [...filters.colors, colorId],
    });
  };

  const findVariantForSize = (product: Product, size: string) => {
    if (filters.colors.length > 0) {
      const colorMatched = product.variants.find(
        (v) => v.size === size && filters.colors.includes(v.colorId) && v.stock > 0,
      );
      if (colorMatched) return colorMatched;
    }
    return product.variants.find((v) => v.size === size && v.stock > 0);
  };

  const handleOpenQuickSize = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setQuickSizeProductId((prev) => (prev === product.id ? null : product.id));
  };

  const handleQuickSizeSelect = (e: React.MouseEvent, product: Product, size: string) => {
    e.stopPropagation();
    const available = findVariantForSize(product, size);
    if (!available) return;
    const res = addToCart(product, available.sku, 1);
    if (res.added) {
      setQuickSizeProductId(null);
      setQuickAdded({ id: product.id, size });
      onItemAdded?.({ title: product.title[lang], size });
      setTimeout(
        () => setQuickAdded((prev) => (prev?.id === product.id ? null : prev)),
        1500,
      );
    }
  };

  const filterPanelContent = (
    <div className="space-y-7">
      <div className="flex items-center justify-between border-b border-[#E7E5E0] pb-3">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#141413]">
          {t.catalog.filtersTitle}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-[#6A665E] underline underline-offset-4 hover:text-[#141413] cursor-pointer"
          >
            {t.catalog.clearAll}
          </button>
        )}
      </div>

      {/* Categories */}
      <div>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6A665E]">
          {t.catalog.categoryLabel}
        </h3>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => onChangeFilters({ ...filters, category: undefined })}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
              !filters.category
                ? 'bg-[#141413] font-medium text-[#FAF9F6]'
                : 'text-[#3D3B37] hover:bg-[#F2EFE9]'
            }`}
          >
            <span>{t.catalog.allCategories}</span>
            <span className="tabular-nums opacity-75">{products.length}</span>
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() =>
                onChangeFilters({
                  ...filters,
                  category: filters.category === cat ? undefined : cat,
                })
              }
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                filters.category === cat
                  ? 'bg-[#141413] font-medium text-[#FAF9F6]'
                  : 'text-[#3D3B37] hover:bg-[#F2EFE9]'
              }`}
            >
              <span>{t.categories[cat]}</span>
              <span className="tabular-nums opacity-75">{facets.categories[cat] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sizes */}
      <div>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6A665E]">
          {t.catalog.sizeLabel}
        </h3>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => {
            const active = filters.sizes.includes(size);
            const count = facets.sizes[size] ?? 0;
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                  active
                    ? 'border-[#141413] bg-[#141413] font-medium text-[#FAF9F6]'
                    : 'border-[#E7E5E0] bg-white text-[#141413] hover:border-[#141413]'
                }`}
              >
                <span>{size}</span>
                <span className="tabular-nums text-[10px] opacity-65">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Colors */}
      <div>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6A665E]">
          {t.catalog.colorLabel}
        </h3>
        <div className="space-y-1.5">
          {COLOR_SWATCHES.map((sw) => {
            const count = facets.colors[sw.id] ?? 0;
            if (count === 0 && !filters.colors.includes(sw.id)) return null;
            const active = filters.colors.includes(sw.id);
            return (
              <button
                key={sw.id}
                type="button"
                onClick={() => toggleColor(sw.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors cursor-pointer ${
                  active ? 'bg-[#F2EFE9] font-medium text-[#141413]' : 'text-[#4A4741] hover:bg-[#F2EFE9]/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/15"
                    style={{ backgroundColor: sw.hex }}
                  />
                  <span>{lang === 'tr' ? sw.tr : sw.en}</span>
                </span>
                <span className="tabular-nums text-[11px] text-[#78746C]">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6A665E]">
          {t.catalog.priceLabel}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            placeholder={t.catalog.minPrice}
            value={filters.minPrice ?? ''}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                minPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full rounded-lg border border-[#E7E5E0] bg-white px-2.5 py-1.5 text-xs text-[#141413] outline-none focus:border-[#141413] tabular-nums"
          />
          <input
            type="number"
            min={0}
            placeholder={t.catalog.maxPrice}
            value={filters.maxPrice ?? ''}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                maxPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full rounded-lg border border-[#E7E5E0] bg-white px-2.5 py-1.5 text-xs text-[#141413] outline-none focus:border-[#141413] tabular-nums"
          />
        </div>
      </div>

      {/* In Stock Toggle */}
      <label className="flex items-center justify-between rounded-xl border border-[#E7E5E0] bg-white px-3 py-2.5 text-xs cursor-pointer">
        <span className="font-medium text-[#141413]">
          {t.catalog.inStockOnly} <span className="tabular-nums text-[#78746C]">({facets.inStock})</span>
        </span>
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => onChangeFilters({ ...filters, inStockOnly: e.target.checked })}
          className="h-4 w-4 accent-[#141413]"
        />
      </label>
    </div>
  );

  return (
    <section id="catalog-section" className="mx-auto max-w-[1380px] px-4 py-10 sm:px-6 lg:px-8">
      {/* Toolbar */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-[#E7E5E0] pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[#E7E5E0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#141413] lg:hidden cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{t.catalog.filtersTitle}</span>
          </button>

          <p className="tabular-nums text-xs font-medium uppercase tracking-[0.14em] text-[#6A665E]">
            {t.catalog.piecesCount(filteredProducts.length)}
          </p>

          {filters.search.trim() && (
            <button
              type="button"
              onClick={() => onChangeFilters({ ...filters, search: '' })}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#141413] px-3 py-1 text-xs text-[#FAF9F6] cursor-pointer"
            >
              <span>“{filters.search.trim()}”</span>
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <label htmlFor="catalog-sort" className="text-xs text-[#6A665E]">
            {t.catalog.sortLabel}:
          </label>
          <select
            id="catalog-sort"
            value={filters.sort}
            onChange={(e) => onChangeFilters({ ...filters, sort: e.target.value as SortOption })}
            className="rounded-full border border-[#E7E5E0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#141413] outline-none focus:border-[#141413] cursor-pointer"
          >
            {(Object.keys(t.catalog.sorts) as SortOption[]).map((key) => (
              <option key={key} value={key}>
                {t.catalog.sorts[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {filters.category && (
            <button
              type="button"
              onClick={() => onChangeFilters({ ...filters, category: undefined })}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D8D3C8] bg-[#F2EFE9] px-3 py-1 text-xs font-medium text-[#141413] hover:border-[#141413] cursor-pointer"
            >
              <span>{t.categories[filters.category]}</span>
              <X className="h-3 w-3" />
            </button>
          )}
          {filters.sizes.map((size) => (
            <button
              key={`chip-size-${size}`}
              type="button"
              onClick={() => toggleSize(size)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D8D3C8] bg-white px-3 py-1 text-xs font-medium text-[#141413] hover:border-[#141413] cursor-pointer"
            >
              <span>{t.catalog.sizeLabel}: {size}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
          {filters.colors.map((colorId) => {
            const sw = COLOR_SWATCHES.find((c) => c.id === colorId);
            return (
              <button
                key={`chip-color-${colorId}`}
                type="button"
                onClick={() => toggleColor(colorId)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D8D3C8] bg-white px-3 py-1 text-xs font-medium text-[#141413] hover:border-[#141413] cursor-pointer"
              >
                {sw && (
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-black/15"
                    style={{ backgroundColor: sw.hex }}
                  />
                )}
                <span>{sw ? (lang === 'tr' ? sw.tr : sw.en) : colorId}</span>
                <X className="h-3 w-3" />
              </button>
            );
          })}
          {(typeof filters.minPrice === 'number' || typeof filters.maxPrice === 'number') && (
            <button
              type="button"
              onClick={() => onChangeFilters({ ...filters, minPrice: undefined, maxPrice: undefined })}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D8D3C8] bg-white px-3 py-1 text-xs font-medium text-[#141413] hover:border-[#141413] tabular-nums cursor-pointer"
            >
              <span>
                {filters.minPrice ?? 0} – {filters.maxPrice ?? '∞'} TL
              </span>
              <X className="h-3 w-3" />
            </button>
          )}
          {filters.inStockOnly && (
            <button
              type="button"
              onClick={() => onChangeFilters({ ...filters, inStockOnly: false })}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D8D3C8] bg-white px-3 py-1 text-xs font-medium text-[#141413] hover:border-[#141413] cursor-pointer"
            >
              <span>{t.catalog.inStockOnly}</span>
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-[#6A665E] underline underline-offset-4 hover:text-[#141413] ml-1 cursor-pointer"
          >
            {t.catalog.clearAll}
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-24">{filterPanelContent}</div>
        </aside>

        <div className="lg:col-span-9">
          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D6D1C7] bg-white px-6 py-16 text-center">
              <p className="font-editorial text-2xl text-[#141413]">{t.catalog.emptyTitle}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#6A665E]">{t.catalog.emptyDesc}</p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-6 rounded-full bg-[#141413] px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-[#FAF9F6] cursor-pointer"
              >
                {t.catalog.clearAll}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const totalStock = getProductTotalStock(product);
                const isAdded = quickAdded?.id === product.id;
                const isSelectingSize = quickSizeProductId === product.id;

                return (
                  <article
                    key={product.id}
                    onClick={() => onSelectProduct(product)}
                    className="group cursor-pointer flex flex-col"
                    data-testid={`product-card-${product.slug}`}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-[#E7E5E0] bg-[#F3F1EC]">
                      <img
                        src={product.image}
                        alt={product.title[lang]}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />

                      {/* Top Badges */}
                      <div className="absolute left-3 top-3 flex items-center gap-1.5">
                        {product.isNew && (
                          <span className="rounded-full bg-[#FAF9F6]/95 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-[#141413] border border-[#E7E5E0]">
                            {t.catalog.newBadge}
                          </span>
                        )}
                        {totalStock === 0 ? (
                          <span className="rounded-full bg-[#141413] px-2.5 py-0.5 text-[10px] font-medium text-[#FAF9F6]">
                            {t.catalog.outOfStock}
                          </span>
                        ) : totalStock <= 8 ? (
                          <span className="rounded-full bg-[#9A3412]/90 px-2.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
                            {t.catalog.lowStock(totalStock)}
                          </span>
                        ) : null}
                      </div>

                      {/* Hover Quick Actions or Inline Size Selector */}
                      {isSelectingSize ? (
                        <div
                          key="quick-size-picker"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute inset-x-3 bottom-3 rounded-xl border border-[#E7E5E0] bg-[#FAF9F6]/95 p-2.5 backdrop-blur-xs shadow-sm"
                        >
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#57534C]">
                              {t.product.selectSizePrompt}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickSizeProductId(null);
                              }}
                              aria-label={t.product.close}
                              className="rounded-full p-0.5 text-[#6A665E] hover:bg-[#EAE6DC] hover:text-[#141413] cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {product.sizes.map((size) => {
                              const variant = findVariantForSize(product, size);
                              const hasStock = Boolean(variant);
                              return (
                                <button
                                  key={size}
                                  type="button"
                                  disabled={!hasStock}
                                  onClick={(e) => handleQuickSizeSelect(e, product, size)}
                                  className={`min-w-[34px] flex-1 rounded-md border py-1.5 text-[11px] font-medium transition-colors ${
                                    hasStock
                                      ? 'border-[#E7E5E0] bg-white text-[#141413] hover:border-[#141413] hover:bg-[#141413] hover:text-[#FAF9F6] cursor-pointer'
                                      : 'border-[#E7E5E0] bg-[#F2EFE9] text-[#A29D94] line-through cursor-not-allowed'
                                  }`}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div
                          key="quick-actions"
                          className={`absolute inset-x-3 bottom-3 flex items-center gap-2 transition-[opacity,transform] duration-200 ${
                            isAdded
                              ? 'opacity-100 translate-y-0'
                              : 'opacity-100 sm:opacity-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleOpenQuickSize(e, product)}
                            disabled={totalStock === 0}
                            className="flex-1 rounded-full bg-[#141413]/95 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#FAF9F6] hover:bg-[#141413] disabled:opacity-40 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                          >
                            {isAdded ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>
                                  {t.product.addedToBag} ({quickAdded?.size})
                                </span>
                              </>
                            ) : (
                              <span>+ {t.product.addToBag}</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProduct(product);
                            }}
                            className="rounded-full bg-white/95 p-2 text-[#141413] border border-[#E7E5E0] hover:bg-white cursor-pointer"
                            aria-label={t.catalog.quickView}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="mt-3.5 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[#78746C]">
                          {t.categories[product.category]} · {product.collectionTag}
                        </p>
                        <h3 className="mt-1 text-sm font-medium text-[#141413] group-hover:underline underline-offset-4">
                          {product.title[lang]}
                        </h3>
                        <p className="mt-0.5 text-xs text-[#6A665E] line-clamp-1">{product.subtitle[lang]}</p>
                      </div>

                      <div className="text-right shrink-0 tabular-nums">
                        <p className="text-sm font-semibold text-[#141413]">
                          {formatPriceTry(product.priceTry, lang)}
                        </p>
                        {product.compareAtTry && product.compareAtTry > product.priceTry && (
                          <p className="text-[11px] text-[#8C877E] line-through">
                            {formatPriceTry(product.compareAtTry, lang)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Swatches */}
                    <div className="mt-2.5 flex items-center gap-1.5">
                      {product.colors.map((c) => (
                        <span
                          key={c.id}
                          title={c.name[lang]}
                          className="h-3 w-3 rounded-full border border-black/15"
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                      <span className="ml-1 text-[11px] text-[#78746C]">
                        {product.sizes.join(' · ')}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative z-10 flex h-full w-80 max-w-full flex-col bg-[#FAF9F6] p-6 overflow-y-auto shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-editorial text-xl font-medium">{t.catalog.filtersTitle}</span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full p-1.5 hover:bg-[#F2EFE9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {filterPanelContent}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-8 w-full rounded-full bg-[#141413] py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#FAF9F6]"
            >
              {t.catalog.applyFiltersMobile}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

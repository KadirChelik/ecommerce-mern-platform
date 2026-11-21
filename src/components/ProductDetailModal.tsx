import { useEffect, useState } from 'react';
import { Check, Minus, Plus, Ruler, Share2, X } from 'lucide-react';
import { formatPriceTry, getProductTotalStock } from '../../shared/commerce.js';
import type { Product } from '../../shared/types.js';
import { useStore } from '../context/StoreContext.js';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenCart: () => void;
  onItemAdded?: (info: { title: string; size: string }) => void;
}

const SIZE_GUIDE_ROWS = [
  { size: 'XS', chest: '86–90', waist: '68–72', shoulder: '41' },
  { size: 'S', chest: '90–94', waist: '72–76', shoulder: '43' },
  { size: 'M', chest: '94–100', waist: '76–82', shoulder: '45' },
  { size: 'L', chest: '100–106', waist: '82–88', shoulder: '47' },
  { size: 'XL', chest: '106–112', waist: '88–94', shoulder: '49' },
] as const;

export function ProductDetailModal({ product, onClose, onOpenCart, onItemAdded }: ProductDetailModalProps) {
  const { lang, t, addToCart, cart } = useStore();
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedback, setFeedback] = useState<'added' | 'max' | 'need_size' | null>(null);

  useEffect(() => {
    if (!product) return;
    const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
    setSelectedColor(firstAvailable?.colorId ?? product.colors[0]?.id ?? '');
    setSelectedSize('');
    setQty(1);
    setSizeGuideOpen(false);
    setCopiedLink(false);
    setFeedback(null);
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, product]);

  if (!product) return null;

  const totalProductStock = getProductTotalStock(product);
  const activeVariant = selectedSize
    ? product.variants.find((v) => v.colorId === selectedColor && v.size === selectedSize)
    : undefined;
  const stock = activeVariant?.stock ?? 0;
  const currentInBag = cart.find((c) => c.sku === activeVariant?.sku)?.quantity ?? 0;
  const remainingForVariant = Math.max(0, stock - currentInBag);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const handleAdd = () => {
    if (!selectedSize) {
      setFeedback('need_size');
      return;
    }
    if (!activeVariant) return;
    const safeQty = Math.max(1, Math.min(qty, Math.max(1, remainingForVariant)));
    const res = addToCart(product, activeVariant.sku, safeQty);
    if (res.added) {
      setFeedback('added');
      setQty(1);
      onItemAdded?.({ title: product.title[lang], size: selectedSize });
      setTimeout(() => setFeedback(null), 1800);
    } else if (res.reason === 'MAX_STOCK') {
      setFeedback('max');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-in relative grid max-h-[90vh] w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-2xl border border-[#E7E5E0] bg-[#FAF9F6] shadow-2xl md:grid-cols-12"
      >
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            aria-label={copiedLink ? t.product.linkCopied : t.product.shareLink}
            title={copiedLink ? t.product.linkCopied : t.product.shareLink}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E5E0] bg-white/90 px-2.5 py-2 text-[11px] font-medium text-[#141413] hover:bg-white cursor-pointer"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-[#1F3A2E]" /> : <Share2 className="h-3.5 w-3.5" />}
            {copiedLink && <span className="hidden sm:inline">{t.product.linkCopied}</span>}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.product.close}
            className="rounded-full border border-[#E7E5E0] bg-white/90 p-2 text-[#141413] hover:bg-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Left Image */}
        <div className="bg-[#F3F1EC] md:col-span-6">
          <img
            src={product.image}
            alt={product.title[lang]}
            className="h-full w-full object-cover aspect-[3/4]"
          />
        </div>

        {/* Right Details */}
        <div className="flex flex-col justify-between p-6 sm:p-8 md:col-span-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#78746C]">
              {t.categories[product.category]} · {product.collectionTag}
            </p>
            <h2 className="mt-2 font-editorial text-3xl font-medium text-[#141413]">
              {product.title[lang]}
            </h2>
            <p className="mt-1 text-xs text-[#6A665E]">{product.subtitle[lang]}</p>

            <div className="mt-4 flex items-baseline gap-3 tabular-nums">
              <span className="text-xl font-semibold text-[#141413]">
                {formatPriceTry(product.priceTry, lang)}
              </span>
              {product.compareAtTry && product.compareAtTry > product.priceTry && (
                <span className="text-sm text-[#8C877E] line-through">
                  {formatPriceTry(product.compareAtTry, lang)}
                </span>
              )}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#4A4741]">{product.description[lang]}</p>

            {/* Color Selector */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium uppercase tracking-[0.12em] text-[#6A665E]">
                  {t.product.selectColor}
                </span>
                <span className="font-medium text-[#141413]">
                  {product.colors.find((c) => c.id === selectedColor)?.name[lang]}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                {product.colors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setSelectedColor(color.id)}
                    aria-label={color.name[lang]}
                    className={`h-8 w-8 rounded-full border p-0.5 transition-all cursor-pointer ${
                      selectedColor === color.id
                        ? 'border-[#141413] scale-105'
                        : 'border-transparent hover:border-[#C5C0B6]'
                    }`}
                  >
                    <span
                      className="block h-full w-full rounded-full border border-black/10"
                      style={{ backgroundColor: color.hex }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium uppercase tracking-[0.12em] text-[#6A665E]">
                  {t.product.selectSize}
                </span>
                <div className="flex items-center gap-3">
                  {activeVariant && (
                    <span className="tabular-nums text-[11px] font-medium text-[#6A665E]">
                      {t.product.sku}: {activeVariant.sku}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#57534C] underline underline-offset-4 hover:text-[#141413] cursor-pointer"
                  >
                    <Ruler className="h-3 w-3" />
                    <span>{t.product.sizeGuide}</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {product.sizes.map((size) => {
                  const variantForSize = product.variants.find(
                    (v) => v.colorId === selectedColor && v.size === size,
                  );
                  const sizeStock = variantForSize?.stock ?? 0;
                  const active = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setQty(1);
                        if (feedback === 'need_size') setFeedback(null);
                      }}
                      className={`rounded-lg border py-2 text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'border-[#141413] bg-[#141413] text-[#FAF9F6]'
                          : sizeStock === 0
                            ? 'border-[#E7E5E0] bg-[#F2EFE9] text-[#A29D94] line-through'
                            : feedback === 'need_size'
                              ? 'border-[#991B1B]/60 bg-white text-[#141413] hover:border-[#141413]'
                              : 'border-[#E7E5E0] bg-white text-[#141413] hover:border-[#141413]'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {sizeGuideOpen && (
                <div className="mt-3 overflow-x-auto rounded-xl border border-[#E7E5E0] bg-white p-3">
                  <table className="w-full text-left text-[11px] tabular-nums">
                    <thead className="border-b border-[#ECE8DF] text-[#78746C]">
                      <tr>
                        <th className="pb-1.5 font-medium">{t.catalog.sizeLabel}</th>
                        <th className="pb-1.5 font-medium">{t.product.sizeGuideChest}</th>
                        <th className="pb-1.5 font-medium">{t.product.sizeGuideWaist}</th>
                        <th className="pb-1.5 font-medium">{t.product.sizeGuideShoulder}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2EFE9] text-[#141413]">
                      {SIZE_GUIDE_ROWS.filter((row) => product.sizes.includes(row.size)).map((row) => (
                        <tr key={row.size} className={selectedSize === row.size ? 'font-semibold bg-[#FAF9F6]' : ''}>
                          <td className="py-1.5">{row.size}</td>
                          <td className="py-1.5">{row.chest}</td>
                          <td className="py-1.5">{row.waist}</td>
                          <td className="py-1.5">{row.shoulder}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Live Variant Stock Indicator */}
              <div className="mt-2.5 text-xs">
                {!selectedSize ? (
                  totalProductStock === 0 ? (
                    <span className="font-medium text-[#991B1B]">{t.catalog.outOfStock}</span>
                  ) : feedback === 'need_size' ? (
                    <span className="font-medium text-[#991B1B]">{t.product.selectSizePrompt}</span>
                  ) : (
                    <span className="text-[#6A665E]">{t.product.sizeHint}</span>
                  )
                ) : stock === 0 ? (
                  <span className="font-medium text-[#991B1B]">{t.product.soldOutVariant}</span>
                ) : stock <= 3 ? (
                  <span className="font-medium text-[#9A3412] tabular-nums">
                    {t.product.onlyLeft(stock)}
                  </span>
                ) : (
                  <span className="text-[#1F3A2E] font-medium">{t.catalog.inStock}</span>
                )}
              </div>
            </div>

            {/* Composition & Care */}
            <div className="mt-6 space-y-2 border-t border-[#E7E5E0] pt-4 text-xs text-[#57534C]">
              <p>
                <span className="font-semibold text-[#141413]">{t.product.composition}: </span>
                {product.composition[lang]}
              </p>
              <p>
                <span className="font-semibold text-[#141413]">{t.product.care}: </span>
                {product.care[lang]}
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-7 space-y-2.5">
            {feedback === 'max' && (
              <p className="text-xs font-medium text-[#9A3412]">{t.product.maxInBag}</p>
            )}
            <div className="flex items-stretch gap-2.5">
              {selectedSize && remainingForVariant > 0 && (
                <div
                  className="inline-flex items-center rounded-full border border-[#E7E5E0] bg-white"
                  aria-label={t.product.quantityLabel}
                >
                  <button
                    type="button"
                    onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                    disabled={qty <= 1}
                    className="px-3 py-3 text-[#141413] hover:bg-[#F2EFE9] rounded-l-full disabled:opacity-35 cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="tabular-nums min-w-[24px] text-center text-xs font-semibold text-[#141413]">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((prev) => Math.min(remainingForVariant, prev + 1))}
                    disabled={qty >= remainingForVariant}
                    className="px-3 py-3 text-[#141413] hover:bg-[#F2EFE9] rounded-r-full disabled:opacity-35 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleAdd}
                disabled={totalProductStock === 0 || (selectedSize !== '' && (stock === 0 || currentInBag >= stock))}
                className="flex-1 rounded-full bg-[#141413] py-3.5 px-5 text-xs font-medium uppercase tracking-[0.16em] text-[#FAF9F6] hover:bg-[#2C2C2A] disabled:opacity-40 transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {feedback === 'added' ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{t.product.addedToBag}</span>
                  </>
                ) : totalProductStock === 0 || (selectedSize !== '' && stock === 0) ? (
                  <span>{t.product.soldOutVariant}</span>
                ) : (
                  <span>
                    {t.product.addToBag} — {formatPriceTry(product.priceTry * (selectedSize ? qty : 1), lang)}
                  </span>
                )}
              </button>
            </div>
            {feedback === 'added' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCart();
                }}
                className="w-full rounded-full border border-[#141413] py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-[#141413] hover:bg-[#F2EFE9] cursor-pointer"
              >
                {t.nav.bag} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

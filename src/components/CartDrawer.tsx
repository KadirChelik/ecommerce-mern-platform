import { useState } from 'react';
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { formatPriceTry, getVariantStock } from '../../shared/commerce.js';
import { useStore } from '../context/StoreContext.js';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function CartDrawer({ open, onClose, onCheckout }: CartDrawerProps) {
  const {
    lang,
    t,
    cart,
    products,
    couponCode,
    setCouponCode,
    cartTotals,
    updateCartQty,
    removeFromCart,
  } = useStore();
  const [couponInput, setCouponInput] = useState(couponCode);

  if (!open) return null;

  const progressPct = Math.min(
    100,
    Math.round(((cartTotals.subtotalTry - cartTotals.discountTry) / cartTotals.freeShippingThresholdTry) * 100),
  );

  const applyCoupon = (code: string) => {
    setCouponInput(code);
    setCouponCode(code.trim().toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/45 backdrop-blur-xs" onClick={onClose} />

      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#FAF9F6] shadow-2xl border-l border-[#E7E5E0]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7E5E0] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-4 w-4 text-[#141413]" />
            <h2 className="font-editorial text-2xl font-medium text-[#141413]">{t.cart.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#57534C] hover:bg-[#F2EFE9] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Free shipping progress */}
        {cart.length > 0 && (
          <div className="border-b border-[#E7E5E0] bg-white px-6 py-3.5">
            <p className="text-xs font-medium text-[#141413]">
              {cartTotals.amountToFreeShippingTry === 0
                ? t.cart.freeShippingUnlocked
                : t.cart.freeShippingAway(formatPriceTry(cartTotals.amountToFreeShippingTry, lang))}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#ECE8DF]">
              <div
                className="h-full rounded-full bg-[#1F3A2E] transition-all duration-300"
                style={{ width: `${Math.max(5, progressPct)}%` }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="h-10 w-10 text-[#C5C0B6]" />
              <p className="mt-4 font-editorial text-2xl text-[#141413]">{t.cart.emptyTitle}</p>
              <p className="mt-1.5 max-w-xs text-xs text-[#6A665E]">{t.cart.emptyDesc}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-full bg-[#141413] px-6 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-[#FAF9F6] cursor-pointer"
              >
                {t.cart.continueShopping}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {cart.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                const maxStock = product ? getVariantStock(product, item.sku) : 20;
                const colorLabel =
                  product?.colors.find((c) => c.id === item.colorId)?.name[lang] ?? item.colorId;

                return (
                  <div
                    key={item.sku}
                    className="flex gap-4 border-b border-[#E7E5E0] pb-5 last:border-b-0"
                  >
                    <img
                      src={item.image}
                      alt={item.titleSnapshot[lang]}
                      className="h-24 w-20 shrink-0 rounded-lg border border-[#E7E5E0] bg-[#F3F1EC] object-cover"
                    />
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-[#141413]">
                            {item.titleSnapshot[lang]}
                          </p>
                          <p className="mt-0.5 text-xs text-[#6A665E]">
                            {colorLabel} · {item.size}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.sku)}
                          aria-label={t.cart.remove}
                          className="text-[#8C877E] hover:text-[#991B1B] cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border border-[#E7E5E0] bg-white">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.sku, item.quantity - 1)}
                            className="p-1.5 text-[#141413] hover:bg-[#F2EFE9] rounded-l-full cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="tabular-nums px-3 text-xs font-medium text-[#141413]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.sku, item.quantity + 1)}
                            disabled={item.quantity >= maxStock}
                            className="p-1.5 text-[#141413] hover:bg-[#F2EFE9] rounded-r-full disabled:opacity-35 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <p className="tabular-nums text-sm font-semibold text-[#141413]">
                          {formatPriceTry(item.priceTry * item.quantity, lang)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Totals & Coupons */}
        {cart.length > 0 && (
          <div className="border-t border-[#E7E5E0] bg-white p-6 space-y-4">
            <div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[#78746C]" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder={t.cart.couponPlaceholder}
                    className="w-full rounded-full border border-[#E7E5E0] bg-[#FAF9F6] py-2 pl-9 pr-3 text-xs uppercase text-[#141413] outline-none focus:border-[#141413]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => applyCoupon(couponInput)}
                  className="rounded-full border border-[#141413] px-4 py-2 text-xs font-medium text-[#141413] hover:bg-[#F2EFE9] cursor-pointer"
                >
                  {t.cart.apply}
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[#6A665E]">
                <span>{t.cart.demoCoupons}</span>
                {(['HANN10', 'STUDIO20', 'FREESHIP'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => applyCoupon(code)}
                    className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] cursor-pointer ${
                      couponCode === code
                        ? 'border-[#141413] bg-[#141413] text-[#FAF9F6]'
                        : 'border-[#E7E5E0] bg-[#FAF9F6] text-[#141413] hover:border-[#141413]'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>

              {cartTotals.couponError === 'INVALID_CODE' && (
                <p className="mt-1.5 text-[11px] font-medium text-[#991B1B]">{t.cart.invalidCoupon}</p>
              )}
              {cartTotals.couponError === 'MIN_SUBTOTAL_NOT_MET' && (
                <p className="mt-1.5 text-[11px] font-medium text-[#9A3412]">
                  {t.cart.minSubtotalCoupon}
                </p>
              )}
            </div>

            <div className="space-y-1.5 border-t border-[#E7E5E0] pt-3 text-xs">
              <div className="flex justify-between text-[#57534C]">
                <span>{t.cart.subtotal}</span>
                <span className="tabular-nums font-medium text-[#141413]">
                  {formatPriceTry(cartTotals.subtotalTry, lang)}
                </span>
              </div>
              {cartTotals.discountTry > 0 && (
                <div className="flex justify-between text-[#1F3A2E]">
                  <span>
                    {t.cart.discount} ({cartTotals.appliedCoupon?.code})
                  </span>
                  <span className="tabular-nums font-medium">
                    -{formatPriceTry(cartTotals.discountTry, lang)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#57534C]">
                <span>{t.cart.shipping}</span>
                <span className="tabular-nums font-medium text-[#141413]">
                  {cartTotals.shippingTry === 0
                    ? t.cart.free
                    : formatPriceTry(cartTotals.shippingTry, lang)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E7E5E0] pt-2 text-sm font-semibold text-[#141413]">
                <span>{t.cart.total}</span>
                <span className="tabular-nums">{formatPriceTry(cartTotals.totalTry, lang)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              data-testid="proceed-checkout-btn"
              className="w-full rounded-full bg-[#141413] py-3.5 text-xs font-medium uppercase tracking-[0.16em] text-[#FAF9F6] hover:bg-[#2C2C2A] transition-colors cursor-pointer"
            >
              {t.cart.checkout}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

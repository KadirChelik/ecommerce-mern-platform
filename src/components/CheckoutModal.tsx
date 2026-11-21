import { useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Lock, Truck, X } from 'lucide-react';
import { calculateCartTotals, formatPriceTry } from '../../shared/commerce.js';
import { shippingAddressSchema } from '../../shared/schemas.js';
import type { Order } from '../../shared/types.js';
import { useStore } from '../context/StoreContext.js';

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  onOrderCreated: (orderNumber: string) => void;
}

export function CheckoutModal({ open, onClose, onOrderCreated }: CheckoutModalProps) {
  const { lang, t, cart, couponCode, placeOrder, user } = useStore();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [shipping, setShipping] = useState({
    fullName: user.name.replace(' (Studio Admin)', ''),
    email: user.email,
    phone: '+90 532 555 0148',
    city: 'İstanbul',
    district: 'Kadıköy',
    addressLine: 'Bağdat Cad. No: 214 Daire: 6',
    postalCode: '34728',
  });
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>('standard');
  const [card, setCard] = useState({
    holder: 'SELIN DEMIR',
    number: '4532 8910 3421 4821',
    expiry: '08/29',
    cvc: '412',
  });

  const totals = useMemo(
    () => calculateCartTotals(cart, couponCode, deliveryMethod),
    [cart, couponCode, deliveryMethod],
  );

  if (!open) return null;

  const validateShipping = (): boolean => {
    const res = shippingAddressSchema.safeParse(shipping);
    if (res.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of res.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      next[key] = issue.message;
    }
    setErrors(next);
    return false;
  };

  const handleSubmitOrder = async () => {
    const digits = card.number.replace(/\D/g, '');
    if (digits.length < 12 || card.holder.trim().length < 2) {
      setErrors({ card: lang === 'tr' ? 'Geçerli kart bilgisi giriniz.' : 'Enter valid card details.' });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const order = await placeOrder({
        shipping,
        deliveryMethod,
        paymentLast4: digits.slice(-4),
        couponCode: couponCode || undefined,
      });
      setCreatedOrder(order);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Checkout error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setCreatedOrder(null);
    setStep(0);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      onClick={handleResetAndClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E7E5E0] bg-[#FAF9F6] p-6 sm:p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-[#57534C] hover:bg-[#F2EFE9] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {createdOrder ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#1F3A2E]" />
            <h2 className="mt-4 font-editorial text-3xl font-medium text-[#141413]">
              {t.checkout.successTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#57534C]">
              {t.checkout.successDesc(createdOrder.orderNumber)}
            </p>
            <div className="mt-6 inline-block rounded-xl border border-[#E7E5E0] bg-white px-5 py-3 text-xs tabular-nums">
              <span className="text-[#6A665E]">{t.orders.orderNumber}: </span>
              <span className="font-semibold text-[#141413]">{createdOrder.orderNumber}</span>
              <span className="mx-2 text-[#D6D1C7]">|</span>
              <span className="font-semibold text-[#141413]">
                {formatPriceTry(createdOrder.totalTry, lang)}
              </span>
            </div>
            <div className="mt-7 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const num = createdOrder.orderNumber;
                  handleResetAndClose();
                  onOrderCreated(num);
                }}
                className="rounded-full bg-[#141413] px-6 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#FAF9F6] cursor-pointer"
              >
                {t.checkout.trackOrder}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-editorial text-3xl font-medium text-[#141413]">{t.checkout.title}</h2>

            {/* Step Indicator */}
            <div className="mt-5 grid grid-cols-3 gap-2 border-b border-[#E7E5E0] pb-4">
              {t.checkout.steps.map((label, idx) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                    step === idx
                      ? 'bg-[#141413] text-[#FAF9F6]'
                      : idx < step
                        ? 'bg-[#EAE6DC] text-[#141413]'
                        : 'bg-white text-[#8C877E] border border-[#E7E5E0]'
                  }`}
                >
                  <span className="tabular-nums">0{idx + 1}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Step 0: Shipping */}
            {step === 0 && (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(
                  [
                    ['fullName', t.checkout.fullName, 'sm:col-span-2'],
                    ['email', t.checkout.email, ''],
                    ['phone', t.checkout.phone, ''],
                    ['city', t.checkout.city, ''],
                    ['district', t.checkout.district, ''],
                    ['addressLine', t.checkout.addressLine, 'sm:col-span-2'],
                    ['postalCode', t.checkout.postalCode, ''],
                  ] as const
                ).map(([field, label, span]) => (
                  <div key={field} className={span}>
                    <label className="mb-1 block text-xs font-medium text-[#4A4741]">{label}</label>
                    <input
                      type="text"
                      value={shipping[field]}
                      onChange={(e) => setShipping({ ...shipping, [field]: e.target.value })}
                      className="w-full rounded-xl border border-[#E7E5E0] bg-white px-3.5 py-2.5 text-sm text-[#141413] outline-none focus:border-[#141413]"
                    />
                    {errors[field] && <p className="mt-1 text-[11px] text-[#991B1B]">{errors[field]}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Step 1: Delivery */}
            {step === 1 && (
              <div className="mt-6 space-y-3">
                {(
                  [
                    {
                      id: 'standard',
                      title: t.checkout.deliveryStandard,
                      desc: t.checkout.deliveryStandardDesc,
                      price: totals.subtotalTry - totals.discountTry >= 3000 ? t.cart.free : formatPriceTry(120, lang),
                    },
                    {
                      id: 'express',
                      title: t.checkout.deliveryExpress,
                      desc: t.checkout.deliveryExpressDesc,
                      price: formatPriceTry(240, lang),
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDeliveryMethod(opt.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      deliveryMethod === opt.id
                        ? 'border-[#141413] bg-white shadow-xs'
                        : 'border-[#E7E5E0] bg-[#FAF9F6] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Truck className="mt-0.5 h-4 w-4 text-[#141413]" />
                      <div>
                        <p className="text-sm font-medium text-[#141413]">{opt.title}</p>
                        <p className="mt-0.5 text-xs text-[#6A665E]">{opt.desc}</p>
                      </div>
                    </div>
                    <span className="tabular-nums text-xs font-semibold text-[#141413]">
                      {opt.price}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2 rounded-xl border border-[#DFDBD2] bg-[#F2EFE9] px-3.5 py-2.5 text-xs text-[#4A4741]">
                  <Lock className="h-3.5 w-3.5 text-[#1F3A2E]" />
                  <span>{t.checkout.demoCardNote}</span>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#4A4741]">
                    {t.checkout.cardHolder}
                  </label>
                  <input
                    type="text"
                    value={card.holder}
                    onChange={(e) => setCard({ ...card, holder: e.target.value })}
                    className="w-full rounded-xl border border-[#E7E5E0] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#141413]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#4A4741]">
                    {t.checkout.cardNumber}
                  </label>
                  <div className="relative">
                    <CreditCard className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#78746C]" />
                    <input
                      type="text"
                      value={card.number}
                      onChange={(e) => setCard({ ...card, number: e.target.value })}
                      className="w-full rounded-xl border border-[#E7E5E0] bg-white py-2.5 pl-10 pr-3.5 text-sm tabular-nums outline-none focus:border-[#141413]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#4A4741]">
                      {t.checkout.expiry}
                    </label>
                    <input
                      type="text"
                      value={card.expiry}
                      onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                      className="w-full rounded-xl border border-[#E7E5E0] bg-white px-3.5 py-2.5 text-sm tabular-nums outline-none focus:border-[#141413]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#4A4741]">
                      {t.checkout.cvc}
                    </label>
                    <input
                      type="text"
                      value={card.cvc}
                      onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                      className="w-full rounded-xl border border-[#E7E5E0] bg-white px-3.5 py-2.5 text-sm tabular-nums outline-none focus:border-[#141413]"
                    />
                  </div>
                </div>
                {errors.card && <p className="text-xs text-[#991B1B]">{errors.card}</p>}
                {errors.form && <p className="text-xs text-[#991B1B]">{errors.form}</p>}
              </div>
            )}

            {/* Order Summary Bar & Navigation */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-[#E7E5E0] pt-5">
              <div className="tabular-nums">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#6A665E]">{t.cart.total}</p>
                <p className="text-lg font-semibold text-[#141413]">
                  {formatPriceTry(totals.totalTry, lang)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((step - 1) as 0 | 1)}
                    className="rounded-full border border-[#E7E5E0] bg-white px-5 py-2.5 text-xs font-medium text-[#141413] cursor-pointer"
                  >
                    {t.checkout.back}
                  </button>
                )}
                {step < 2 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 0 && !validateShipping()) return;
                      setStep((step + 1) as 1 | 2);
                    }}
                    className="rounded-full bg-[#141413] px-6 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-[#FAF9F6] cursor-pointer"
                  >
                    {t.checkout.next}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitOrder}
                    className="rounded-full bg-[#1F3A2E] px-6 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-[#FAF9F6] disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? t.checkout.processing : t.checkout.placeOrder}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

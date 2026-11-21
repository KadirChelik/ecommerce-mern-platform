import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Package, Search, Truck } from 'lucide-react';
import { formatPriceTry } from '../../shared/commerce.js';
import type { OrderStatus } from '../../shared/types.js';
import { useStore } from '../context/StoreContext.js';

interface OrdersViewProps {
  initialOrderNumber?: string;
}

const STAGES: OrderStatus[] = ['received', 'preparing', 'shipped', 'delivered'];

export function OrdersView({ initialOrderNumber }: OrdersViewProps) {
  const { lang, t, orders } = useStore();
  const [searchQuery, setSearchQuery] = useState(initialOrderNumber ?? '');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrderNumber) {
      setSearchQuery(initialOrderNumber);
      const found = orders.find((o) => o.orderNumber === initialOrderNumber);
      if (found) setSelectedOrderId(found.id);
    }
  }, [initialOrderNumber, orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.shipping.fullName.toLowerCase().includes(q),
    );
  }, [orders, searchQuery]);

  const activeOrder =
    filteredOrders.find((o) => o.id === selectedOrderId) ?? filteredOrders[0] ?? null;

  const currentStageIndex = activeOrder ? STAGES.indexOf(activeOrder.status) : 0;

  return (
    <section className="mx-auto max-w-[1380px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E7E5E0] pb-6">
        <div>
          <h1 className="font-editorial text-4xl font-medium text-[#141413]">{t.orders.title}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[#57534C]">{t.orders.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-2.5 h-3.5 w-3.5 text-[#78746C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.orders.searchPlaceholder}
              className="w-64 rounded-full border border-[#E7E5E0] bg-white py-2 pl-9 pr-4 text-xs text-[#141413] outline-none focus:border-[#141413]"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="rounded-full border border-[#E7E5E0] bg-white px-3.5 py-2 text-xs text-[#141413] hover:bg-[#F2EFE9] cursor-pointer"
            >
              {t.orders.showAll}
            </button>
          )}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#D6D1C7] bg-white p-12 text-center text-sm text-[#6A665E]">
          {t.orders.empty}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left list */}
          <div className="space-y-3 lg:col-span-4">
            {filteredOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrderId(order.id)}
                className={`w-full rounded-xl border p-4 text-left transition-all cursor-pointer ${
                  activeOrder?.id === order.id
                    ? 'border-[#141413] bg-white shadow-xs'
                    : 'border-[#E7E5E0] bg-white/70 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="tabular-nums text-xs font-semibold text-[#141413]">
                    {order.orderNumber}
                  </span>
                  <span className="rounded-full bg-[#F2EFE9] px-2.5 py-0.5 text-[11px] font-medium text-[#141413]">
                    {t.orders.statuses[order.status]}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[#57534C]">{order.shipping.fullName}</p>
                <div className="mt-2 flex items-center justify-between text-xs tabular-nums text-[#78746C]">
                  <span>{new Date(order.createdAt).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
                  <span className="font-semibold text-[#141413]">{formatPriceTry(order.totalTry, lang)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Active Order Detail */}
          {activeOrder && (
            <div className="rounded-2xl border border-[#E7E5E0] bg-white p-6 sm:p-8 lg:col-span-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E7E5E0] pb-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#78746C]">
                    {t.orders.orderNumber}
                  </p>
                  <h2 className="mt-1 font-editorial text-3xl font-medium text-[#141413] tabular-nums">
                    {activeOrder.orderNumber}
                  </h2>
                  <p className="mt-1 text-xs text-[#57534C]">
                    {activeOrder.shipping.fullName} · {activeOrder.shipping.city}, {activeOrder.shipping.district}
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <p className="text-xs text-[#6A665E]">
                    {t.orders.payment}: •••• {activeOrder.paymentLast4}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#141413]">
                    {formatPriceTry(activeOrder.totalTry, lang)}
                  </p>
                </div>
              </div>

              {/* 4-Stage Progress Bar */}
              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {STAGES.map((stage, idx) => {
                  const done = idx <= currentStageIndex;
                  const Icon =
                    stage === 'received'
                      ? Clock
                      : stage === 'preparing'
                        ? Package
                        : stage === 'shipped'
                          ? Truck
                          : CheckCircle2;
                  return (
                    <div
                      key={stage}
                      className={`rounded-xl border p-3 ${
                        done
                          ? 'border-[#1F3A2E] bg-[#1F3A2E]/5 text-[#141413]'
                          : 'border-[#E7E5E0] bg-[#FAF9F6] text-[#969087]'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${done ? 'text-[#1F3A2E]' : 'text-[#A8A298]'}`} />
                      <p className="mt-2 text-xs font-semibold">{t.orders.statuses[stage]}</p>
                    </div>
                  );
                })}
              </div>

              {/* Timeline Events */}
              <div className="mt-7">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6A665E]">
                  {t.orders.timeline}
                </h3>
                <div className="mt-3 space-y-3 border-l border-[#E7E5E0] pl-4">
                  {[...activeOrder.timeline].reverse().map((ev, idx) => (
                    <div key={`${ev.status}-${idx}`} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#1F3A2E]" />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold text-[#141413]">
                          {t.orders.statuses[ev.status]}
                        </p>
                        <span className="tabular-nums text-[11px] text-[#78746C]">
                          {new Date(ev.timestamp).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#57534C]">{ev.note[lang]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-7 border-t border-[#E7E5E0] pt-5">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6A665E]">
                  {t.orders.items}
                </h3>
                <div className="mt-3 space-y-3">
                  {activeOrder.items.map((item) => (
                    <div key={item.sku} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.title[lang]}
                          className="h-14 w-11 rounded-md border border-[#E7E5E0] bg-[#F3F1EC] object-cover"
                        />
                        <div>
                          <p className="text-xs font-medium text-[#141413]">{item.title[lang]}</p>
                          <p className="text-[11px] text-[#6A665E]">
                            {item.colorName[lang]} · {item.size} · ×{item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="tabular-nums text-xs font-semibold text-[#141413]">
                        {formatPriceTry(item.unitPriceTry * item.quantity, lang)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

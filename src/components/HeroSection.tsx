import { ArrowRight } from 'lucide-react';
import type { CategoryId } from '../../shared/types.js';
import { useStore } from '../context/StoreContext.js';

interface HeroSectionProps {
  onExploreCatalog: () => void;
  onSelectCategory: (cat: CategoryId) => void;
}

export function HeroSection({ onExploreCatalog, onSelectCategory }: HeroSectionProps) {
  const { t, storageMode } = useStore();

  return (
    <section className="border-b border-[#E7E5E0] bg-[#FAF9F6]">
      <div className="mx-auto max-w-[1380px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-[#E7E5E0] bg-[#F2EFE9] lg:grid-cols-12">
          {/* Editorial Copy */}
          <div className="flex flex-col justify-between p-7 sm:p-10 lg:col-span-5 lg:p-12">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D8D3C8] bg-[#FAF9F6] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#57534C]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1F3A2E]" />
                <span>{t.hero.eyebrow}</span>
              </div>

              <h1 className="font-editorial text-4xl font-medium leading-[1.06] tracking-tight text-[#141413] sm:text-5xl">
                {t.hero.title}
              </h1>

              <p className="mt-4 max-w-md text-sm leading-relaxed text-[#57534C] sm:text-[15px]">
                {t.hero.subtitle}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onExploreCatalog}
                  className="inline-flex items-center gap-2 rounded-full bg-[#141413] px-6 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#FAF9F6] hover:bg-[#2C2C2A] transition-colors cursor-pointer"
                >
                  <span>{t.hero.ctaPrimary}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('outerwear')}
                  className="inline-flex items-center rounded-full border border-[#141413]/30 bg-[#FAF9F6] px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#141413] hover:border-[#141413] transition-colors cursor-pointer"
                >
                  {t.hero.ctaSecondary}
                </button>
              </div>
            </div>

            <div className="mt-8 border-t border-[#DFDBD2] pt-4 text-[11px] text-[#6E6A62]">
              <span className="font-medium text-[#141413]">
                {storageMode === 'mongodb' ? 'MongoDB Atlas' : 'Instant DemoStore'}
              </span>{' '}
              · {t.hero.statLine}
            </div>
          </div>

          {/* 16:9 Campaign Photograph */}
          <div className="relative min-h-[280px] sm:min-h-[380px] lg:col-span-7 lg:min-h-[470px]">
            <img
              src="/products/hero-editorial.webp"
              alt="HANN Studio Atelier AW26 Campaign"
              className="h-full w-full object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}

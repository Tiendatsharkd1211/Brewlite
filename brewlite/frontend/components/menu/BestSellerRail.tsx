'use client';

// Dải "Bán chạy nhất" cuộn ngang, có nút cuộn trên desktop
import Link from 'next/link';
import { useMemo, useRef } from 'react';
import { formatNumber, formatVnd } from '@/lib/format';
import { useProducts } from '@/lib/products';
import { useProductSheet } from '@/components/product/ProductSheetProvider';
import { ChevronLeftIcon, PlusIcon } from '@/components/ui/Icons';
import Skeleton from '@/components/ui/Skeleton';
import ProductImage from './ProductImage';

export default function BestSellerRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const { openProduct } = useProductSheet();
  const { data, isLoading } = useProducts();
  const top = useMemo(() => [...(data ?? [])].sort((a, b) => b.sold - a.sold).slice(0, 6), [data]);
  if (!isLoading && top.length === 0) return null;
  const scroll = (dir: 1 | -1) => railRef.current?.scrollBy({ left: dir * railRef.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section aria-labelledby="best-title">
      <div className="flex items-end justify-between gap-3">
        <h2 id="best-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Bán chạy nhất tuần này
        </h2>
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => scroll(-1)} className="grid h-10 w-10 place-items-center rounded-full border-2 border-roast/10 bg-foam hover:border-espresso" aria-label="Cuộn sang trái">
            <ChevronLeftIcon />
          </button>
          <button type="button" onClick={() => scroll(1)} className="grid h-10 w-10 place-items-center rounded-full border-2 border-roast/10 bg-foam hover:border-espresso" aria-label="Cuộn sang phải">
            <ChevronLeftIcon className="h-5 w-5 rotate-180" />
          </button>
        </div>
      </div>
      <div ref={railRef} className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2">
        {isLoading &&
          [0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[5/4] w-[78%] shrink-0 rounded-[1.75rem] sm:w-[44%] lg:w-[31%]" />)}
        {top.map((p, i) => (
          <article key={p.id} className="group relative w-[78%] shrink-0 snap-start overflow-hidden rounded-[1.75rem] sm:w-[44%] lg:w-[31%]">
            <Link href={`/product/${p.id}`} className="absolute inset-0 z-10" aria-label={`Xem chi tiết ${p.name}`} />
            <div className="aspect-[5/4]">
              <ProductImage product={p} width={700} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.05]" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-roast/85 via-roast/20 to-transparent" aria-hidden="true" />
            <span className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-foam text-sm font-extrabold text-espresso">{i + 1}</span>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-foam">
              <div>
                <p className="text-lg font-extrabold leading-tight">{p.name}</p>
                <p className="text-sm text-foam/75">
                  {formatVnd(p.price)}, {formatNumber(p.sold)} ly đã bán
                </p>
              </div>
              <button
                type="button"
                onClick={() => openProduct(p.id)}
                disabled={p.stock <= 0}
                className="relative z-20 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold text-roast transition-transform hover:scale-105 active:scale-90"
                aria-label={`Chọn tuỳ chọn và thêm ${p.name} vào giỏ`}
              >
                <PlusIcon />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

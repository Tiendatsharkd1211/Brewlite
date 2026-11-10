'use client';

// "Món bán chạy": 6 món được gọi nhiều nhất, mỗi món một cột ngăn bằng đường kẻ dọc như mục trên báo
import Link from 'next/link';
import { useMemo } from 'react';
import { formatVnd } from '@/lib/format';
import { useProducts } from '@/lib/products';
import { useProductSheet } from '@/components/product/ProductSheetProvider';
import Skeleton from '@/components/ui/Skeleton';
import ProductImage from './ProductImage';

export default function BestSellerRail() {
  const { openProduct } = useProductSheet();
  const { data, isLoading } = useProducts();
  const top = useMemo(() => [...(data ?? [])].sort((a, b) => b.sold - a.sold).slice(0, 6), [data]);
  if (!isLoading && top.length === 0) return null;

  return (
    <section aria-labelledby="best-title">
      <div className="flex items-end justify-between gap-3 border-b-2 border-roast pb-2">
        <h2 id="best-title" className="text-3xl font-black">
          Món bán chạy
        </h2>
        <p className="kicker hidden sm:block">Khách quen hay gọi</p>
      </div>
      <ol className="no-scrollbar -mx-4 flex snap-x overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-6 lg:px-0">
        {isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="mr-4 mt-4 h-64 w-40 shrink-0" />)}
        {top.map((p, i) => (
          <li key={p.id} className="group relative w-44 shrink-0 snap-start border-l border-roast px-4 py-4 first:border-l-0 lg:w-auto">
            <Link href={`/product/${p.id}`} className="absolute inset-0 z-10" aria-label={`Xem chi tiết ${p.name}`} />
            <span className="font-display text-5xl font-black leading-none text-gold">{String(i + 1).padStart(2, '0')}</span>
            <div className="mt-2 aspect-square overflow-hidden border border-roast bg-cream p-1">
              <ProductImage product={p} width={400} className="menu-print h-full w-full" />
            </div>
            <p className="mt-2 font-display text-lg font-bold leading-tight">{p.name}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="tabular-nums text-sm font-semibold">{formatVnd(p.price)}</span>
              <button
                type="button"
                onClick={() => openProduct(p.id)}
                disabled={p.stock <= 0}
                className="relative z-20 font-label text-xs font-semibold underline underline-offset-4 hover:text-gold disabled:text-roast/40 disabled:no-underline"
                aria-label={`Chọn tuỳ chọn và thêm ${p.name} vào giỏ`}
              >
                {p.stock <= 0 ? 'Hết' : '+ Thêm'}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

'use client';

// "Thực đơn theo nhóm" ở trang nhất: mỗi nhóm một ô ảnh (món bán chạy nhất của nhóm), bấm vào mở trang Thực đơn đã lọc sẵn
import Link from 'next/link';
import { useMemo } from 'react';
import { CATEGORIES } from '@/lib/mock-data';
import { useProducts } from '@/lib/products';
import Skeleton from '@/components/ui/Skeleton';
import ProductImage from './ProductImage';

export default function CategoryShelf() {
  const { data, isLoading } = useProducts();
  const groups = useMemo(
    () =>
      CATEGORIES.map((c) => {
        const items = (data ?? []).filter((p) => p.category === c.id);
        const cover = [...items].sort((a, b) => b.sold - a.sold)[0];
        const sample = [...items].sort((a, b) => b.sold - a.sold).slice(0, 3).map((p) => p.name);
        return { ...c, cover, sample };
      }),
    [data],
  );

  return (
    <section aria-labelledby="shelf-title">
      <div className="flex items-end justify-between gap-3 border-b-2 border-roast pb-2">
        <h2 id="shelf-title" className="text-3xl font-black">
          Thực đơn theo nhóm
        </h2>
        <Link href="/menu" className="font-label text-xs font-semibold uppercase tracking-wider underline underline-offset-4 hover:text-gold">
          Xem cả thực đơn →
        </Link>
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {groups.map((g) => (
          <li key={g.id}>
            <Link href={`/menu?nhom=${g.id}`} className="group block">
              <div className="aspect-[4/3] overflow-hidden border border-roast bg-cream p-1.5">
                {isLoading || !g.cover ? <Skeleton className="h-full w-full" /> : <ProductImage product={g.cover} width={500} className="menu-print h-full w-full" />}
              </div>
              <p className="mt-2 font-display text-xl font-black leading-tight group-hover:text-gold">{g.name}</p>
              {g.sample.length > 0 && <p className="mt-0.5 line-clamp-1 text-sm text-roast/70">{g.sample.join(', ')}…</p>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

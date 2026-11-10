'use client';

// Cột "Được gọi nhiều hôm nay" ở trang nhất: bấm vào dòng để xem món và đặt
import Link from 'next/link';
import { formatNumber } from '@/lib/format';
import { useProducts } from '@/lib/products';
import Skeleton from '@/components/ui/Skeleton';

export default function TodayPrices() {
  const { data, isError } = useProducts();

  if (isError) return <p className="py-4 text-sm text-chili">Chưa tải được bảng giá.</p>;
  if (!data) {
    return (
      <div className="space-y-3 py-2" aria-busy="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-6" />
        ))}
      </div>
    );
  }

  const top = [...data].sort((a, b) => b.sold - a.sold).slice(0, 7);
  return (
    <ul>
      {top.map((p) => (
        <li key={p.id} className="border-b border-dotted border-roast/50">
          <Link href={`/product/${p.id}`} className="flex items-baseline justify-between gap-3 py-2 hover:text-gold">
            <span>
              {p.name}
              {p.stock > 0 && p.stock <= 10 && <span className="ml-2 font-label text-[11px] uppercase tracking-wider text-gold">còn {p.stock}</span>}
              {p.stock <= 0 && <span className="ml-2 font-label text-[11px] uppercase tracking-wider text-roast/50">hết hàng</span>}
            </span>
            <span className="tabular-nums text-sm">{formatNumber(p.price)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

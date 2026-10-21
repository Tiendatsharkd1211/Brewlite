'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/context/app-store';
import { CATEGORIES } from '@/lib/mock-data';
import { useProducts } from '@/lib/products';
import { searchProducts, type ProductHit } from '@/lib/search';
import type { CategoryId } from '@/lib/types';
import Skeleton from '@/components/ui/Skeleton';
import { AlertIcon, HeartIcon } from '@/components/ui/Icons';
import ProductCard from './ProductCard';

type Filter = 'all' | 'featured' | 'favorites' | CategoryId;
type Sort = 'popular' | 'rating' | 'price-asc' | 'price-desc';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'featured', label: 'Món mới & Bán chạy' },
  ...CATEGORIES.map((c) => ({ id: c.id as Filter, label: c.name })),
  { id: 'favorites', label: 'Yêu thích' },
];

const SORTS: { id: Sort; label: string }[] = [
  { id: 'popular', label: 'Bán chạy nhất' },
  { id: 'rating', label: 'Đánh giá cao' },
  { id: 'price-asc', label: 'Giá thấp đến cao' },
  { id: 'price-desc', label: 'Giá cao đến thấp' },
];

interface Props {
  initialQuery?: string;
  title: string;
}

export default function MenuBrowser({ initialQuery = '', title }: Props) {
  const { favorites, hydrated } = useAppStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('popular');
  const [query, setQuery] = useState(initialQuery);
  // Menu từ GET /products (React Query lo loading, lỗi, cache)
  const { data: products, isLoading, isError, error, refetch, isFetching } = useProducts();

  const hits = useMemo<ProductHit[]>(() => {
    const searching = Boolean(query.trim());
    const list = products ?? [];
    const base = searching ? searchProducts(list, query) : list.map((product) => ({ product, match: { score: 0, ranges: [] } }));
    const filtered = base.filter(({ product }) => {
      if (filter === 'all') return true;
      if (filter === 'featured') return Boolean(product.tag);
      if (filter === 'favorites') return favorites.includes(product.id);
      return product.category === filter;
    });
    // Đang tìm kiếm thì giữ thứ tự "khớp nhất" trừ khi người dùng chọn sắp xếp theo giá
    if (searching && (sort === 'popular' || sort === 'rating')) return filtered;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === 'price-asc') return a.product.price - b.product.price;
      if (sort === 'price-desc') return b.product.price - a.product.price;
      if (sort === 'rating') return b.product.rating - a.product.rating;
      return b.product.sold - a.product.sold;
    });
    return sorted;
  }, [products, query, filter, sort, favorites]);

  return (
    <section id="menu" className="scroll-mt-36">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-roast/60">Sắp xếp</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-10 rounded-full border-2 border-roast/10 bg-foam px-3 font-semibold focus:border-espresso focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Lọc theo danh mục">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors ${
              filter === f.id ? 'border-espresso bg-espresso text-foam' : 'border-roast/10 bg-foam hover:border-espresso/40'
            }`}
          >
            {f.id === 'favorites' && <HeartIcon filled={filter === f.id} className="h-4 w-4" />}
            {f.label}
            {f.id === 'favorites' && hydrated && favorites.length > 0 && <span className="tabular-nums opacity-70">{favorites.length}</span>}
          </button>
        ))}
      </div>

      {query.trim() && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span>
            {hits.length} món khớp <b>“{query.trim()}”</b>
          </span>
          <button type="button" onClick={() => setQuery('')} className="font-semibold text-espresso underline underline-offset-4">
            Xoá tìm kiếm
          </button>
        </div>
      )}

      {isError ? (
        <div className="mt-6 flex flex-col items-center rounded-3xl bg-foam px-6 py-10 text-center">
          <AlertIcon className="h-10 w-10 text-chili" />
          <p className="mt-3 text-lg font-bold">Không tải được thực đơn</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-roast/65">{error instanceof Error ? error.message : 'Máy chủ chưa phản hồi.'}</p>
          <button type="button" onClick={() => refetch()} disabled={isFetching} className="mt-5 rounded-full bg-gold px-5 py-2.5 font-bold text-roast disabled:opacity-60">
            {isFetching ? 'Đang thử lại…' : 'Thử lại'}
          </button>
        </div>
      ) : isLoading ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-busy="true" aria-label="Đang tải thực đơn">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-3xl bg-foam">
              <Skeleton className="aspect-[4/5] rounded-none" />
              <div className="p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/3" />
                <Skeleton className="mt-4 h-5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : hits.length ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {hits.map(({ product, match }, i) => (
            <ProductCard key={product.id} product={product} ranges={match.ranges} index={i} />
          ))}
        </div>
      ) : products && products.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-foam px-6 py-10 text-center">
          <p className="text-lg font-bold">Thực đơn đang được cập nhật</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-roast/65">Cửa hàng chưa có món nào. Chạy lệnh nạp dữ liệu mẫu (npm run seed) ở thư mục backend.</p>
        </div>
      ) : filter === 'favorites' && !query.trim() ? (
        <div className="mt-6 rounded-3xl bg-foam px-6 py-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-chili/10 text-chili">
            <HeartIcon className="h-7 w-7" />
          </span>
          <p className="mt-4 text-lg font-bold">Chưa có món yêu thích</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-roast/65">Bấm biểu tượng trái tim trên ảnh món để lưu lại, lần sau đặt nhanh hơn.</p>
          <button type="button" onClick={() => setFilter('all')} className="mt-5 rounded-full bg-gold px-5 py-2.5 font-bold text-roast">
            Xem toàn bộ thực đơn
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl bg-foam px-6 py-10 text-center">
          <p className="text-lg font-bold">Không có món nào khớp “{query.trim()}”</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-roast/65">
            Thử gõ không dấu hoặc chữ cái đầu mỗi từ, ví dụ <b>bx</b> cho Bạc xỉu, <b>tdcs</b> cho Trà đào cam sả.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
            className="mt-5 rounded-full bg-gold px-5 py-2.5 font-bold text-roast"
          >
            Xem toàn bộ thực đơn
          </button>
        </div>
      )}
    </section>
  );
}

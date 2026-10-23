'use client';

import Link from 'next/link';
import { useAppStore } from '@/context/app-store';
import { formatNumber, formatVnd } from '@/lib/format';
import type { Range } from '@/lib/search';
import type { Product } from '@/lib/types';
import { useProductSheet } from '@/components/product/ProductSheetProvider';
import Highlight from '@/components/ui/Highlight';
import { HeartIcon, PlusIcon, StarIcon } from '@/components/ui/Icons';
import ProductImage from './ProductImage';

interface Props {
  product: Product;
  ranges?: Range[];
  /** Thứ tự xuất hiện, để các thẻ hiện lần lượt */
  index?: number;
}

export default function ProductCard({ product, ranges = [], index = 0 }: Props) {
  const { favorites, toggleFavorite } = useAppStore();
  const { openProduct } = useProductSheet();
  const favorite = favorites.includes(product.id);

  return (
    <article
      className="group relative flex animate-rise flex-col overflow-hidden rounded-3xl bg-foam ring-1 ring-roast/5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-22px_rgba(59,42,32,.55)]"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      {/* Cả thẻ bấm được để mở chi tiết; nút tim và nút + nằm trên lớp này */}
      <Link href={`/product/${product.id}`} className="absolute inset-0 z-10 rounded-3xl" aria-label={`Xem chi tiết ${product.name}`} />
      <div className="relative aspect-[4/5] overflow-hidden">
        <ProductImage product={product} className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-roast/40 to-transparent" aria-hidden="true" />
        {product.tag && (
          <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-foam ${product.tag === 'hot' ? 'bg-chili' : 'bg-leaf'}`}>
            {product.tag === 'hot' ? 'Hot' : 'Mới'}
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-pressed={favorite}
          aria-label={favorite ? `Bỏ ${product.name} khỏi yêu thích` : `Thêm ${product.name} vào yêu thích`}
          className={`absolute right-2.5 top-2.5 z-20 grid h-9 w-9 place-items-center rounded-full backdrop-blur transition-[transform,color] active:scale-90 ${favorite ? 'bg-foam text-chili' : 'bg-foam/80 text-roast/60 hover:text-chili'}`}
        >
          <HeartIcon filled={favorite} className="h-[18px] w-[18px]" />
        </button>
        {product.stock <= 0 ? (
          <span className="absolute inset-0 grid place-items-center bg-roast/55 text-sm font-extrabold uppercase tracking-wider text-foam">Hết hàng</span>
        ) : product.stock <= 10 ? (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-roast">Còn {product.stock}</span>
        ) : null}
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-roast/55 px-2 py-0.5 text-[11px] font-semibold text-foam backdrop-blur">
          <StarIcon className="h-3 w-3 text-gold" />
          {product.rating.toFixed(1).replace('.', ',')}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="font-bold leading-snug">
          <Highlight text={product.name} ranges={ranges} />
        </h3>
        <p className="mt-0.5 text-xs text-roast/50">{formatNumber(product.sold)} đã bán</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="font-bold tabular-nums text-espresso">{formatVnd(product.price)}</span>
          <button
            type="button"
            onClick={() => openProduct(product.id)}
            disabled={product.stock <= 0}
            aria-label={product.stock <= 0 ? `${product.name} đã hết hàng` : `Chọn tuỳ chọn và thêm ${product.name} vào giỏ`}
            className="relative z-20 grid h-10 w-10 place-items-center rounded-full bg-gold text-roast shadow-[0_8px_18px_-8px_rgba(168,101,15,.9)] transition-[background-color,color,transform] enabled:hover:bg-gold-deep enabled:hover:text-foam enabled:active:scale-90 disabled:cursor-not-allowed disabled:bg-roast/15 disabled:text-roast/40 disabled:shadow-none"
          >
            <PlusIcon />
          </button>
        </div>
      </div>
    </article>
  );
}

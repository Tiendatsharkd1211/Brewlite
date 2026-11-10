'use client';

// Thẻ món kiểu "tin rao" trên báo: ảnh in cùng một tông trong khung viền, tên món chữ tít, giá chữ máy đánh.
import Link from 'next/link';
import { useFavorites } from '@/lib/favorites';
import { formatVnd } from '@/lib/format';
import { useManagerPreview } from '@/lib/preview';
import type { Range } from '@/lib/search';
import type { Product } from '@/lib/types';
import { useProductSheet } from '@/components/product/ProductSheetProvider';
import Highlight from '@/components/ui/Highlight';
import { HeartIcon, PlusIcon } from '@/components/ui/Icons';
import ProductImage from './ProductImage';

interface Props {
  product: Product;
  ranges?: Range[];
  /** Thứ tự xuất hiện, để các thẻ hiện lần lượt */
  index?: number;
}

export default function ProductCard({ product, ranges = [], index = 0 }: Props) {
  const { favorites, toggleFavorite } = useFavorites();
  const { openProduct } = useProductSheet();
  const favorite = favorites.includes(product.id);
  const soldOut = product.stock <= 0;
  const preview = useManagerPreview();

  return (
    <article className="group relative flex animate-rise flex-col border-t-2 border-roast pt-2" style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}>
      {/* Cả thẻ bấm được để mở chi tiết; nút tim và nút Thêm nằm trên lớp này */}
      <Link href={`/product/${product.id}`} className="absolute inset-0 z-10" aria-label={`Xem chi tiết ${product.name}`} />
      <div className="flex items-center justify-between font-label text-[11px] uppercase tracking-wider">
        <span className={product.tag === 'hot' ? 'text-gold' : product.tag === 'new' ? 'text-leaf' : 'text-roast/50'}>
          {product.tag === 'hot' ? 'Bán chạy' : product.tag === 'new' ? 'Món mới' : ''}
        </span>
        {product.rating > 0 && <span className="text-roast/60">★ {product.rating.toFixed(1).replace('.', ',')}</span>}
      </div>
      <div className="relative mt-2 aspect-square overflow-hidden border border-roast bg-cream p-1.5">
        <div className="h-full w-full overflow-hidden bg-cream">
          <ProductImage product={product} className="menu-print h-full w-full" />
        </div>
        {!preview && (
          <button
            type="button"
            onClick={() => toggleFavorite(product.id)}
            aria-pressed={favorite}
            aria-label={favorite ? `Bỏ ${product.name} khỏi yêu thích` : `Thêm ${product.name} vào yêu thích`}
            className={`absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center bg-cream/90 transition-colors ${favorite ? 'text-gold' : 'text-roast/60 hover:text-gold'}`}
          >
            <HeartIcon filled={favorite} className="h-[18px] w-[18px]" />
          </button>
        )}
        {soldOut ? (
          <span className="absolute inset-0 grid place-items-center bg-cream/70">
            <span className="stamp text-base text-gold">Hết hàng</span>
          </span>
        ) : product.stock <= 10 ? (
          <span className="stamp absolute bottom-2 left-2 bg-cream/90 text-gold">Chỉ còn {product.stock}</span>
        ) : null}
      </div>
      <h3 className="mt-2 text-lg font-bold leading-tight">
        <Highlight text={product.name} ranges={ranges} />
      </h3>
      {product.tagline && <p className="mt-0.5 line-clamp-2 font-serif text-sm italic leading-snug text-roast/70">{product.tagline}</p>}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-dotted border-roast/60 pt-2">
        <span className="tabular-nums font-semibold">{formatVnd(product.price)}</span>
        {!preview && (
          <button
            type="button"
            onClick={() => openProduct(product.id)}
            disabled={soldOut}
            aria-label={soldOut ? `${product.name} đã hết hàng` : `Chọn tuỳ chọn và thêm ${product.name} vào giỏ`}
            className="relative z-20 inline-flex h-9 items-center gap-1 border-2 border-roast px-2.5 text-xs font-semibold transition-colors enabled:hover:bg-roast enabled:hover:text-cream disabled:cursor-not-allowed disabled:border-roast/30 disabled:text-roast/40"
          >
            <PlusIcon className="h-4 w-4" /> Thêm
          </button>
        )}
      </div>
    </article>
  );
}

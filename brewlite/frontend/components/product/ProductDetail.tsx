'use client';

// MÀN HÌNH CHI TIẾT SẢN PHẨM: ảnh lớn bên trái, bộ chọn tuỳ chọn bên phải, gợi ý món cùng loại bên dưới.
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useAppStore } from '@/context/app-store';
import { flyToCart } from '@/lib/fly-to-cart';
import { useProducts } from '@/lib/products';
import type { NewCartItem } from '@/lib/types';
import ProductCard from '@/components/menu/ProductCard';
import ProductImage from '@/components/menu/ProductImage';
import Skeleton from '@/components/ui/Skeleton';
import Toast from '@/components/ui/Toast';
import { ChevronLeftIcon } from '@/components/ui/Icons';
import ProductCustomizer from './ProductCustomizer';

export default function ProductDetail({ productId }: { productId: string }) {
  const { data: products, isLoading, isError, refetch } = useProducts();
  const product = products?.find((p) => p.id === productId);
  const { addToCart } = useAppStore();
  const imageRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  if (isLoading) {
    return (
      <main className="mx-auto grid max-w-6xl gap-8 px-4 pt-10 md:grid-cols-2" aria-busy="true">
        <Skeleton className="aspect-[4/5] rounded-[2rem]" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Không tải được món này</h1>
        <p className="mt-2 text-roast/65">Máy chủ chưa phản hồi. Kiểm tra cửa sổ BrewLite Backend.</p>
        <button type="button" onClick={() => refetch()} className="mt-6 inline-flex rounded-full bg-gold px-6 py-3 font-bold text-roast">
          Thử lại
        </button>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Không tìm thấy món này</h1>
        <p className="mt-2 text-roast/65">Món có thể đã ngừng bán hoặc đường dẫn bị sai.</p>
        <Link href="/menu" className="mt-6 inline-flex rounded-full bg-gold px-6 py-3 font-bold text-roast">
          Xem thực đơn
        </Link>
      </main>
    );
  }

  const related = (products ?? []).filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  function handleAdd(item: NewCartItem) {
    addToCart(item);
    flyToCart(imageRef.current);
    setToast(`Đã thêm ${item.quantity} ${item.name}${item.size ? ` size ${item.size}` : ''} vào giỏ.`);
    setFormKey((k) => k + 1); // đặt lại lựa chọn cho lần thêm tiếp theo
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-40 pt-4 md:pb-16">
      <Link href="/menu" className="inline-flex items-center gap-1 rounded-full py-1 pr-2 text-sm font-semibold text-espresso hover:underline">
        <ChevronLeftIcon className="h-4 w-4" /> Thực đơn
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-12">
        <div ref={imageRef} className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-30px_rgba(59,42,32,.55)] md:sticky md:top-24 md:aspect-[4/5]">
          <ProductImage product={product} width={1100} priority className="h-full w-full animate-ken-burns" />
          {product.tag && (
            <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold text-foam ${product.tag === 'hot' ? 'bg-chili' : 'bg-leaf'}`}>
              {product.tag === 'hot' ? 'Bán chạy' : 'Món mới'}
            </span>
          )}
        </div>

        <div>
          <ProductCustomizer key={formKey} product={product} variant="page" submitLabel="Thêm vào giỏ" onSubmit={handleAdd} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-extrabold tracking-tight">Có thể bạn cũng thích</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <Toast message={toast} actionHref="/checkout" actionLabel="Xem giỏ hàng" onDone={() => setToast(null)} raised />
    </main>
  );
}

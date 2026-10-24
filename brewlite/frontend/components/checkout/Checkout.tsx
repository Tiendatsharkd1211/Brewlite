'use client';

// MÀN HÌNH GIỎ HÀNG (Task 5): xem món đã chọn, sửa số lượng, sửa tuỳ chọn, xoá món, tự tính tổng tiền.
// Giỏ hàng lưu trong Zustand (context/app-store.tsx) nên tải lại trang không mất.
// Phần đặt đơn và thanh toán (Task 6, 8) sẽ bổ sung vào chính màn hình này.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { MAX_QTY, useAppStore } from '@/context/app-store';
import { describeOptions, formatVnd } from '@/lib/format';
import { useProductMap } from '@/lib/products';
import ProductArt from '@/components/menu/ProductArt';
import ProductImage from '@/components/menu/ProductImage';
import { useProductSheet } from '@/components/product/ProductSheetProvider';
import QuantityStepper from '@/components/ui/QuantityStepper';
import Skeleton from '@/components/ui/Skeleton';
import { EditIcon, TrashIcon } from '@/components/ui/Icons';

function Panel({ title, id, children, action }: { title: string; id?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-3xl bg-foam p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function Checkout() {
  const { hydrated, cart, cartCount, subtotal, setQuantity, removeFromCart } = useAppStore();
  const { openProduct } = useProductSheet();
  const productMap = useProductMap();

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-6xl px-4 pt-6" aria-busy="true">
        <Skeleton className="h-9 w-48" />
        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-48 pt-6 md:pb-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Giỏ hàng</h1>

      {cart.length === 0 ? (
        <div className="mx-auto mt-8 max-w-md rounded-3xl bg-foam px-6 py-12 text-center">
          <ProductArt color="transparent" kind="drink" empty className="mx-auto h-32 w-28" />
          <h2 className="mt-4 text-xl font-extrabold">Giỏ hàng đang trống</h2>
          <p className="mt-2 text-sm leading-relaxed text-roast/65">Chọn món ở thực đơn, tuỳ chỉnh size và mức đường, rồi quay lại đây để thanh toán.</p>
          <Link href="/menu" className="mt-6 inline-flex rounded-full bg-gold px-6 py-3 font-bold text-roast">
            Xem thực đơn
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_360px] md:items-start">
          <div className="space-y-6">
            {/* Món đã chọn */}
            <Panel
              title={`Món đã chọn (${cartCount})`}
              action={
                <Link href="/menu" className="text-sm font-semibold text-espresso underline underline-offset-4">
                  Thêm món
                </Link>
              }
            >
              <ul className="divide-y divide-roast/10">
                {cart.map((item) => {
                  const product = productMap.get(item.productId);
                  const options = describeOptions(item);
                  return (
                    <li key={item.lineId} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                      <span className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-cream">
                        {product && <ProductImage product={product} width={200} className="h-full w-full" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-bold leading-snug">{item.name}</p>
                          <p className="shrink-0 font-semibold tabular-nums">{formatVnd(item.unitPrice * item.quantity)}</p>
                        </div>
                        {options && <p className="mt-0.5 text-sm text-roast/60">{options}</p>}
                        {item.note && <p className="mt-0.5 text-sm text-roast/60">Ghi chú: {item.note}</p>}
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <QuantityStepper compact value={item.quantity} onChange={(q) => setQuantity(item.lineId, q)} max={MAX_QTY} label={item.name} />
                          <span className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openProduct(item.productId, item)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-espresso hover:bg-espresso/10"
                            aria-label={`Sửa tuỳ chọn ${item.name}`}
                          >
                            <EditIcon className="h-4 w-4" /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.lineId)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-chili hover:bg-chili/10"
                            aria-label={`Xoá ${item.name} khỏi giỏ`}
                          >
                            <TrashIcon className="h-4 w-4" /> Xoá
                          </button>
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>

          </div>

          {/* Tóm tắt tiền hàng */}
          <aside className="md:sticky md:top-24">
            <section className="rounded-3xl bg-foam p-5 sm:p-6" aria-labelledby="summary-title">
              <h2 id="summary-title" className="text-lg font-extrabold">
                Tóm tắt giỏ hàng
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-roast/65">Tiền hàng ({cartCount} món)</dt>
                  <dd className="tabular-nums">{formatVnd(subtotal)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-roast/10 pt-4">
                <span className="font-bold">Tạm tính</span>
                <span className="text-2xl font-extrabold tabular-nums text-espresso">{formatVnd(subtotal)}</span>
              </div>
              <p className="mt-1 text-right text-xs text-roast/55">Phí giao hàng và mã ưu đãi tính ở bước thanh toán.</p>
            </section>
            <button
              type="button"
              disabled
              className="mt-4 h-12 w-full cursor-not-allowed rounded-full bg-roast/15 font-bold text-roast/45"
            >
              Thanh toán (đang phát triển)
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}

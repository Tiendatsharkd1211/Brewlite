'use client';

import Link from 'next/link';
import { formatDateTime, formatVnd } from '@/lib/format';
import { ACTIVE_STATUSES } from '@/lib/pricing';
import { useProductMap } from '@/lib/products';
import { useMyOrders } from '@/lib/use-orders';
import type { Order, Product } from '@/lib/types';
import ProductImage from '@/components/menu/ProductImage';
import Skeleton from '@/components/ui/Skeleton';
import { AlertIcon, ReceiptIcon } from '@/components/ui/Icons';
import OrderStatusPill from './OrderStatusPill';

function OrderRow({ order, index, productMap }: { order: Order; index: number; productMap: Map<string, Product> }) {
  const count = order.items.reduce((n, i) => n + i.qty, 0);
  const firstProducts = order.items
    .map((i) => productMap.get(i.productId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 3);
  return (
    <li className="animate-rise" style={{ animationDelay: `${index * 50}ms` }}>
      <Link href={`/orders/${order.id}`} className="flex items-center gap-4 rounded-2xl bg-foam p-4 transition-shadow hover:shadow-[0_16px_32px_-20px_rgba(59,42,32,.5)]">
        <div className="flex shrink-0 -space-x-3">
          {firstProducts.map((p) => (
            <span key={p.id} className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-foam">
              <ProductImage product={p} width={120} className="h-full w-full" />
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-bold">
            #{order.id} <OrderStatusPill status={order.status} fulfillment={order.fulfillment} />
          </p>
          <p className="mt-1 truncate text-sm text-roast/65">
            {count} món: {order.items.map((i) => i.productName).join(', ')}
          </p>
          <p className="mt-0.5 text-xs text-roast/50">{formatDateTime(order.createdAt)}</p>
        </div>
        <span className="shrink-0 font-bold tabular-nums text-espresso">{formatVnd(order.total)}</span>
      </Link>
    </li>
  );
}

export default function OrdersList() {
  const { orders, error, reload } = useMyOrders();
  const productMap = useProductMap();

  if (error) {
    return (
      <div className="mt-6 flex flex-col items-center rounded-3xl bg-foam px-6 py-10 text-center">
        <AlertIcon className="h-10 w-10 text-chili" />
        <p className="mt-3 font-bold">Không tải được đơn hàng</p>
        <p className="mt-1 text-sm text-roast/65">{error}</p>
        <button type="button" onClick={reload} className="mt-5 rounded-full bg-gold px-5 py-2.5 font-bold text-roast">
          Thử lại
        </button>
      </div>
    );
  }

  if (!orders) {
    return (
      <div className="mt-6 space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="mx-auto mt-8 max-w-md animate-rise rounded-[2rem] bg-foam px-6 py-12 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cream text-espresso">
          <ReceiptIcon className="h-8 w-8" />
        </span>
        <h2 className="mt-4 text-xl font-extrabold">Chưa có đơn hàng nào</h2>
        <p className="mt-2 text-sm leading-relaxed text-roast/65">Đơn bạn đặt sẽ hiện ở đây, kèm mã lấy món và trạng thái pha chế theo thời gian thực.</p>
        <Link href="/menu" className="mt-6 inline-flex rounded-full bg-gold px-6 py-3 font-bold text-roast">
          Đặt món đầu tiên
        </Link>
      </div>
    );
  }

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const done = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="mt-6 space-y-8">
      {active.length > 0 && (
        <section>
          <h2 className="mb-3 font-bold">Đang thực hiện</h2>
          <ul className="space-y-3">
            {active.map((order, i) => (
              <OrderRow key={order.id} order={order} index={i} productMap={productMap} />
            ))}
          </ul>
        </section>
      )}
      {done.length > 0 && (
        <section>
          <h2 className="mb-3 font-bold">Đã kết thúc</h2>
          <ul className="space-y-3">
            {done.map((order, i) => (
              <OrderRow key={order.id} order={order} index={i} productMap={productMap} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

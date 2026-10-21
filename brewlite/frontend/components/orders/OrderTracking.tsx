'use client';

// MÀN HÌNH THEO DÕI ĐƠN: trạng thái theo máy trạng thái của backend, mã lấy món + QR, thông tin quán.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/context/app-store';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import { PAYMENT_METHODS, STORES } from '@/lib/mock-data';
import { describeOptions, formatClock, formatDateTime, formatVnd } from '@/lib/format';
import { directionsUrl } from '@/lib/geo';
import { ORDER_STAGES, stageIndex, statusLabel } from '@/lib/pricing';
import { useProductMap } from '@/lib/products';
import type { Level, Order, SizeId } from '@/lib/types';
import MockQr from '@/components/checkout/MockQr';
import ProductImage from '@/components/menu/ProductImage';
import Skeleton from '@/components/ui/Skeleton';
import { AlertIcon, CheckIcon, ChevronLeftIcon, PhoneIcon, RouteIcon } from '@/components/ui/Icons';
import InvoiceModal from './InvoiceModal';

export default function OrderTracking({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { addManyToCart } = useAppStore();
  const { request } = useAuth();
  const productMap = useProductMap();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');
  const [errorText, setErrorText] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await request<Order>(`/orders/${encodeURIComponent(orderId)}`));
      setLoadState('ok');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setLoadState('missing');
      else {
        setErrorText(err instanceof ApiError ? err.message : 'Không tải được đơn hàng.');
        setLoadState('error');
      }
    }
  }, [request, orderId]);

  useEffect(() => {
    load();
  }, [load]);

  // Đơn đang chạy thì cứ 5 giây hỏi lại trạng thái (quầy có thể đã cập nhật)
  useEffect(() => {
    if (!order || ['COMPLETED', 'CANCELLED'].includes(order.status)) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [order, load]);

  /** Gọi API đổi trạng thái; máy trạng thái ở backend sẽ từ chối nếu không hợp lệ */
  async function act(path: 'advance' | 'cancel') {
    if (!order) return;
    setBusy(true);
    setActionError(null);
    try {
      setOrder(await request<Order>(`/orders/${encodeURIComponent(order.id)}/${path}`, { method: 'POST' }));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Chưa cập nhật được đơn.');
    } finally {
      setBusy(false);
    }
  }

  if (loadState === 'loading') {
    return (
      <main className="mx-auto max-w-4xl px-4 pt-6" aria-busy="true">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-6 h-56 rounded-3xl" />
        <Skeleton className="mt-6 h-32 rounded-3xl" />
      </main>
    );
  }

  if (loadState === 'error') {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Không tải được đơn {orderId}</h1>
        <p className="mt-2 text-roast/65">{errorText}</p>
        <button type="button" onClick={load} className="mt-6 inline-flex rounded-full bg-gold px-6 py-3 font-bold text-roast">
          Thử lại
        </button>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Không tìm thấy đơn {orderId}</h1>
        <p className="mt-2 text-roast/65">Đơn không tồn tại hoặc thuộc về tài khoản khác.</p>
        <Link href="/orders" className="mt-6 inline-flex rounded-full bg-gold px-6 py-3 font-bold text-roast">
          Xem danh sách đơn
        </Link>
      </main>
    );
  }

  const stage = stageIndex(order.status);
  const store = STORES.find((s) => s.id === order.storeId) ?? STORES[0];
  const pickup = order.fulfillment === 'PICKUP';
  const unpaid = order.status === 'PENDING' || order.status === 'PAYMENT_FAILED';
  const message: Record<Order['status'], string> = {
    PENDING: 'Đơn đã được tạo và đang giữ món cho bạn, chờ thanh toán.',
    PAYMENT_FAILED: 'Thanh toán chưa thành công. Bạn chưa bị trừ tiền; hãy huỷ đơn rồi đặt lại.',
    PAID: 'Đã thanh toán. Quầy đã nhận đơn và đang xếp lượt pha chế.',
    PREPARING: 'Barista đang pha món của bạn.',
    READY: pickup ? `Món đã sẵn sàng. Tới quầy ${store.shortName} và đọc mã ${order.pickupCode}.` : 'Shipper đang trên đường giao tới bạn.',
    COMPLETED: 'Đơn đã hoàn thành. Cảm ơn bạn đã chọn BrewLite!',
    CANCELLED: 'Đơn đã huỷ, món đã được trả lại kho.',
  };

  function reorder() {
    if (!order) return;
    // Đặt lại đúng tuỳ chọn cũ; giá tạm tính lấy theo menu hiện tại, backend tính lại khi tạo đơn
    addManyToCart(
      order.items.map((it) => ({
        productId: it.productId,
        name: it.productName,
        size: it.size as SizeId | null,
        sugar: it.sugar as Level | null,
        ice: it.ice as Level | null,
        toppingIds: it.toppingIds,
        note: it.note,
        quantity: it.qty,
        unitPrice: it.unitPrice,
      })),
    );
    router.push('/checkout');
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-28 pt-4 md:pb-16">
      <Link href="/orders" className="inline-flex items-center gap-1 rounded-full py-1 pr-2 text-sm font-semibold text-espresso hover:underline">
        <ChevronLeftIcon className="h-4 w-4" /> Đơn hàng
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Đơn #{order.id}</h1>
      <p className="mt-1 text-sm text-roast/60">
        Đặt lúc {formatDateTime(order.createdAt)}, trả bằng {PAYMENT_METHODS.find((m) => m.id === order.paymentMethod)?.name}
      </p>

      {/* Trạng thái */}
      <section className="mt-6 rounded-3xl bg-foam p-5 sm:p-7" aria-labelledby="progress-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="progress-title" className="text-xl font-extrabold">
            {statusLabel(order.status, order.fulfillment)}
          </h2>
          <code className="rounded-lg bg-cream px-2 py-1 text-xs font-bold text-roast/70">{order.status}</code>
        </div>
        <p className="mt-1 text-roast/70" aria-live="polite">
          {message[order.status]}
        </p>

        {stage >= 0 && (
          <ol className="relative mt-6 grid grid-cols-4">
            <span className="absolute left-[12.5%] right-[12.5%] top-[15px] h-1 rounded-full bg-roast/10" aria-hidden="true" />
            <span className="absolute left-[12.5%] top-[15px] h-1 rounded-full bg-espresso transition-all duration-700" style={{ width: `${(stage / 3) * 75}%` }} aria-hidden="true" />
            {ORDER_STAGES.map((label, i) => {
              const done = i < stage;
              const current = i === stage;
              return (
                <li key={label} className="relative flex flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full border-4 text-xs font-bold transition-colors duration-500 ${
                      done ? 'border-espresso bg-espresso text-foam' : current ? 'border-espresso bg-gold text-roast' : 'border-roast/10 bg-foam text-roast/40'
                    }`}
                  >
                    {done ? <CheckIcon className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={`mt-2 px-1 text-[11px] leading-tight sm:text-sm ${current ? 'font-bold' : 'text-roast/60'}`}>
                    {i === 2 && !pickup ? 'Đang giao hàng' : label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {actionError && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-chili/10 px-4 py-3 text-sm text-chili">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" /> {actionError}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {unpaid && (
            <button type="button" disabled={busy} onClick={() => act('cancel')} className="rounded-full border-2 border-chili/40 px-4 py-2 text-sm font-semibold text-chili hover:bg-chili/10 disabled:opacity-60">
              Huỷ đơn
            </button>
          )}
          {['PAID', 'PREPARING', 'READY'].includes(order.status) && (
            <button type="button" disabled={busy} onClick={() => act('advance')} className="text-xs text-roast/50 underline underline-offset-4 disabled:opacity-60">
              Demo (vai trò quầy): chuyển sang bước tiếp theo
            </button>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Mã lấy món */}
        <section className="rounded-3xl bg-foam p-5 sm:p-6" aria-labelledby="code-title">
          <h2 id="code-title" className="font-extrabold">
            {pickup ? 'Mã lấy món' : 'Mã đơn hàng'}
          </h2>
          <div className={`mt-4 flex items-center gap-5 ${unpaid || order.status === 'CANCELLED' ? 'opacity-40' : ''}`}>
            <MockQr value={`${order.id}-${order.pickupCode}`} className="h-32 w-32 shrink-0 rounded-xl" />
            <div>
              <p className="text-4xl font-extrabold tracking-[0.25em] tabular-nums text-espresso">{pickup ? order.pickupCode : order.id}</p>
              <p className="mt-2 text-sm leading-snug text-roast/65">
                {unpaid
                  ? 'Mã chỉ dùng được sau khi thanh toán.'
                  : pickup
                    ? `Đưa mã QR cho nhân viên quét, hoặc đọc 4 số. ${order.pickupTime === 'Lấy ngay' ? '' : `Hẹn lấy lúc ${order.pickupTime}.`}`
                    : `Giao tới ${order.address}.`}
              </p>
            </div>
          </div>
        </section>

        {/* Quán thực hiện */}
        <section className="rounded-3xl bg-foam p-5 sm:p-6" aria-labelledby="store-title">
          <h2 id="store-title" className="font-extrabold">
            {store.name}
          </h2>
          <p className="mt-1 text-sm text-roast/65">{store.address}</p>
          <p className="mt-1 text-sm text-roast/65">Mở cửa {store.hours}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={directionsUrl(store.lat, store.lng)} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-full bg-espresso text-sm font-semibold text-foam hover:bg-roast">
              <RouteIcon className="h-4 w-4" /> Chỉ đường
            </a>
            <a href={`tel:${store.hotline.replace(/\s/g, '')}`} className="flex h-11 items-center justify-center gap-2 rounded-full border-2 border-espresso text-sm font-semibold text-espresso hover:bg-espresso hover:text-foam">
              <PhoneIcon className="h-4 w-4" /> {store.hotline}
            </a>
          </div>
        </section>
      </div>

      {/* Món trong đơn */}
      <section className="mt-6 rounded-3xl bg-foam p-5 sm:p-6" aria-labelledby="items-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="items-title" className="font-extrabold">
            Món trong đơn
          </h2>
          <span className="text-sm text-roast/55">Dự kiến xong lúc {formatClock(new Date(order.createdAt).getTime() + 10 * 60 * 1000)}</span>
        </div>
        <ul className="mt-3 divide-y divide-roast/10">
          {order.items.map((it) => {
            const p = productMap.get(it.productId);
            return (
              <li key={it.id} className="flex items-center gap-3 py-3">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-cream">{p && <ProductImage product={p} width={160} className="h-full w-full" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {it.qty} × {it.productName}
                  </p>
                  <p className="truncate text-sm text-roast/60">{describeOptions(it)}</p>
                </div>
                <span className="tabular-nums">{formatVnd(it.lineTotal)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-roast/10 pt-3 text-sm">
          {order.discount > 0 && (
            <div className="flex justify-between text-leaf">
              <dt>Giảm giá ({order.voucherCode})</dt>
              <dd className="tabular-nums">−{formatVnd(order.discount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <dt className="font-bold">{unpaid ? 'Cần thanh toán' : 'Đã thanh toán'}</dt>
            <dd className="text-xl font-extrabold tabular-nums text-espresso">{formatVnd(order.total)}</dd>
          </div>
        </dl>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setInvoiceOpen(true)} className="h-11 rounded-full border-2 border-espresso text-sm font-semibold text-espresso hover:bg-espresso hover:text-foam">
            Xem hoá đơn
          </button>
          <button type="button" onClick={reorder} className="h-11 rounded-full bg-gold text-sm font-bold text-roast hover:bg-gold-deep hover:text-foam">
            Đặt lại đơn này
          </button>
        </div>
      </section>

      <InvoiceModal order={invoiceOpen ? order : null} onClose={() => setInvoiceOpen(false)} />
    </main>
  );
}

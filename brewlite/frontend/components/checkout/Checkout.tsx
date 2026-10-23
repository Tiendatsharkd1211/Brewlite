'use client';

// MÀN HÌNH GIỎ HÀNG & THANH TOÁN KHÔNG DÙNG TIỀN MẶT (Task 5, 6, 8)
// Luồng đúng đề bài:
//   1. "Thanh toán ngay" -> POST /orders: backend tự tính lại tiền, giữ tồn kho, tạo đơn PENDING.
//   2. POST /payments kèm header Idempotency-Key:
//      -> VNPAY: backend trả link đã ký, trình duyệt chuyển sang cổng VNPay (sandbox) để khách trả tiền;
//         trả xong VNPay đưa khách về /payment/vnpay-return, trang đó xác nhận kết quả và xoá giỏ hàng.
//      -> POINTS: trừ điểm ngay, PAID thì xoá giỏ và hiện xác nhận; không đủ điểm thì PAYMENT_FAILED, GIỮ NGUYÊN giỏ.
//   3. Đổi phương thức / đóng giữa chừng -> POST /orders/:id/cancel để hoàn lại tồn kho.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { MAX_QTY, useAppStore } from '@/context/app-store';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import { PAYMENT_METHODS, STORE } from '@/lib/mock-data';
import { describeOptions, formatNumber, formatVnd } from '@/lib/format';
import { DELIVERY_FEE, POINT_VALUE, VOUCHER_HINT, applyVoucher, pointsEarnedFor } from '@/lib/pricing';
import { PRODUCTS_KEY, useProductMap } from '@/lib/products';
import type { Fulfillment, Order, PaymentMethodId, PaymentResult } from '@/lib/types';
import ProductArt from '@/components/menu/ProductArt';
import ProductImage from '@/components/menu/ProductImage';
import { useProductSheet } from '@/components/product/ProductSheetProvider';
import Confetti from '@/components/ui/Confetti';
import Modal from '@/components/ui/Modal';
import QuantityStepper from '@/components/ui/QuantityStepper';
import Skeleton from '@/components/ui/Skeleton';
import { AlertIcon, EditIcon, LockIcon, TrashIcon } from '@/components/ui/Icons';
import PaymentMethodList from './PaymentMethodList';

type PayState =
  | { step: 'idle' }
  | { step: 'creating' }
  | { step: 'processing'; order: Order }
  | { step: 'redirecting'; order: Order }
  | { step: 'success'; order: Order }
  | { step: 'failed'; reason: 'declined' | 'server'; message: string; order: Order | null };

/** Giữ màn hình "đang xử lý" tối thiểu một chút để khách kịp đọc (chỉ là hiệu ứng giao diện) */
const MIN_PROCESSING_MS = 700;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Mỗi lần bấm thanh toán dùng MỘT khoá mới; gửi lại do mạng lỗi thì dùng LẠI khoá đó */
function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

/** Các khung giờ hẹn lấy trong hôm nay: cách 15 phút, sớm nhất sau 20 phút, muộn nhất 21:30 */
function buildSlots(now: Date): string[] {
  const t = new Date(now);
  t.setSeconds(0, 0);
  t.setMinutes(Math.ceil((t.getMinutes() + 20) / 15) * 15);
  const last = new Date(now);
  last.setHours(21, 30, 0, 0);
  const slots: string[] = [];
  while (t <= last && slots.length < 16) {
    slots.push(t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    t.setMinutes(t.getMinutes() + 15);
  }
  return slots;
}

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

function ChoiceCard({ checked, onSelect, title, hint }: { checked: boolean; onSelect: () => void; title: string; hint: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`rounded-2xl border-2 px-4 py-3 text-left transition-colors ${checked ? 'border-espresso bg-cream' : 'border-roast/10 hover:border-espresso/40'}`}
    >
      <span className="block font-semibold">{title}</span>
      <span className="block text-xs text-roast/60">{hint}</span>
    </button>
  );
}

export default function Checkout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hydrated, cart, cartCount, subtotal, setQuantity, removeFromCart, clearCart } = useAppStore();
  const { status: authStatus, user, request, refresh } = useAuth();
  const { openProduct } = useProductSheet();
  const productMap = useProductMap();
  const points = user?.points ?? 0;
  const isGuest = authStatus !== 'authed';

  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup');
  const [timeMode, setTimeMode] = useState<'asap' | 'slot'>('asap');
  const [slot, setSlot] = useState('');
  const [address, setAddress] = useState('');
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethodId | null>(null);
  const [pay, setPay] = useState<PayState>({ step: 'idle' });

  const slots = useMemo(() => (hydrated ? buildSlots(new Date()) : []), [hydrated]);

  // ----- Tạm tính (backend sẽ tính lại khi tạo đơn) -----
  const voucher = appliedCode ? applyVoucher(appliedCode, subtotal, fulfillment, method) : null;
  const baseFee = fulfillment === 'delivery' ? DELIVERY_FEE : 0;
  const fee = voucher?.ok && voucher.freeShip ? 0 : baseFee;
  const discount = voucher?.ok ? voucher.discount : 0;
  const total = Math.max(subtotal + fee - discount, 0);
  const pointsNeeded = Math.ceil(total / POINT_VALUE);
  const methodName = (id: PaymentMethodId) => PAYMENT_METHODS.find((m) => m.id === id)?.name ?? '';

  // Đơn tăng lên mà không còn đủ điểm thì bỏ chọn "Điểm BrewLite"
  useEffect(() => {
    if (method === 'POINTS' && points < pointsNeeded) setMethod(null);
  }, [method, points, pointsNeeded]);

  // ----- Điều kiện để bấm "Thanh toán ngay" -----
  const blockers: string[] = [];
  if (fulfillment === 'delivery' && address.trim().length < 8) blockers.push('Nhập địa chỉ giao hàng để tiếp tục.');
  if (fulfillment === 'pickup' && timeMode === 'slot' && !slot) blockers.push('Chọn khung giờ lấy món để tiếp tục.');
  if (!method) blockers.push('Chọn phương thức thanh toán để tiếp tục.');
  const canPay = cart.length > 0 && blockers.length === 0 && !isGuest;

  // ----- Bước 1: tạo đơn PENDING -----
  async function startPayment() {
    if (isGuest) {
      router.push('/login?next=/checkout');
      return;
    }
    if (!canPay || !method) return;
    setPay({ step: 'creating' });
    try {
      const order = await request<Order>('/orders', {
        method: 'POST',
        body: {
          items: cart.map((i) => ({ productId: i.productId, size: i.size, sugar: i.sugar, ice: i.ice, toppingIds: i.toppingIds, note: i.note, qty: i.quantity })),
          fulfillment: fulfillment === 'pickup' ? 'PICKUP' : 'DELIVERY',
          pickupTime: fulfillment === 'pickup' ? (timeMode === 'asap' ? 'Lấy ngay' : slot) : 'Giao trong 25–35 phút',
          address: fulfillment === 'delivery' ? address.trim() : undefined,
          paymentMethod: method,
          voucherCode: voucher?.ok ? voucher.code : undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }); // tồn kho vừa thay đổi
      void payOrder(order);
    } catch (err) {
      setPay({ step: 'failed', reason: 'server', message: errorText(err, 'Chưa tạo được đơn hàng.'), order: null });
    }
  }

  // ----- Bước 2: thanh toán idempotent -----
  async function payOrder(order: Order) {
    setPay({ step: 'processing', order });
    const key = newIdempotencyKey();
    const body = { orderId: order.id, method: order.paymentMethod };
    try {
      const [result] = await Promise.all([sendPayment(key, body), sleep(MIN_PROCESSING_MS)]);
      if (result.payUrl) {
        // VNPay: sang cổng thanh toán. Giỏ hàng giữ nguyên tới khi VNPay báo thành công.
        setPay({ step: 'redirecting', order: result.order });
        window.location.assign(result.payUrl);
      } else if (result.order.status === 'PAID') {
        clearCart();
        setAppliedCode(null);
        setVoucherInput('');
        setPay({ step: 'success', order: result.order });
        refresh().catch(() => undefined); // điểm vừa bị trừ
        queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      } else {
        setPay({ step: 'failed', reason: 'declined', message: result.payment.failureReason ?? 'Giao dịch bị từ chối.', order: result.order });
      }
    } catch (err) {
      setPay({ step: 'failed', reason: 'server', message: errorText(err, 'Máy chủ chưa xử lý được giao dịch.'), order });
    }
  }

  /** Mạng chập chờn thì gửi lại tối đa 2 lần với CÙNG khoá: backend bảo đảm không trừ tiền 2 lần */
  async function sendPayment(key: string, body: object): Promise<PaymentResult> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await request<PaymentResult>('/payments', { method: 'POST', body, headers: { 'Idempotency-Key': key } });
      } catch (err) {
        if (err instanceof ApiError && err.status === 0 && attempt < 2) {
          await sleep(800);
          continue;
        }
        throw err;
      }
    }
  }

  /** Thanh toán lại cùng đơn (đơn đang PENDING hoặc PAYMENT_FAILED) */
  function retry() {
    if (pay.step !== 'failed') return;
    if (!pay.order) {
      void startPayment();
      return;
    }
    void payOrder(pay.order);
  }

  /** Bỏ đơn đang dở để chọn lại: huỷ đơn (CANCELLED) và hoàn tồn kho, giỏ hàng giữ nguyên */
  const abandon = useCallback(
    async (order: Order | null) => {
      setPay({ step: 'idle' });
      if (order && (order.status === 'PENDING' || order.status === 'PAYMENT_FAILED')) {
        try {
          await request<Order>(`/orders/${encodeURIComponent(order.id)}/cancel`, { method: 'POST' });
        } catch {
          // Huỷ không được thì đơn vẫn ở PENDING; không ảnh hưởng giỏ hàng
        }
        queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      }
      document.getElementById('payment')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [request, queryClient],
  );

  function applyCode(e: FormEvent) {
    e.preventDefault();
    const result = applyVoucher(voucherInput, subtotal, fulfillment, method);
    if (result.ok) {
      setAppliedCode(result.code);
      setVoucherError(null);
    } else {
      setVoucherError(result.message);
    }
  }

  // ----- Hiển thị -----
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
            {/* 1. Hình thức và thời gian nhận */}
            <Panel title="Nhận món">
              <div role="radiogroup" aria-label="Hình thức nhận món" className="grid grid-cols-2 gap-2 rounded-2xl bg-cream p-1.5">
                {(
                  [
                    { id: 'pickup', label: 'Đến lấy tại quán', hint: 'Miễn phí' },
                    { id: 'delivery', label: 'Giao tận nơi', hint: `Phí ${formatVnd(DELIVERY_FEE)}` },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={fulfillment === o.id}
                    onClick={() => setFulfillment(o.id)}
                    className={`rounded-xl px-3 py-2.5 text-center transition-colors ${fulfillment === o.id ? 'bg-espresso text-foam shadow' : 'hover:bg-foam'}`}
                  >
                    <span className="block text-sm font-bold">{o.label}</span>
                    <span className={`block text-xs ${fulfillment === o.id ? 'text-foam/75' : 'text-roast/55'}`}>{o.hint}</span>
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-cream px-4 py-3">
                <p className="text-sm font-semibold">{fulfillment === 'pickup' ? 'Quán nhận món' : 'Quán thực hiện đơn'}: {STORE.name}</p>
                <p className="mt-0.5 text-xs text-roast/60">
                  {STORE.address}. Mở cửa {STORE.hours}.
                </p>
              </div>

              {fulfillment === 'pickup' ? (
                <>
                  <p className="mt-5 text-sm font-semibold">Thời gian lấy</p>
                  <div role="radiogroup" aria-label="Thời gian lấy" className="mt-1.5 grid grid-cols-2 gap-2">
                    <ChoiceCard checked={timeMode === 'asap'} onSelect={() => setTimeMode('asap')} title="Lấy ngay" hint="Sẵn sàng sau 5–10 phút" />
                    <ChoiceCard checked={timeMode === 'slot'} onSelect={() => setTimeMode('slot')} title="Hẹn giờ lấy" hint="Chọn khung giờ hôm nay" />
                  </div>
                  {timeMode === 'slot' &&
                    (slots.length ? (
                      <>
                        <label htmlFor="slot" className="sr-only">
                          Khung giờ lấy món
                        </label>
                        <select
                          id="slot"
                          value={slot}
                          onChange={(e) => setSlot(e.target.value)}
                          className="mt-3 h-11 w-full rounded-xl border-2 border-roast/10 bg-foam px-3 focus:border-espresso focus:outline-none"
                        >
                          <option value="">Chọn khung giờ</option>
                          {slots.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-chili">Hôm nay đã hết khung giờ hẹn. Chọn “Lấy ngay” hoặc đặt lại vào ngày mai.</p>
                    ))}
                </>
              ) : (
                <>
                  <label htmlFor="address" className="mt-5 block text-sm font-semibold">
                    Địa chỉ giao hàng
                  </label>
                  <input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, đường, phường, quận"
                    autoComplete="street-address"
                    className="mt-1.5 h-11 w-full rounded-xl border-2 border-roast/10 bg-foam px-3 placeholder:text-roast/40 focus:border-espresso focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-roast/55">Giao trong 25–35 phút từ quán {STORE.shortName}.</p>
                </>
              )}
            </Panel>

            {/* 2. Món đã chọn */}
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

            {/* 3. Mã ưu đãi */}
            <Panel title="Mã ưu đãi">
              {appliedCode ? (
                <div className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 ${voucher?.ok ? 'border-leaf/40 bg-leaf/10' : 'border-chili/30 bg-chili/5'}`}>
                  <div className="min-w-0 text-sm">
                    <p className="font-bold">{appliedCode}</p>
                    <p className={voucher?.ok ? 'text-leaf' : 'text-chili'}>{voucher?.ok ? voucher.label : voucher?.message}</p>
                  </div>
                  <button type="button" onClick={() => setAppliedCode(null)} className="shrink-0 text-sm font-semibold text-espresso underline underline-offset-4">
                    Bỏ mã
                  </button>
                </div>
              ) : (
                <form onSubmit={applyCode} className="flex gap-2">
                  <label htmlFor="voucher" className="sr-only">
                    Mã ưu đãi
                  </label>
                  <input
                    id="voucher"
                    value={voucherInput}
                    onChange={(e) => {
                      setVoucherInput(e.target.value);
                      setVoucherError(null);
                    }}
                    placeholder="Nhập mã, ví dụ BREW20"
                    aria-invalid={Boolean(voucherError)}
                    aria-describedby="voucher-msg"
                    className="h-11 min-w-0 flex-1 rounded-xl border-2 border-roast/10 bg-foam px-3 uppercase placeholder:normal-case placeholder:text-roast/40 focus:border-espresso focus:outline-none"
                  />
                  <button type="submit" className="h-11 shrink-0 rounded-xl bg-espresso px-5 font-semibold text-foam hover:bg-roast">
                    Áp dụng
                  </button>
                </form>
              )}
              <p id="voucher-msg" className={`mt-2 text-xs ${voucherError ? 'text-chili' : 'text-roast/55'}`}>
                {voucherError ?? VOUCHER_HINT}
              </p>
            </Panel>

            {/* 4. Phương thức thanh toán không tiền mặt */}
            <Panel title="Thanh toán" id="payment">
              <PaymentMethodList value={method} onChange={setMethod} points={points} pointsNeeded={pointsNeeded} />
            </Panel>
          </div>

          {/* Tóm tắt chi phí + nút thanh toán */}
          <aside className="md:sticky md:top-24">
            <section className="rounded-3xl bg-foam p-5 sm:p-6" aria-labelledby="summary-title">
              <h2 id="summary-title" className="text-lg font-extrabold">
                Tóm tắt đơn
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-roast/65">Tiền hàng ({cartCount} món)</dt>
                  <dd className="tabular-nums">{formatVnd(subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-roast/65">{fulfillment === 'delivery' ? 'Phí giao hàng' : 'Phí dịch vụ'}</dt>
                  <dd className="tabular-nums">{fee ? formatVnd(fee) : 'Miễn phí'}</dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between gap-3 text-leaf">
                    <dt>Giảm giá ({voucher?.ok ? voucher.code : ''})</dt>
                    <dd className="tabular-nums">−{formatVnd(discount)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-roast/10 pt-4">
                <span className="font-bold">Tổng thanh toán</span>
                <span className="text-2xl font-extrabold tabular-nums text-espresso">{formatVnd(total)}</span>
              </div>
              <p className="mt-1 text-right text-xs text-roast/55">
                {method === 'POINTS' ? `Trừ ${formatNumber(pointsNeeded)} điểm` : `Tích ${formatNumber(pointsEarnedFor(total))} điểm sau khi thanh toán`}
              </p>
              {method === 'VNPAY' && <p className="mt-1 text-right text-xs text-roast/55">Trả trên cổng VNPay (môi trường thử sandbox)</p>}
            </section>

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-roast/10 bg-foam px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
              {isGuest ? (
                <p id="pay-hint" className="mb-2 flex items-center justify-center gap-1.5 text-center text-sm text-roast/65">
                  <LockIcon className="h-4 w-4" /> Đăng nhập để thanh toán và tích điểm cho đơn này.
                </p>
              ) : (
                blockers[0] && (
                  <p id="pay-hint" className="mb-2 text-center text-sm text-roast/65">
                    {blockers[0]}
                  </p>
                )
              )}
              <button
                type="button"
                onClick={startPayment}
                disabled={(!canPay && !isGuest) || pay.step !== 'idle'}
                aria-describedby={isGuest || blockers[0] ? 'pay-hint' : undefined}
                className="h-12 w-full rounded-full bg-gold font-bold text-roast shadow-[0_12px_28px_-12px_rgba(168,101,15,.9)] transition-[background-color,color,transform] enabled:hover:bg-gold-deep enabled:hover:text-foam enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-roast/15 disabled:text-roast/45 disabled:shadow-none"
              >
                {isGuest ? 'Đăng nhập để thanh toán' : 'Thanh toán ngay'} <span className="ml-1 tabular-nums">{formatVnd(total)}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ===== Modal: đang tạo đơn / đang chờ xác nhận (không đóng được) ===== */}
      <Modal open={pay.step === 'creating' || pay.step === 'processing' || pay.step === 'redirecting'} titleId="processing-title">
        <div className="text-center" aria-busy="true">
          <span className="mx-auto block h-14 w-14 animate-spin rounded-full border-4 border-roast/10 border-t-espresso" aria-hidden="true" />
          <h2 id="processing-title" className="mt-5 text-xl font-extrabold">
            {pay.step === 'creating' ? 'Đang tạo đơn hàng' : pay.step === 'redirecting' ? 'Đang chuyển sang VNPay' : 'Đang thanh toán'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-roast/65">
            {pay.step === 'creating' && 'Kiểm tra tồn kho và giữ món cho bạn…'}
            {pay.step === 'processing' && pay.order.paymentMethod === 'POINTS' && `Đang trừ ${formatNumber(Math.ceil(pay.order.total / POINT_VALUE))} điểm BrewLite.`}
            {pay.step === 'processing' && pay.order.paymentMethod === 'VNPAY' && `Đang tạo link thanh toán ${formatVnd(pay.order.total)} trên cổng VNPay.`}
            {pay.step === 'redirecting' && 'Trả tiền trên trang VNPay, xong VNPay sẽ đưa bạn quay lại BrewLite.'}
          </p>
          {(pay.step === 'processing' || pay.step === 'redirecting') && <p className="mt-3 inline-flex rounded-full bg-cream px-3 py-1 text-xs font-semibold">Đơn {pay.order.id}: PENDING</p>}
          <div className="mx-auto mt-5 max-w-xs space-y-2">
            <Skeleton className="h-3" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <p className="mt-5 text-xs text-roast/50">Đừng đóng trang trong lúc chờ.</p>
        </div>
      </Modal>

      {/* ===== Modal: thành công (màn hình xác nhận, Task 9) ===== */}
      <Modal open={pay.step === 'success'} titleId="success-title" onClose={() => pay.step === 'success' && router.push(`/orders/${pay.order.id}`)}>
        {pay.step === 'success' && (
          <div className="text-center">
            <Confetti />
            <span className="mx-auto grid h-20 w-20 animate-pop-in place-items-center rounded-full bg-leaf text-foam shadow-[0_0_0_10px_rgba(61,122,79,.15)]">
              <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" strokeDasharray="32" className="animate-draw" />
              </svg>
            </span>
            <h2 id="success-title" className="mt-4 text-2xl font-extrabold">
              Đặt hàng thành công!
            </h2>
            <p className="mt-2 text-sm text-roast/65">
              Mã đơn <b className="text-roast">#{pay.order.id}</b>, trạng thái{' '}
              <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-xs font-bold text-leaf">{pay.order.status}</span>
            </p>
            {pay.order.fulfillment === 'PICKUP' ? (
              <div className="mt-5 rounded-2xl bg-cream px-4 py-4 text-sm">
                <p>
                  Mời bạn tới quầy <b>{STORE.name}</b> lấy nước, đọc mã đơn <b>#{pay.order.id}</b> cho nhân viên.
                </p>
                <p className="mt-1 text-xs text-roast/55">{pay.order.pickupTime === 'Lấy ngay' ? 'Món sẵn sàng sau 5–10 phút.' : `Hẹn lấy lúc ${pay.order.pickupTime}.`}</p>
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-cream px-4 py-4 text-sm">Shipper sẽ gọi bạn khi tới {pay.order.address}.</p>
            )}
            <p className="mt-4 text-sm">
              Đã thanh toán <b className="tabular-nums">{formatVnd(pay.order.total)}</b> bằng {methodName(pay.order.paymentMethod)}
              {pay.order.pointsUsed > 0 && ` (trừ ${formatNumber(pay.order.pointsUsed)} điểm)`}.
            </p>
            <Link href={`/orders/${pay.order.id}`} className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-gold font-bold text-roast hover:bg-gold-deep hover:text-foam">
              Theo dõi đơn hàng
            </Link>
            <Link href="/" className="mt-3 inline-block text-sm font-semibold text-espresso underline underline-offset-4">
              Về trang chủ
            </Link>
          </div>
        )}
      </Modal>

      {/* ===== Modal: thất bại / hết thời gian / lỗi máy chủ ===== */}
      <Modal open={pay.step === 'failed'} titleId="failed-title" onClose={() => pay.step === 'failed' && abandon(pay.order)}>
        {pay.step === 'failed' && (
          <div className="text-center">
            <span className="mx-auto grid h-16 w-16 animate-pop-in place-items-center rounded-full bg-chili text-foam">
              <AlertIcon className="h-9 w-9" />
            </span>
            <h2 id="failed-title" className="mt-4 text-2xl font-extrabold">
              {pay.reason === 'declined' ? 'Thanh toán không thành công' : 'Chưa xử lý được đơn hàng'}
            </h2>
            {pay.order && (
              <p className="mt-2 text-sm">
                Đơn <b>#{pay.order.id}</b>:{' '}
                <span className="rounded-full bg-chili/10 px-2 py-0.5 text-xs font-bold text-chili">{pay.order.status}</span>
              </p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-roast/70">
              {pay.message} Giỏ hàng của bạn vẫn được giữ nguyên.
            </p>
            <button type="button" autoFocus onClick={retry} className="mt-6 h-12 w-full rounded-full bg-gold font-bold text-roast hover:bg-gold-deep hover:text-foam">
              Thanh toán lại
            </button>
            <button type="button" onClick={() => abandon(pay.order)} className="mt-3 text-sm font-semibold text-espresso underline underline-offset-4">
              Đổi phương thức khác
            </button>
          </div>
        )}
      </Modal>
    </main>
  );
}

'use client';

// TRANG KẾT QUẢ VNPay (vnp_ReturnUrl)
// VNPay đưa khách về đây kèm kết quả trên thanh địa chỉ (?vnp_ResponseCode=...&vnp_SecureHash=...).
// Trang gửi NGUYÊN chuỗi tham số đó cho backend: backend kiểm tra chữ ký HMAC-SHA512 và số tiền rồi mới ghi nhận,
// nên sửa tay thanh địa chỉ (ví dụ đổi mã lỗi thành 00) cũng không làm đơn thành "đã thanh toán".
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/context/app-store';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import { STORE } from '@/lib/mock-data';
import { formatNumber, formatVnd } from '@/lib/format';
import { CARD_TYPE_LABEL, PAYMENTS_KEY, formatVnpDate } from '@/lib/payments';
import { PRODUCTS_KEY } from '@/lib/products';
import type { Order, PaymentResult, VnpayReturnResult } from '@/lib/types';
import Confetti from '@/components/ui/Confetti';
import Skeleton from '@/components/ui/Skeleton';
import { AlertIcon } from '@/components/ui/Icons';

type View = { step: 'loading' } | { step: 'error'; message: string } | { step: 'done'; result: VnpayReturnResult };

const newKey = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-roast/60">{label}</dt>
      <dd className="text-right font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export default function VnpayReturn() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { request, refresh } = useAuth();
  const { clearCart } = useAppStore();
  const [view, setView] = useState<View>({ step: 'loading' });
  const [busy, setBusy] = useState<'retry' | 'cancel' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return; // React dev chạy effect 2 lần; backend vẫn idempotent nhưng không cần gọi thừa
    sent.current = true;
    const search = window.location.search;
    if (!search.includes('vnp_')) {
      setView({ step: 'error', message: 'Không có kết quả thanh toán VNPay trên đường dẫn này.' });
      return;
    }
    request<VnpayReturnResult>(`/payments/vnpay/return${search}`)
      .then((result) => {
        setView({ step: 'done', result });
        queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
        if (result.order.status !== 'PENDING' && result.order.status !== 'PAYMENT_FAILED') {
          queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
        }
        if (result.payment.status === 'SUCCEEDED') {
          clearCart(); // đơn đã trả xong mới xoá giỏ
          refresh().catch(() => undefined); // điểm thưởng vừa được cộng
        }
      })
      .catch((err) => setView({ step: 'error', message: err instanceof ApiError ? err.message : 'Chưa xác nhận được kết quả thanh toán.' }));
  }, [request, queryClient, clearCart, refresh]);

  /** Tạo link VNPay mới cho cùng đơn (đơn đang PAYMENT_FAILED quay lại PENDING) */
  async function retry(order: Order) {
    setBusy('retry');
    setActionError(null);
    try {
      const res = await request<PaymentResult>('/payments', { method: 'POST', body: { orderId: order.id, method: 'VNPAY' }, headers: { 'Idempotency-Key': newKey() } });
      if (res.payUrl) window.location.assign(res.payUrl);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Chưa tạo được link thanh toán mới.');
      setBusy(null);
    }
  }

  /** Bỏ đơn: huỷ và hoàn tồn kho, giỏ hàng vẫn giữ để đặt lại */
  async function cancel(order: Order) {
    setBusy('cancel');
    setActionError(null);
    try {
      await request<Order>(`/orders/${encodeURIComponent(order.id)}/cancel`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      router.push('/checkout');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Chưa huỷ được đơn.');
      setBusy(null);
    }
  }

  if (view.step === 'loading') {
    return (
      <div className="mt-8 rounded-3xl bg-foam p-6 text-center" aria-busy="true">
        <span className="mx-auto block h-14 w-14 animate-spin rounded-full border-4 border-roast/10 border-t-espresso" aria-hidden="true" />
        <h1 className="mt-5 text-xl font-extrabold">Đang xác nhận kết quả từ VNPay</h1>
        <p className="mt-2 text-sm text-roast/65">BrewLite đang kiểm tra chữ ký và số tiền của giao dịch…</p>
        <div className="mx-auto mt-5 max-w-xs space-y-2">
          <Skeleton className="h-3" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
    );
  }

  if (view.step === 'error') {
    return (
      <div className="mt-8 rounded-3xl bg-foam p-6 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-chili text-foam">
          <AlertIcon className="h-9 w-9" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">Không xác nhận được giao dịch</h1>
        <p className="mt-2 text-sm leading-relaxed text-roast/70">{view.message}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/payments" className="flex h-12 items-center justify-center rounded-full bg-gold font-bold text-roast hover:bg-gold-deep hover:text-foam">
            Xem lịch sử giao dịch
          </Link>
          <Link href="/checkout" className="text-sm font-semibold text-espresso underline underline-offset-4">
            Về giỏ hàng
          </Link>
        </div>
      </div>
    );
  }

  const { payment, order, responseCode, message } = view.result;
  const paid = payment.status === 'SUCCEEDED';
  const refund = payment.status === 'NEEDS_REFUND';
  const canRetry = !paid && !refund && (order.status === 'PENDING' || order.status === 'PAYMENT_FAILED');

  return (
    <div className="mt-6 rounded-3xl bg-foam p-6 text-center">
      {paid && <Confetti />}
      <span className={`mx-auto grid h-20 w-20 animate-pop-in place-items-center rounded-full text-foam ${paid ? 'bg-leaf shadow-[0_0_0_10px_rgba(61,122,79,.15)]' : 'bg-chili'}`}>
        {paid ? (
          <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeDasharray="32" className="animate-draw" />
          </svg>
        ) : (
          <AlertIcon className="h-10 w-10" />
        )}
      </span>
      <h1 className="mt-4 text-2xl font-extrabold">{paid ? 'Thanh toán VNPay thành công!' : refund ? 'Giao dịch cần hoàn tiền' : 'Thanh toán không thành công'}</h1>
      <p className="mt-2 text-sm text-roast/65">
        Đơn <b className="text-roast">#{order.id}</b>, trạng thái{' '}
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${order.status === 'PAID' ? 'bg-leaf/15 text-leaf' : 'bg-chili/10 text-chili'}`}>{order.status}</span>
      </p>
      {!paid && <p className="mt-2 text-sm leading-relaxed text-roast/75">{payment.failureReason ?? message}</p>}

      {/* Chi tiết giao dịch VNPay trả về */}
      <dl className="mt-5 divide-y divide-roast/10 rounded-2xl bg-cream px-4 py-2 text-left text-sm">
        <Row label="Số tiền" value={formatVnd(payment.amount)} />
        <Row label="Mã giao dịch BrewLite" value={payment.txnRef ?? '—'} />
        <Row label="Mã giao dịch VNPay" value={payment.vnpTransactionNo && payment.vnpTransactionNo !== '0' ? payment.vnpTransactionNo : '—'} />
        <Row label="Ngân hàng" value={payment.vnpBankCode ?? '—'} />
        {payment.vnpBankTranNo && <Row label="Mã giao dịch ngân hàng" value={payment.vnpBankTranNo} />}
        {payment.vnpCardType && <Row label="Loại thẻ" value={CARD_TYPE_LABEL[payment.vnpCardType] ?? payment.vnpCardType} />}
        <Row label="Thời gian thanh toán" value={formatVnpDate(payment.vnpPayDate)} />
        <Row label="Mã phản hồi" value={`${responseCode ?? '—'}: ${message}`} />
      </dl>

      {paid && (
        <div className="mt-4 rounded-2xl bg-cream px-4 py-4 text-sm">
          {order.fulfillment === 'PICKUP' ? (
            <>
              <p>
                Mời bạn tới quầy <b>{STORE.name}</b> lấy nước, đọc mã đơn <b>#{order.id}</b> cho nhân viên.
              </p>
              <p className="mt-1 text-xs text-roast/55">{order.pickupTime === 'Lấy ngay' ? 'Món sẵn sàng sau 5–10 phút.' : `Hẹn lấy lúc ${order.pickupTime}.`}</p>
            </>
          ) : (
            <p>Shipper sẽ gọi bạn khi tới {order.address}.</p>
          )}
          {order.pointsEarned > 0 && <p className="mt-2 font-semibold text-leaf">Bạn được cộng {formatNumber(order.pointsEarned)} điểm BrewLite.</p>}
        </div>
      )}

      {actionError && (
        <p className="mt-4 text-sm text-chili" role="alert">
          {actionError}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {paid || refund ? (
          <Link href={`/orders/${order.id}`} className="flex h-12 items-center justify-center rounded-full bg-gold font-bold text-roast hover:bg-gold-deep hover:text-foam">
            Theo dõi đơn hàng
          </Link>
        ) : (
          canRetry && (
            <button
              type="button"
              onClick={() => retry(order)}
              disabled={busy !== null}
              className="h-12 rounded-full bg-gold font-bold text-roast hover:bg-gold-deep hover:text-foam disabled:opacity-60"
            >
              {busy === 'retry' ? 'Đang tạo link mới…' : 'Thanh toán lại qua VNPay'}
            </button>
          )
        )}
        {canRetry && (
          <button type="button" onClick={() => cancel(order)} disabled={busy !== null} className="h-11 rounded-full border-2 border-espresso font-semibold text-espresso hover:bg-espresso hover:text-foam disabled:opacity-60">
            {busy === 'cancel' ? 'Đang huỷ…' : 'Huỷ đơn, chọn lại món'}
          </button>
        )}
        <Link href="/payments" className="mt-1 text-sm font-semibold text-espresso underline underline-offset-4">
          Xem lịch sử giao dịch
        </Link>
      </div>
    </div>
  );
}

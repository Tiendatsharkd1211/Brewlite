'use client';

// LỊCH SỬ GIAO DỊCH: mỗi lần thanh toán (VNPay hoặc điểm) kèm mã giao dịch VNPay, ngân hàng, thời gian, mã phản hồi.
// Bấm 1 dòng để xem chi tiết và nhật ký trao đổi với VNPay; nút "Kiểm tra lại với VNPay" gọi API truy vấn (querydr).
import Link from 'next/link';
import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { PAYMENT_METHODS } from '@/lib/mock-data';
import { formatDateTime, formatVnd } from '@/lib/format';
import { CARD_TYPE_LABEL, formatVnpDate, isExpired, statusLabelOf, statusStyleOf, useMyPayments, usePaymentDetail, useReconcile } from '@/lib/payments';
import type { PaymentHistoryItem, PaymentLog } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import { AlertIcon, ReceiptIcon } from '@/components/ui/Icons';

const SOURCE_LABEL: Record<PaymentLog['source'], string> = {
  CREATE: 'Tạo link',
  RETURN: 'VNPay chuyển về',
  IPN: 'IPN từ VNPay',
  QUERY: 'Đối soát',
};

const methodName = (id: string) => PAYMENT_METHODS.find((m) => m.id === id)?.name ?? id;

function StatusPill({ p }: { p: Pick<PaymentHistoryItem, 'status' | 'expiresAt'> }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${statusStyleOf(p)}`}>{statusLabelOf(p)}</span>;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-roast/60">{label}</dt>
      <dd className="min-w-0 break-all text-right font-semibold tabular-nums">{value || '—'}</dd>
    </div>
  );
}

function PaymentDetailModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: p, isLoading, error } = usePaymentDetail(id);
  const reconcile = useReconcile();
  const [note, setNote] = useState<string | null>(null);

  async function check() {
    if (!p) return;
    setNote(null);
    try {
      const res = await reconcile.mutateAsync(p.id);
      setNote(res.message);
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Chưa hỏi được VNPay, thử lại sau.');
    }
  }

  return (
    <Modal open={id !== null} titleId="payment-detail-title" onClose={onClose} wide>
      <h2 id="payment-detail-title" className="text-xl font-extrabold">
        Chi tiết giao dịch
      </h2>
      {isLoading || !p ? (
        error ? (
          <p className="mt-4 text-sm text-chili">{error instanceof ApiError ? error.message : 'Không tải được giao dịch.'}</p>
        ) : (
          <div className="mt-4 space-y-2" aria-busy="true">
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-24" />
          </div>
        )
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-2xl font-extrabold tabular-nums text-espresso">{formatVnd(p.amount)}</p>
            <StatusPill p={p} />
          </div>
          {p.failureReason && <p className={`mt-2 text-sm ${p.status === 'NEEDS_REFUND' ? 'font-semibold text-chili' : 'text-roast/70'}`}>{p.failureReason}</p>}

          <dl className="mt-4 divide-y divide-roast/10 rounded-2xl bg-cream px-4 py-2 text-sm">
            <Row label="Phương thức" value={methodName(p.method)} />
            <Row label="Đơn hàng" value={`#${p.order.id} (${p.order.status})`} />
            <Row label="Tạo lúc" value={formatDateTime(p.createdAt)} />
            {p.method === 'VNPAY' && (
              <>
                <Row label="Mã giao dịch BrewLite (vnp_TxnRef)" value={p.txnRef} />
                <Row label="Mã giao dịch VNPay" value={p.vnpTransactionNo && p.vnpTransactionNo !== '0' ? p.vnpTransactionNo : null} />
                <Row label="Ngân hàng" value={p.vnpBankCode} />
                <Row label="Mã giao dịch ngân hàng" value={p.vnpBankTranNo} />
                <Row label="Loại thẻ" value={p.vnpCardType ? (CARD_TYPE_LABEL[p.vnpCardType] ?? p.vnpCardType) : null} />
                <Row label="Thời gian thanh toán (VNPay)" value={p.vnpPayDate ? formatVnpDate(p.vnpPayDate) : null} />
                <Row label="Mã phản hồi / trạng thái" value={p.vnpResponseCode || p.vnpTransactionStatus ? `${p.vnpResponseCode ?? '—'} / ${p.vnpTransactionStatus ?? '—'}` : null} />
                <Row label="Link hết hạn lúc" value={p.expiresAt ? formatDateTime(p.expiresAt) : null} />
              </>
            )}
          </dl>

          <h3 className="mt-5 text-sm font-extrabold">Món trong đơn</h3>
          <ul className="mt-1 text-sm text-roast/75">
            {p.order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-0.5">
                <span>
                  {i.qty} × {i.productName}
                </span>
                <span className="tabular-nums">{formatVnd(i.lineTotal)}</span>
              </li>
            ))}
          </ul>

          {p.logs.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-extrabold">Nhật ký trao đổi với VNPay</h3>
              <ol className="mt-2 space-y-3 border-l-2 border-roast/10 pl-4">
                {p.logs.map((l) => (
                  <li key={l.id} className="relative text-sm">
                    <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-espresso" aria-hidden="true" />
                    <p className="text-xs text-roast/55">
                      {formatDateTime(l.createdAt)} · <b>{SOURCE_LABEL[l.source]}</b>
                    </p>
                    <p className="leading-snug">{l.message}</p>
                    {l.data && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs font-semibold text-espresso">Tham số</summary>
                        <pre className="mt-1 max-h-48 overflow-auto rounded-xl bg-roast/5 p-2 text-[11px] leading-snug">{JSON.stringify(l.data, null, 2)}</pre>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}

          {note && (
            <p className="mt-4 rounded-xl bg-cream px-3 py-2 text-sm" role="status">
              {note}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {p.status === 'PROCESSING' && !isExpired(p) && p.payUrl && (
              <a href={p.payUrl} className="flex h-11 flex-1 items-center justify-center rounded-full bg-gold font-bold text-roast hover:bg-gold-deep hover:text-foam">
                Tiếp tục thanh toán
              </a>
            )}
            {p.method === 'VNPAY' && (
              <button type="button" onClick={check} disabled={reconcile.isPending} className="h-11 flex-1 rounded-full border-2 border-espresso font-semibold text-espresso hover:bg-espresso hover:text-foam disabled:opacity-60">
                {reconcile.isPending ? 'Đang hỏi VNPay…' : 'Kiểm tra lại với VNPay'}
              </button>
            )}
            <Link href={`/orders/${p.order.id}`} className="flex h-11 flex-1 items-center justify-center rounded-full bg-cream font-semibold text-espresso hover:bg-roast/10">
              Xem đơn hàng
            </Link>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function PaymentHistory() {
  const { data: payments, error, refetch, isLoading } = useMyPayments();
  const [openId, setOpenId] = useState<string | null>(null);

  if (error) {
    return (
      <div className="mt-6 flex flex-col items-center rounded-3xl bg-foam px-6 py-10 text-center">
        <AlertIcon className="h-10 w-10 text-chili" />
        <p className="mt-3 font-bold">Không tải được lịch sử giao dịch</p>
        <p className="mt-1 text-sm text-roast/65">{error instanceof ApiError ? error.message : 'Thử lại sau.'}</p>
        <button type="button" onClick={() => refetch()} className="mt-5 rounded-full bg-gold px-5 py-2.5 font-bold text-roast">
          Thử lại
        </button>
      </div>
    );
  }

  if (isLoading || !payments) {
    return (
      <div className="mt-6 space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="mx-auto mt-8 max-w-md rounded-3xl bg-foam px-6 py-12 text-center">
        <ReceiptIcon className="mx-auto h-10 w-10 text-roast/40" />
        <h2 className="mt-3 text-xl font-extrabold">Chưa có giao dịch nào</h2>
        <p className="mt-2 text-sm text-roast/65">Đặt món và thanh toán qua VNPay, giao dịch sẽ hiện ở đây.</p>
        <Link href="/menu" className="mt-6 inline-flex rounded-full bg-gold px-6 py-3 font-bold text-roast">
          Xem thực đơn
        </Link>
      </div>
    );
  }

  const succeeded = payments.filter((p) => p.status === 'SUCCEEDED');
  return (
    <>
      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-foam p-4">
          <p className="text-xs text-roast/60">Đã thanh toán thành công</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-espresso">{formatVnd(succeeded.filter((p) => p.method === 'VNPAY').reduce((n, p) => n + p.amount, 0))}</p>
          <p className="text-xs text-roast/55">qua VNPay</p>
        </div>
        <div className="rounded-2xl bg-foam p-4">
          <p className="text-xs text-roast/60">Số giao dịch</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums">
            {succeeded.length}/{payments.length}
          </p>
          <p className="text-xs text-roast/55">thành công / tổng</p>
        </div>
      </section>

      <ul className="mt-4 space-y-3">
        {payments.map((p, index) => (
          <li key={p.id} className="animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
            <button type="button" onClick={() => setOpenId(p.id)} className="flex w-full items-center gap-4 rounded-2xl bg-foam p-4 text-left transition-shadow hover:shadow-[0_16px_32px_-20px_rgba(59,42,32,.5)]">
              <span className={`grid h-11 w-12 shrink-0 place-items-center rounded-xl text-[11px] font-extrabold text-white ${p.method === 'VNPAY' ? 'bg-[#005baa]' : 'bg-gold-deep'}`} aria-hidden="true">
                {p.method === 'VNPAY' ? 'VNPAY' : '★'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-bold">
                  Đơn #{p.order.id} <StatusPill p={p} />
                </span>
                <span className="mt-0.5 block truncate text-sm text-roast/65">
                  {p.method === 'VNPAY'
                    ? p.vnpTransactionNo && p.vnpTransactionNo !== '0'
                      ? `Mã GD VNPay ${p.vnpTransactionNo} · ${p.vnpBankCode ?? ''}`
                      : `Mã GD ${p.txnRef}`
                    : 'Trả bằng điểm BrewLite'}
                </span>
                <span className="block text-xs text-roast/50">{formatDateTime(p.createdAt)}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums text-espresso">{formatVnd(p.amount)}</span>
            </button>
          </li>
        ))}
      </ul>
      <PaymentDetailModal id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

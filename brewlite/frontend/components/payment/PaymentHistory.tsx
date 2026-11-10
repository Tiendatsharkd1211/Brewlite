'use client';

// LỊCH SỬ GIAO DỊCH kiểu sao kê: tab Thành công / Chưa thành công, chia theo ngày, mỗi lần hiện 10 dòng.
// Bấm 1 dòng để xem chi tiết; nút "Kiểm tra lại với VNPay" gọi API truy vấn (querydr).
// Nhật ký trao đổi với VNPay và mã phản hồi chỉ hiện khi bật gợi ý trình bày (lib/demo.ts).
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ApiError } from '@/lib/api';
import { PAYMENT_METHODS } from '@/lib/mock-data';
import { formatDateTime, formatVnd } from '@/lib/format';
import { CARD_TYPE_LABEL, formatVnpDate, isExpired, statusLabelOf, statusStyleOf, useMyPayments, usePaymentDetail, useReconcile } from '@/lib/payments';
import type { PaymentHistoryItem, PaymentLog } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import { AlertIcon, ReceiptIcon } from '@/components/ui/Icons';
import { SHOW_DEMO_HINTS } from '@/lib/demo';
import { statusLabel } from '@/lib/pricing';

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
            <Row label="Đơn hàng" value={`#${p.order.id} (${statusLabel(p.order.status).toLowerCase()})`} />
            <Row label="Tạo lúc" value={formatDateTime(p.createdAt)} />
            {p.method === 'VNPAY' && (
              <>
                <Row label="Mã tham chiếu" value={p.txnRef} />
                <Row label="Mã giao dịch VNPay" value={p.vnpTransactionNo && p.vnpTransactionNo !== '0' ? p.vnpTransactionNo : null} />
                <Row label="Ngân hàng" value={p.vnpBankCode} />
                <Row label="Mã giao dịch ngân hàng" value={p.vnpBankTranNo} />
                <Row label="Loại thẻ" value={p.vnpCardType ? (CARD_TYPE_LABEL[p.vnpCardType] ?? p.vnpCardType) : null} />
                <Row label="Thời gian thanh toán" value={p.vnpPayDate ? formatVnpDate(p.vnpPayDate) : null} />
                {SHOW_DEMO_HINTS && (
                  <Row label="Mã phản hồi / trạng thái" value={p.vnpResponseCode || p.vnpTransactionStatus ? `${p.vnpResponseCode ?? '—'} / ${p.vnpTransactionStatus ?? '—'}` : null} />
                )}
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

          {SHOW_DEMO_HINTS && p.logs.length > 0 && (
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

type Tab = 'all' | 'ok' | 'not-ok';
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'ok', label: 'Thành công' },
  { id: 'not-ok', label: 'Chưa thành công' },
];
const PAGE = 10;

const time = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/** "Hôm nay", "Hôm qua", "Thứ hai, 02/11" */
function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86_400_000);
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }).replace(/^./, (c) => c.toUpperCase());
}

/** Màu chữ trạng thái trong dòng sao kê */
const statusTone = (p: PaymentHistoryItem) =>
  p.status === 'SUCCEEDED' ? 'text-leaf' : p.status === 'NEEDS_REFUND' ? 'font-semibold text-chili' : isExpired(p) ? 'text-roast/50' : p.status === 'PROCESSING' ? 'text-gold-deep' : 'text-chili';

export default function PaymentHistory() {
  const { data: payments, error, refetch, isLoading } = useMyPayments();
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [shown, setShown] = useState(PAGE);

  const list = useMemo(
    () => (payments ?? []).filter((p) => tab === 'all' || (tab === 'ok' ? p.status === 'SUCCEEDED' : p.status !== 'SUCCEEDED')),
    [payments, tab],
  );
  const groups = useMemo(() => {
    const out: { label: string; items: PaymentHistoryItem[] }[] = [];
    for (const p of list.slice(0, shown)) {
      const label = dayLabel(p.createdAt);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(p);
      else out.push({ label, items: [p] });
    }
    return out;
  }, [list, shown]);

  if (error) {
    return (
      <div className="mt-6 flex flex-col items-center border-2 border-roast px-6 py-10 text-center">
        <AlertIcon className="h-10 w-10 text-chili" />
        <p className="mt-3 font-bold">Không tải được lịch sử giao dịch</p>
        <p className="mt-1 text-sm text-roast/65">{error instanceof ApiError ? error.message : 'Thử lại sau.'}</p>
        <button type="button" onClick={() => refetch()} className="mt-5 bg-gold px-5 py-2.5 font-label text-sm font-semibold uppercase tracking-wider text-foam">
          Thử lại
        </button>
      </div>
    );
  }

  if (isLoading || !payments) {
    return (
      <div className="mt-6 space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="mx-auto mt-8 max-w-md border-2 border-roast px-6 py-12 text-center">
        <ReceiptIcon className="mx-auto h-10 w-10 text-gold" />
        <h2 className="mt-3 text-xl font-extrabold">Chưa có giao dịch nào</h2>
        <p className="mt-2 text-sm text-roast/65">Đặt món và thanh toán, giao dịch sẽ hiện ở đây.</p>
        <Link href="/menu" className="mt-6 inline-flex h-11 items-center bg-gold px-6 font-label text-sm font-semibold uppercase tracking-wider text-foam">
          Xem thực đơn
        </Link>
      </div>
    );
  }

  const ok = payments.filter((p) => p.status === 'SUCCEEDED');
  const paidVnpay = ok.filter((p) => p.method === 'VNPAY').reduce((n, p) => n + p.amount, 0);
  const paidPoints = ok.filter((p) => p.method === 'POINTS').reduce((n, p) => n + p.amount, 0);
  const refund = payments.filter((p) => p.status === 'NEEDS_REFUND');
  const counts: Record<Tab, number> = { all: payments.length, ok: ok.length, 'not-ok': payments.length - ok.length };

  return (
    <>
      {/* Tổng đã trả, tách theo cách trả */}
      <section className="mt-6 grid grid-cols-2 border-y-2 border-roast">
        <div className="py-4 pr-4">
          <p className="kicker">Đã trả qua VNPay</p>
          <p className="mt-1 font-display text-3xl font-black tabular-nums">{formatVnd(paidVnpay)}</p>
        </div>
        <div className="border-l border-roast py-4 pl-4">
          <p className="kicker">Đã trả bằng điểm</p>
          <p className="mt-1 font-display text-3xl font-black tabular-nums">{formatVnd(paidPoints)}</p>
        </div>
      </section>

      {refund.length > 0 && (
        <p className="mt-4 border-2 border-chili px-4 py-3 text-sm text-chili" role="alert">
          Có {refund.length} giao dịch quán cần hoàn tiền cho bạn. Quán sẽ hoàn về đúng cách bạn đã trả; cần hỏi thêm, bạn gửi góp ý kèm mã đơn.
        </p>
      )}

      <div className="no-scrollbar -mx-4 mt-6 flex gap-1 overflow-x-auto border-b-2 border-roast px-4" role="tablist" aria-label="Lọc giao dịch">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setShown(PAGE);
            }}
            className={`-mb-0.5 shrink-0 border-b-[3px] px-3 py-2.5 font-label text-sm font-semibold uppercase tracking-wider transition-colors ${
              tab === t.id ? 'border-gold text-roast' : 'border-transparent text-roast/55 hover:text-roast'
            }`}
          >
            {t.label}
            {counts[t.id] > 0 && <span className="ml-1.5 font-mono text-xs opacity-70">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-10 text-center text-roast/60">Không có giao dịch nào ở mục này.</p>
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.label} className="mt-5">
              <h3 className="font-label text-xs font-semibold uppercase tracking-wider text-roast/55">{g.label}</h3>
              <ul className="mt-1 divide-y divide-dotted divide-roast/40 border-y border-roast/60">
                {g.items.map((p) => {
                  const okRow = p.status === 'SUCCEEDED';
                  return (
                    <li key={p.id}>
                      <button type="button" onClick={() => setOpenId(p.id)} className="grid w-full grid-cols-[3.25rem_1fr_auto] items-center gap-x-3 py-3 plain-btn text-left hover:bg-roast/5">
                        <span className="font-mono text-sm text-roast/60">{time(p.createdAt)}</span>
                        <span className="min-w-0">
                          <span className="font-bold">Đơn #{p.order.id}</span>
                          <span className="block truncate text-sm text-roast/65">
                            {p.method === 'VNPAY' ? `VNPay${p.vnpBankCode && p.vnpBankCode !== 'VNPAY' ? ` · ${p.vnpBankCode}` : ''}` : 'Điểm BrewLite'} · <span className={statusTone(p)}>{statusLabelOf(p)}</span>
                          </span>
                        </span>
                        {/* Giao dịch không thành công: gạch số tiền để khách thấy ngay là chưa bị trừ */}
                        <span className={`text-right font-semibold tabular-nums ${okRow ? '' : 'text-roast/40 line-through'}`}>{formatVnd(p.amount)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {list.length > shown && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="inline-flex h-11 items-center border-2 border-roast px-6 font-label text-sm font-semibold uppercase tracking-wider hover:bg-roast hover:text-cream"
              >
                Xem thêm {Math.min(PAGE, list.length - shown)} giao dịch
              </button>
            </div>
          )}
        </>
      )}
      <PaymentDetailModal id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

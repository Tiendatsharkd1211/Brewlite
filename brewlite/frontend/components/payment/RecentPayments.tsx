'use client';

import Link from 'next/link';
import { formatDateTime, formatVnd } from '@/lib/format';
import { statusLabelOf, statusStyleOf, useMyPayments } from '@/lib/payments';
import Skeleton from '@/components/ui/Skeleton';

/** Ô "Giao dịch gần đây" ở trang Tài khoản: 3 giao dịch mới nhất, bấm để xem lịch sử đầy đủ */
export default function RecentPayments() {
  const { data: payments } = useMyPayments();
  return (
    <section id="payments" className="scroll-mt-28 rounded-3xl bg-foam p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-extrabold">Giao dịch thanh toán</h2>
        <Link href="/payments" className="text-sm font-semibold text-espresso underline underline-offset-4">
          Xem tất cả
        </Link>
      </div>
      <p className="mt-1 text-sm text-roast/60">Thanh toán qua cổng VNPay (môi trường thử sandbox) hoặc bằng điểm.</p>
      {!payments ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : payments.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-roast/65">Chưa có giao dịch nào.</p>
      ) : (
        <ul className="mt-3 divide-y divide-roast/10">
          {payments.slice(0, 3).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block font-semibold">
                  #{p.order.id} · {p.method === 'VNPAY' ? 'VNPay' : 'Điểm'}
                </span>
                <span className="block text-xs text-roast/55">{formatDateTime(p.createdAt)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-bold tabular-nums">{formatVnd(p.amount)}</span>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${statusStyleOf(p)}`}>{statusLabelOf(p)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

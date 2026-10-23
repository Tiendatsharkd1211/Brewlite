'use client';

import { PAYMENT_METHODS } from '@/lib/mock-data';
import { formatNumber, formatVnd } from '@/lib/format';
import { SANDBOX_TEST_CARD, useVnpayStatus } from '@/lib/payments';
import type { PaymentMethodId } from '@/lib/types';

interface Props {
  value: PaymentMethodId | null;
  onChange: (id: PaymentMethodId) => void;
  points: number;
  pointsNeeded: number;
}

export default function PaymentMethodList({ value, onChange, points, pointsNeeded }: Props) {
  const { data: vnpay } = useVnpayStatus();
  const vnpayMissing = vnpay?.configured === false;

  return (
    <div className="space-y-3">
      {PAYMENT_METHODS.map((m) => {
        const notEnoughPoints = m.id === 'POINTS' && points < pointsNeeded;
        const disabled = notEnoughPoints || (m.id === 'VNPAY' && vnpayMissing);

        let hint: string = m.hint;
        if (m.id === 'POINTS') {
          hint = notEnoughPoints
            ? `Chưa đủ điểm: cần ${formatNumber(pointsNeeded)}, bạn có ${formatNumber(points)}.`
            : `Bạn có ${formatNumber(points)} điểm, tương đương ${formatVnd(points * 100)}. Đơn này cần ${formatNumber(pointsNeeded)} điểm.`;
        } else if (vnpayMissing) hint = 'Máy chủ chưa điền mã VNPay sandbox (VNP_TMN_CODE, VNP_HASH_SECRET trong backend/.env).';

        return (
          <label
            key={m.id}
            className={`flex items-center gap-3 rounded-2xl border-2 bg-foam p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-deep ${
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-espresso/40'
            } ${value === m.id ? 'border-espresso bg-cream' : 'border-roast/10'}`}
          >
            <input type="radio" name="payment-method" value={m.id} checked={value === m.id} disabled={disabled} onChange={() => onChange(m.id)} className="sr-only" />
            <span className="grid h-10 w-12 shrink-0 place-items-center rounded-xl text-[11px] font-extrabold tracking-tight text-white" style={{ backgroundColor: m.badgeColor }} aria-hidden="true">
              {m.badge}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                {m.name}
                {m.id === 'VNPAY' && vnpay?.sandbox && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-gold-deep">Môi trường thử (sandbox)</span>}
              </span>
              <span className="block text-xs leading-snug text-roast/60">{hint}</span>
            </span>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${value === m.id ? 'border-espresso' : 'border-roast/25'}`} aria-hidden="true">
              {value === m.id && <span className="h-2.5 w-2.5 rounded-full bg-espresso" />}
            </span>
          </label>
        );
      })}

      {value === 'VNPAY' && (
        <div className="rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed">
          <p>
            Bấm <b>Thanh toán ngay</b> để chuyển sang cổng VNPay. Trả xong, VNPay đưa bạn về BrewLite và đơn tự chuyển sang <b>đã thanh toán</b>.
          </p>
          {vnpay?.sandbox && (
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold text-espresso">Thẻ test của VNPay sandbox</summary>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs tabular-nums">
                <dt className="text-roast/60">Ngân hàng</dt>
                <dd className="font-semibold">{SANDBOX_TEST_CARD.bank}</dd>
                <dt className="text-roast/60">Số thẻ</dt>
                <dd className="font-semibold">{SANDBOX_TEST_CARD.number}</dd>
                <dt className="text-roast/60">Tên chủ thẻ</dt>
                <dd className="font-semibold">{SANDBOX_TEST_CARD.holder}</dd>
                <dt className="text-roast/60">Ngày phát hành</dt>
                <dd className="font-semibold">{SANDBOX_TEST_CARD.issueDate}</dd>
                <dt className="text-roast/60">Mã OTP</dt>
                <dd className="font-semibold">{SANDBOX_TEST_CARD.otp}</dd>
              </dl>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

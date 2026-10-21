'use client';

import { PAYMENT_METHODS } from '@/lib/mock-data';
import { formatNumber, formatVnd } from '@/lib/format';
import type { PaymentMethodId } from '@/lib/types';

interface Props {
  value: PaymentMethodId | null;
  onChange: (id: PaymentMethodId) => void;
  points: number;
  pointsNeeded: number;
  linkedWallets: PaymentMethodId[];
}

const GROUPS = Array.from(new Set(PAYMENT_METHODS.map((m) => m.group)));

export default function PaymentMethodList({ value, onChange, points, pointsNeeded, linkedWallets }: Props) {
  return (
    <div className="space-y-5">
      {GROUPS.map((group) => (
        <fieldset key={group}>
          <legend className="mb-2 text-sm font-semibold text-roast/60">{group}</legend>
          <div className="space-y-2">
            {PAYMENT_METHODS.filter((m) => m.group === group).map((m) => {
              const notEnoughPoints = m.id === 'POINTS' && points < pointsNeeded;
              const isWallet = m.id === 'MOMO' || m.id === 'ZALOPAY' || m.id === 'SHOPEEPAY';
              let hint = m.hint;
              if (m.id === 'POINTS') hint = `Bạn có ${formatNumber(points)} điểm, tương đương ${formatVnd(points * 100)}. Đơn này cần ${formatNumber(pointsNeeded)} điểm.`;
              else if (isWallet && !linkedWallets.includes(m.id)) hint = `${m.hint}. Chưa liên kết, ứng dụng sẽ hỏi liên kết khi thanh toán.`;
              return (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 rounded-2xl border-2 bg-foam p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-deep ${
                    notEnoughPoints ? 'cursor-not-allowed opacity-55' : 'cursor-pointer hover:border-espresso/40'
                  } ${value === m.id ? 'border-espresso bg-cream' : 'border-roast/10'}`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={m.id}
                    checked={value === m.id}
                    disabled={notEnoughPoints}
                    onChange={() => onChange(m.id)}
                    className="sr-only"
                  />
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white"
                    style={{ backgroundColor: m.badgeColor }}
                    aria-hidden="true"
                  >
                    {m.badge}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{m.name}</span>
                    <span className="block text-xs leading-snug text-roast/60">{notEnoughPoints ? `Chưa đủ điểm: cần ${formatNumber(pointsNeeded)}, bạn có ${formatNumber(points)}.` : hint}</span>
                  </span>
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${value === m.id ? 'border-espresso' : 'border-roast/25'}`}
                    aria-hidden="true"
                  >
                    {value === m.id && <span className="h-2.5 w-2.5 rounded-full bg-espresso" />}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

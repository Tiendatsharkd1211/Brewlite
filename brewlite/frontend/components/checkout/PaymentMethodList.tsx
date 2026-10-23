'use client';

import Link from 'next/link';
import { PAYMENT_METHODS, isWalletMethod } from '@/lib/mock-data';
import { formatNumber, formatVnd } from '@/lib/format';
import type { PaymentMethodId, Wallet } from '@/lib/types';

interface Props {
  value: PaymentMethodId | null;
  onChange: (id: PaymentMethodId) => void;
  points: number;
  pointsNeeded: number;
  /** Tổng tiền đơn, để báo trước khi số dư tài khoản ảo không đủ */
  total: number;
  /** Tài khoản ảo đã liên kết (undefined = đang tải) */
  wallets: Wallet[] | undefined;
}

const GROUPS = Array.from(new Set(PAYMENT_METHODS.map((m) => m.group)));

export default function PaymentMethodList({ value, onChange, points, pointsNeeded, total, wallets }: Props) {
  return (
    <div className="space-y-5">
      <p className="rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-roast/75">
        Thanh toán bằng ví hoặc thẻ sẽ <b>trừ tiền trực tiếp vào tài khoản ảo</b> bạn đã liên kết. Chưa có tài khoản ảo?{' '}
        <Link href="/account#wallets" className="font-semibold text-espresso underline underline-offset-4">
          Liên kết ở trang Tài khoản
        </Link>
        .
      </p>
      {GROUPS.map((group) => (
        <fieldset key={group}>
          <legend className="mb-2 text-sm font-semibold text-roast/60">{group}</legend>
          <div className="space-y-2">
            {PAYMENT_METHODS.filter((m) => m.group === group).map((m) => {
              const wallet = isWalletMethod(m.id) ? wallets?.find((w) => w.provider === m.id) : undefined;
              const notEnoughPoints = m.id === 'POINTS' && points < pointsNeeded;
              const notLinked = isWalletMethod(m.id) && !wallet;
              const lowBalance = Boolean(wallet && wallet.balance < total);
              const disabled = notEnoughPoints || notLinked;

              let hint: string = m.hint;
              if (m.id === 'POINTS') {
                hint = notEnoughPoints
                  ? `Chưa đủ điểm: cần ${formatNumber(pointsNeeded)}, bạn có ${formatNumber(points)}.`
                  : `Bạn có ${formatNumber(points)} điểm, tương đương ${formatVnd(points * 100)}. Đơn này cần ${formatNumber(pointsNeeded)} điểm.`;
              } else if (!wallets) hint = 'Đang tải tài khoản ảo…';
              else if (notLinked) hint = 'Chưa liên kết tài khoản ảo.';
              else if (wallet) hint = `${wallet.maskedNumber}, số dư ${formatVnd(wallet.balance)}`;

              return (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 rounded-2xl border-2 bg-foam p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-deep ${
                    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-espresso/40'
                  } ${value === m.id ? 'border-espresso bg-cream' : 'border-roast/10'}`}
                >
                  <input type="radio" name="payment-method" value={m.id} checked={value === m.id} disabled={disabled} onChange={() => onChange(m.id)} className="sr-only" />
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white" style={{ backgroundColor: m.badgeColor }} aria-hidden="true">
                    {m.badge}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{m.name}</span>
                    <span className="block text-xs leading-snug text-roast/60 tabular-nums">{hint}</span>
                    {lowBalance && <span className="block text-xs font-semibold leading-snug text-chili">Không đủ số dư cho đơn {formatVnd(total)}, thanh toán sẽ bị từ chối.</span>}
                  </span>
                  {notLinked && wallets ? (
                    <Link href="/account#wallets" className="shrink-0 rounded-full bg-espresso px-3 py-1.5 text-xs font-semibold text-foam hover:bg-roast">
                      Liên kết
                    </Link>
                  ) : (
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${value === m.id ? 'border-espresso' : 'border-roast/25'}`} aria-hidden="true">
                      {value === m.id && <span className="h-2.5 w-2.5 rounded-full bg-espresso" />}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

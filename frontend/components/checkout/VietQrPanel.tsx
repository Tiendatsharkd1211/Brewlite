'use client';

import { useEffect, useState } from 'react';
import { formatVnd } from '@/lib/format';
import { CopyIcon } from '@/components/ui/Icons';
import MockQr from './MockQr';

interface Props {
  orderCode: string;
  amount: number;
  expiresAt: number;
  onPaid: () => void;
  onExpire: () => void;
  onCancel: () => void;
}

/** Nội dung modal thanh toán VietQR: mã QR, thông tin chuyển khoản, đồng hồ đếm ngược 5 phút */
export default function VietQrPanel({ orderCode, amount, expiresAt, onPaid, onExpire, onCancel }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  const remaining = Math.max(0, expiresAt - now);
  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (remaining === 0) onExpire();
  }, [remaining, onExpire]);

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  const rows: { label: string; value: string; copyValue?: string }[] = [
    { label: 'Ngân hàng', value: 'MB Bank (tài khoản demo)' },
    { label: 'Số tài khoản', value: '0000 1234 5678', copyValue: '000012345678' },
    { label: 'Chủ tài khoản', value: 'CONG TY BREWLITE' },
    { label: 'Số tiền', value: formatVnd(amount), copyValue: String(amount) },
    { label: 'Nội dung', value: orderCode, copyValue: orderCode },
  ];

  return (
    <div>
      <h2 id="pay-dialog-title" className="text-xl font-extrabold">
        Quét mã để chuyển khoản
      </h2>
      <p className="mt-1 text-sm text-roast/65">Mở app ngân hàng bất kỳ, chọn quét QR. Số tiền và nội dung đã điền sẵn.</p>

      <div className="mt-4 flex flex-col items-center rounded-3xl bg-cream p-4">
        <MockQr value={`${orderCode}-${amount}`} className="h-52 w-52 rounded-xl" />
        <p className="mt-3 text-sm">
          Mã hết hạn sau{' '}
          <span className={`font-bold tabular-nums ${remaining < 60000 ? 'text-chili' : 'text-espresso'}`} aria-live="off">
            {mm}:{ss}
          </span>
        </p>
        <p className="mt-1 text-xs text-roast/55">Mã QR minh hoạ, chưa kết nối ngân hàng thật.</p>
      </div>

      <dl className="mt-4 divide-y divide-roast/10 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 py-2">
            <dt className="text-roast/60">{r.label}</dt>
            <dd className="flex items-center gap-2 text-right font-semibold tabular-nums">
              {r.value}
              {r.copyValue && (
                <button type="button" onClick={() => copy(r.label, r.copyValue!)} className="rounded-lg p-1 text-espresso hover:bg-roast/5" aria-label={`Sao chép ${r.label.toLowerCase()}`}>
                  {copied === r.label ? <span className="text-xs">Đã chép</span> : <CopyIcon className="h-4 w-4" />}
                </button>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <button type="button" autoFocus onClick={onPaid} className="mt-5 h-12 w-full rounded-full bg-gold font-bold text-roast hover:bg-gold-deep hover:text-foam">
        Tôi đã chuyển khoản
      </button>
      <div className="mt-3 flex items-center justify-between text-sm">
        <button type="button" onClick={onCancel} className="font-semibold text-espresso underline underline-offset-4">
          Đổi phương thức
        </button>
        <button type="button" onClick={onExpire} className="text-roast/50 underline underline-offset-4">
          Demo: cho mã hết hạn
        </button>
      </div>
    </div>
  );
}

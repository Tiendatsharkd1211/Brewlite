'use client';

// Trang Ưu đãi: lưu mã để tự áp ở bước thanh toán, và đổi điểm lấy quà ngay tại đây
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/context/app-store';
import { useAuth } from '@/context/auth-context';
import { formatNumber } from '@/lib/format';
import { REWARDS } from '@/lib/mock-data';
import { useRedeem } from '@/lib/redeem';
import { useManagerPreview } from '@/lib/preview';
import { useStorefront, voucherState } from '@/lib/storefront';
import Toast from '@/components/ui/Toast';
import { CheckIcon, CopyIcon } from '@/components/ui/Icons';

const btn = 'inline-flex h-10 items-center justify-center gap-1.5 px-4 font-label text-xs font-semibold uppercase tracking-wider transition-colors';

export default function DealsView() {
  const [toast, setToast] = useState<string | null>(null);
  return (
    <>
      <Vouchers onToast={setToast} />
      <Rewards onToast={setToast} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

function Vouchers({ onToast }: { onToast: (m: string) => void }) {
  const { savedVoucher, setSavedVoucher, hydrated, cartCount } = useAppStore();
  // Mã do quản lý đặt ở khu Quản lý > Mã giảm giá: chỉ hiện mã đang chạy và được bật "hiện trên trang Ưu đãi"
  const all = useStorefront((s) => s.vouchers);
  const VOUCHERS = all.filter((v) => v.showOnSite && voucherState(v) === 'running');
  const preview = useManagerPreview();

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      onToast(`Đã chép mã ${code}`);
    } catch {
      onToast(`Mã của bạn: ${code}`);
    }
  }

  return (
    <section aria-labelledby="vouchers-title">
      <h2 id="vouchers-title" className="sr-only">
        Mã giảm giá
      </h2>
      {VOUCHERS.length === 0 && (
        <p className="border-2 border-dashed border-roast/40 px-4 py-8 text-center text-roast/65">Hiện chưa có mã giảm giá nào. Quay lại sau nhé, quán thường có mã mới mỗi tuần.</p>
      )}
      <ul className="grid gap-4 sm:grid-cols-3">
        {VOUCHERS.map((v) => {
          const saved = hydrated && savedVoucher === v.code;
          return (
            <li key={v.code} className={`flex flex-col border-2 border-dashed p-4 ${saved ? 'border-gold' : 'border-roast'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="stamp text-gold">{v.code}</p>
                <button
                  type="button"
                  onClick={() => copy(v.code)}
                  className="inline-flex items-center gap-1 text-xs font-semibold underline-offset-4 hover:text-gold hover:underline"
                  aria-label={`Chép mã ${v.code}`}
                >
                  <CopyIcon className="h-4 w-4" /> Chép
                </button>
              </div>
              <h3 className="mt-3 text-xl font-bold leading-tight">{v.title}</h3>
              <p className="mt-2 text-sm text-roast/75">{v.terms}</p>
              <div className={`mt-auto pt-4 ${preview ? 'hidden' : ''}`}>
                {saved ? (
                  <>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-leaf">
                      <CheckIcon className="h-4 w-4" /> Sẽ tự áp khi thanh toán
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <Link href={cartCount > 0 ? '/checkout' : '/menu'} className={`${btn} bg-gold text-foam hover:bg-gold-deep`}>
                        {cartCount > 0 ? 'Thanh toán' : 'Chọn món'}
                      </Link>
                      <button type="button" onClick={() => setSavedVoucher(null)} className="text-xs text-roast/60 underline underline-offset-4 hover:text-gold">
                        Bỏ lưu
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSavedVoucher(v.code);
                      onToast(`Đã lưu mã ${v.code}. Mỗi đơn dùng được một mã.`);
                    }}
                    className={`${btn} w-full border-2 border-roast hover:bg-roast hover:text-cream`}
                  >
                    Dùng mã này
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Rewards({ onToast }: { onToast: (m: string) => void }) {
  const { status, user } = useAuth();
  const { redeem, redeeming } = useRedeem();
  const preview = useManagerPreview();
  // Bấm "Đổi" lần đầu chỉ hỏi lại, bấm lần nữa mới trừ điểm (tránh bấm nhầm)
  const [confirming, setConfirming] = useState<string | null>(null);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(null), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  const authed = status === 'authed' && user;
  const points = user?.points ?? 0;

  async function onRedeem(id: string) {
    if (confirming !== id) {
      setConfirming(id);
      return;
    }
    setConfirming(null);
    const error = await redeem(id);
    if (error) onToast(error);
  }

  return (
    <section className="mt-12 border-t-[3px] border-double border-roast pt-4" aria-labelledby="rewards-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="rewards-title" className="scroll-mt-36 text-3xl font-black">
          Đổi điểm lấy quà
        </h2>
        {preview ? null : authed ? (
          <p className="text-right">
            <span className="kicker block">Điểm của bạn</span>
            <span className="font-display text-3xl font-black tabular-nums">{formatNumber(points)}</span>
          </p>
        ) : (
          <Link href="/login?next=/uu-dai" className={`${btn} bg-roast text-cream hover:bg-espresso`}>
            Đăng nhập để đổi quà
          </Link>
        )}
      </div>

      <ul className="mt-4 grid gap-px border border-roast bg-roast sm:grid-cols-2 lg:grid-cols-4">
        {REWARDS.map((r) => {
          const enough = points >= r.cost;
          const busy = redeeming === r.id;
          return (
            <li key={r.id} className="flex flex-col bg-cream p-4">
              <p className="font-mono text-sm text-gold">{formatNumber(r.cost)} điểm</p>
              <p className="mt-1 font-display text-lg font-bold leading-snug">{r.name}</p>
              <div className={`mt-auto pt-4 ${preview ? 'hidden' : ''}`}>
                {!authed ? (
                  <p className="text-xs text-roast/60">Đăng nhập để đổi</p>
                ) : enough ? (
                  <button
                    type="button"
                    onClick={() => onRedeem(r.id)}
                    disabled={redeeming !== null}
                    className={`${btn} w-full ${confirming === r.id ? 'bg-gold text-foam hover:bg-gold-deep' : 'border-2 border-roast hover:bg-roast hover:text-cream'} disabled:opacity-50`}
                  >
                    {busy ? 'Đang đổi…' : confirming === r.id ? `Bấm lần nữa: trừ ${formatNumber(r.cost)} điểm` : 'Đổi quà'}
                  </button>
                ) : (
                  <p className="text-xs text-roast/60">Còn thiếu {formatNumber(r.cost - points)} điểm</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <dl className="mt-6 grid gap-4 border-y border-roast py-4 text-sm sm:grid-cols-3 sm:gap-0">
        {[
          ['Tích điểm', 'Mỗi 1.000đ thanh toán bằng VNPay được cộng 1 điểm.'],
          ['Trả bằng điểm', 'Mỗi điểm trừ 100đ vào đơn, chọn "Điểm BrewLite" khi thanh toán.'],
          ['Nhận quà', 'Đổi xong, mã quà được gửi vào mục Thông báo. Đọc mã cho nhân viên ở quầy.'],
        ].map(([t, d], i) => (
          <div key={t} className={`sm:px-4 ${i > 0 ? 'sm:border-l sm:border-roast' : 'sm:pl-0'}`}>
            <dt className="kicker">{t}</dt>
            <dd className="mt-1 text-roast/80">{d}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

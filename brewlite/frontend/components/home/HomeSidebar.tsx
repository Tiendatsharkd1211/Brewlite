'use client';

// Cột phải trang nhất: hai con tem cùng kiểu (ưu đãi, thành viên) kẹp bảng món được gọi nhiều.
// Mỗi ô đều bấm được để làm một việc thật: lưu mã cho bước thanh toán, xem món, đăng ký hoặc đổi điểm.
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useAppStore } from '@/context/app-store';
import { useAuth } from '@/context/auth-context';
import { formatNumber, formatVnd } from '@/lib/format';
import { REWARDS } from '@/lib/mock-data';
import { POINT_VALUE } from '@/lib/pricing';
import { useManagerPreview } from '@/lib/preview';
import { useStorefront } from '@/lib/storefront';
import TodayPrices from '@/components/menu/TodayPrices';
import { CheckIcon, CopyIcon } from '@/components/ui/Icons';

const SIGNUP_POINTS = 1250;

const solidBtn = 'inline-flex h-10 w-full items-center justify-center font-label text-xs font-semibold uppercase tracking-wider';

export default function HomeSidebar() {
  const preview = useManagerPreview();
  return (
    <aside className="lg:pl-8" aria-labelledby="prices-title">
      <PromoBox />
      <h2 id="prices-title" className="kicker mt-8 border-b-2 border-gold pb-1">
        Được gọi nhiều hôm nay
      </h2>
      <TodayPrices />
      <Link href="/menu" className="mt-3 inline-block font-label text-xs uppercase tracking-wider underline underline-offset-4 hover:text-gold">
        Xem cả thực đơn →
      </Link>
      {!preview && <MemberBox />}
    </aside>
  );
}

/** Khung tem dùng chung: mép răng cưa, nhãn nhỏ bên trái, mệnh giá bên phải */
function Stamp({ tone, kicker, value, children }: { tone: 'gold' | 'ink'; kicker: string; value: ReactNode; children: ReactNode }) {
  return (
    <div className="postage">
      <div className={`postage-inner relative overflow-hidden p-4 ${tone === 'ink' ? 'postage-ink' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <p className={`kicker ${tone === 'ink' ? 'text-roast' : ''}`}>{kicker}</p>
          <p className={`-mt-1 font-display text-3xl font-black leading-none ${tone === 'gold' ? 'text-gold' : ''}`}>{value}</p>
        </div>
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

function PromoBox() {
  const { savedVoucher, setSavedVoucher, cartCount, hydrated } = useAppStore();
  const promo = useStorefront((s) => s.content.promo);
  const PROMO_CODE = promo.code;
  const preview = useManagerPreview();
  const [copied, setCopied] = useState(false);
  const saved = hydrated && savedVoucher === PROMO_CODE;

  async function copy() {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Trình duyệt chặn chép: mã vẫn hiện rõ để khách tự chép
    }
  }

  return (
    <Stamp tone="gold" kicker="Ưu đãi đang chạy" value={promo.badge}>
      <p className="mt-1 font-display text-2xl font-black leading-tight">{promo.title}</p>
      <p className="mt-2 text-sm text-roast/75">{promo.text}</p>

      <div className="mt-3 flex items-stretch border-2 border-dashed border-gold bg-cream">
        <span className="flex flex-1 items-center px-3 font-mono text-lg font-bold tracking-widest text-gold">{PROMO_CODE}</span>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 border-l-2 border-dashed border-gold px-3 text-xs font-semibold hover:bg-gold/10" aria-label="Chép mã ưu đãi">
          {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          {copied ? 'Đã chép' : 'Chép'}
        </button>
      </div>

      {preview ? null : saved ? (
        <div className="mt-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-leaf">
            <CheckIcon className="h-4 w-4" /> Đã lưu mã, sẽ tự áp khi thanh toán
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Link
              href={cartCount > 0 ? '/checkout' : '/menu'}
              className="inline-flex h-10 items-center bg-gold px-4 font-label text-xs font-semibold uppercase tracking-wider text-foam hover:bg-gold-deep"
            >
              {cartCount > 0 ? 'Đi tới thanh toán' : 'Chọn món ngay'}
            </Link>
            <button type="button" onClick={() => setSavedVoucher(null)} className="text-xs text-roast/60 underline underline-offset-4 hover:text-gold">
              Bỏ lưu
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setSavedVoucher(PROMO_CODE)} className={`${solidBtn} mt-3 bg-gold text-foam hover:bg-gold-deep`}>
          Dùng mã này cho đơn tới
        </button>
      )}
    </Stamp>
  );
}

function MemberBox() {
  const { status, user } = useAuth();

  if (status === 'authed' && user) {
    const next = REWARDS.find((r) => r.cost > user.points);
    const ready = REWARDS.filter((r) => r.cost <= user.points);
    return (
      <div className="mt-8">
        <Stamp tone="ink" kicker="Điểm của bạn" value={formatNumber(user.points)}>
          <p className="mt-1 font-display text-2xl font-black leading-tight">Trừ được {formatVnd(user.points * POINT_VALUE)} vào đơn tới</p>
          {ready.length > 0 ? (
            <p className="mt-2 text-sm text-roast/75">
              Đủ điểm đổi {ready.length} món quà, ví dụ {ready[ready.length - 1].name.toLowerCase()}.
            </p>
          ) : (
            next && (
              <p className="mt-2 text-sm text-roast/75">
                Còn <b className="tabular-nums">{formatNumber(next.cost - user.points)}</b> điểm nữa để đổi {next.name.toLowerCase()}.
              </p>
            )
          )}
          <Link href="/uu-dai#rewards-title" className={`${solidBtn} mt-3 bg-roast text-cream hover:bg-espresso`}>
            {ready.length > 0 ? 'Đổi quà ngay' : 'Xem quà đổi điểm'}
          </Link>
        </Stamp>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <Stamp tone="ink" kicker="Thành viên mới" value={`+${formatNumber(SIGNUP_POINTS)}`}>
        <p className="mt-1 font-display text-2xl font-black leading-tight">Tặng {formatNumber(SIGNUP_POINTS)} điểm khi đăng ký</p>
        <p className="mt-2 text-sm text-roast/75">Đủ đổi một ly cà phê size S hoặc một bánh croissant bơ ngay đơn đầu tiên.</p>
        <Link href="/register" className={`${solidBtn} mt-3 bg-roast text-cream hover:bg-espresso`}>
          Đăng ký nhận điểm
        </Link>
        <p className="mt-2 text-xs text-roast/65">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-semibold underline underline-offset-4 hover:text-gold">
            Đăng nhập
          </Link>
        </p>
      </Stamp>
    </div>
  );
}

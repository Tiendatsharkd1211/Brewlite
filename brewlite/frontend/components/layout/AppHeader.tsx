'use client';

// MĂNG-SÉT: dòng số báo + ngày, tên báo cỡ lớn, rồi thanh mục lục dính trên cùng khi cuộn.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/context/app-store';
import { useAuth } from '@/context/auth-context';
import { CART_BUMP_EVENT } from '@/lib/fly-to-cart';
import { formatVnd } from '@/lib/format';
import { STORE } from '@/lib/mock-data';
import { useManagerPreview } from '@/lib/preview';
import SearchBox from '@/components/search/SearchBox';
import { BagIcon } from '@/components/ui/Icons';
import CartDrawer from './CartDrawer';
import NotificationBell from './NotificationBell';
import NoticeBar from './NoticeBar';
import UserMenu from './UserMenu';

const WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export const NAV_LINKS = [
  { href: '/', label: 'Trang nhất' },
  { href: '/menu', label: 'Thực đơn' },
  { href: '/uu-dai', label: 'Ưu đãi' },
  { href: '/orders', label: 'Đơn của tôi' },
  { href: '/cau-chuyen', label: 'Câu chuyện' },
  { href: '/lien-he', label: 'Liên hệ' },
];

/** Dòng trên cùng: thứ, ngày hôm nay */
function todayLine(now: Date) {
  const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  return `${WEEKDAYS[now.getDay()]}, ${date}`;
}

export default function AppHeader() {
  const pathname = usePathname();
  const { cartCount, subtotal, hydrated } = useAppStore();
  const { user } = useAuth();
  const preview = useManagerPreview();
  const [bump, setBump] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [today, setToday] = useState<string | null>(null);

  // Ngày tính ở trình duyệt để khớp giờ của khách (tránh lệch giữa máy chủ và trình duyệt)
  useEffect(() => setToday(todayLine(new Date())), []);

  // Giỏ hàng "nảy" lên mỗi khi có món bay vào
  useEffect(() => {
    const onBump = () => {
      setBump(false);
      requestAnimationFrame(() => setBump(true));
    };
    window.addEventListener(CART_BUMP_EVENT, onBump);
    return () => window.removeEventListener(CART_BUMP_EVENT, onBump);
  }, []);

  // Nhân viên thấy thêm Quầy pha chế; quản lý thấy Quản lý cửa hàng (mỗi vai trò một khu riêng)
  const links = user?.role === 'STAFF' ? [...NAV_LINKS, { href: '/staff', label: 'Quầy pha chế' }] : preview ? NAV_LINKS.filter((l) => l.href !== '/orders') : NAV_LINKS;
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <NoticeBar />
      <div className="mx-auto max-w-6xl px-4 pt-3">
        <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-wider text-roast/70 sm:text-[11px]">
          <span>{today ?? ' '}</span>
          <span className="hidden sm:inline">{STORE.address}</span>
          <span>Mở cửa {STORE.hours}</span>
        </div>
        <Link href="/" className="mt-1 block border-y-[3px] border-double border-roast py-1 text-center sm:py-2" aria-label="BrewLite, về trang nhất">
          <span className="block font-display text-[2.6rem] font-black leading-none tracking-tight sm:text-6xl md:text-7xl">BrewLite</span>
          <span className="mt-1 block font-label text-[10px] uppercase tracking-[0.3em] text-roast/70 sm:text-xs">Cà phê phin Sài Gòn · Đặt trước, khỏi xếp hàng</span>
        </Link>
      </div>

      <header className="sticky top-0 z-40 border-b border-roast bg-cream/95 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-2 px-4">
          <nav aria-label="Mục lục" className="hidden min-w-0 flex-1 md:block">
            <ul className="flex items-center gap-5 text-[13px] font-medium uppercase">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={isActive(l.href) ? 'page' : undefined}
                    className={`border-b-2 py-1 transition-colors ${isActive(l.href) ? 'border-gold text-gold' : 'border-transparent hover:border-roast'}`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {!preview && (
            <div className="min-w-0 flex-1 md:max-w-[15rem] md:flex-none lg:max-w-xs">
              <SearchBox />
            </div>
          )}
          {preview ? (
            <Link
              href="/quan-ly"
              className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 bg-roast px-4 font-label text-xs font-semibold uppercase tracking-wider text-cream hover:bg-espresso"
            >
              ← Về trang quản lý
            </Link>
          ) : (
            <div className="flex shrink-0 items-center gap-0.5">
              <NotificationBell withLabel />
              {/* Giỏ hàng: bấm mở khung giỏ nhanh bên phải; trên máy tính hiện luôn số món và tạm tính */}
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                data-cart-target
                aria-label={`Giỏ hàng, ${hydrated ? cartCount : 0} món`}
                className="relative flex h-11 items-center gap-2 px-2 normal-case tracking-normal hover:bg-roast/5"
              >
                <span className={bump ? 'animate-bump' : ''} onAnimationEnd={() => setBump(false)}>
                  <BagIcon className="h-7 w-7" />
                </span>
                <span className="hidden text-left leading-tight lg:block">
                  <span className="block font-label text-sm font-medium uppercase tracking-wider">Giỏ hàng</span>
                  <span className="block font-mono text-[11px] text-roast/70">{hydrated && cartCount > 0 ? `${cartCount} món · ${formatVnd(subtotal)}` : 'Chưa có món'}</span>
                </span>
                {hydrated && cartCount > 0 && (
                  <span key={cartCount} className="absolute left-5 top-0.5 h-5 min-w-5 animate-pop-in bg-gold px-1 text-center font-mono text-[11px] font-semibold leading-5 text-foam">
                    {cartCount}
                  </span>
                )}
              </button>
              <UserMenu />
            </div>
          )}
        </div>
      </header>
      {!preview && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
    </>
  );
}

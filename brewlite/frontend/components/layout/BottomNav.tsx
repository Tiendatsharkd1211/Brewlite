'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/context/app-store';
import { useManagerPreview } from '@/lib/preview';
import { BagIcon, CupIcon, HomeIcon, LockIcon, ReceiptIcon, UserIcon, WalletIcon } from '@/components/ui/Icons';

// Quản lý đang xem trang khách: bỏ giỏ hàng, đơn, tài khoản; thêm nút về trang quản lý
const PREVIEW_ITEMS = [
  { href: '/', label: 'Trang nhất', Icon: HomeIcon },
  { href: '/menu', label: 'Thực đơn', Icon: CupIcon },
  { href: '/uu-dai', label: 'Ưu đãi', Icon: WalletIcon },
  { href: '/quan-ly', label: 'Quản lý', Icon: LockIcon },
];

const ITEMS = [
  { href: '/', label: 'Trang nhất', Icon: HomeIcon },
  { href: '/menu', label: 'Thực đơn', Icon: CupIcon },
  { href: '/checkout', label: 'Giỏ hàng', Icon: BagIcon },
  { href: '/orders', label: 'Đơn hàng', Icon: ReceiptIcon },
  { href: '/account', label: 'Tài khoản', Icon: UserIcon },
];

/** Thanh điều hướng dưới cùng, chỉ hiện trên mobile. Ẩn ở trang chi tiết món và thanh toán vì ở đó có thanh nút riêng. */
export default function BottomNav() {
  const pathname = usePathname();
  const { cartCount, hydrated } = useAppStore();
  const preview = useManagerPreview();
  if (pathname.startsWith('/product') || pathname.startsWith('/checkout')) return null;

  const items = preview ? PREVIEW_ITEMS : ITEMS;

  return (
    <nav aria-label="Điều hướng chính" className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-double border-roast bg-cream pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className={`grid ${preview ? 'grid-cols-4' : 'grid-cols-5'}`}>
        {items.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] uppercase ${active ? 'text-gold' : 'text-roast/60'}`}
              >
                <Icon className="h-6 w-6" />
                {label}
                {href === '/checkout' && hydrated && cartCount > 0 && (
                  <span className="absolute left-1/2 top-1 ml-2 h-4 min-w-4 bg-gold px-1 text-center font-mono text-[10px] leading-4 text-foam">{cartCount}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

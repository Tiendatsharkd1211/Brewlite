'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/context/app-store';
import { BagIcon, CupIcon, HomeIcon, ReceiptIcon, UserIcon } from '@/components/ui/Icons';

const ITEMS = [
  { href: '/', label: 'Trang chủ', Icon: HomeIcon },
  { href: '/menu', label: 'Thực đơn', Icon: CupIcon },
  { href: '/checkout', label: 'Giỏ hàng', Icon: BagIcon },
  { href: '/orders', label: 'Đơn hàng', Icon: ReceiptIcon },
  { href: '/account', label: 'Tài khoản', Icon: UserIcon },
];

/** Thanh điều hướng dưới cùng, chỉ hiện trên mobile. Ẩn ở trang chi tiết món và thanh toán vì ở đó có thanh nút riêng. */
export default function BottomNav() {
  const pathname = usePathname();
  const { cartCount, hydrated } = useAppStore();
  if (pathname.startsWith('/product') || pathname.startsWith('/checkout')) return null;

  return (
    <nav aria-label="Điều hướng chính" className="fixed inset-x-0 bottom-0 z-30 border-t border-roast/10 bg-foam pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? 'text-espresso' : 'text-roast/50'}`}
              >
                <Icon className="h-6 w-6" />
                {label}
                {href === '/checkout' && hydrated && cartCount > 0 && (
                  <span className="absolute left-1/2 top-1 ml-2 h-4 min-w-4 rounded-full bg-gold px-1 text-center text-[10px] leading-4 text-roast">{cartCount}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

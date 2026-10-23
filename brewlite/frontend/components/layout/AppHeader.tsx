'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/context/app-store';
import { CART_BUMP_EVENT } from '@/lib/fly-to-cart';
import { STORE } from '@/lib/mock-data';
import SearchBox from '@/components/search/SearchBox';
import { BagIcon, PinIcon } from '@/components/ui/Icons';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';

function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#6f4e37" />
      <path d="M9.5 11h13l-1.4 11.2a2 2 0 0 1-2 1.8h-6.2a2 2 0 0 1-2-1.8L9.5 11Z" fill="#fffaf2" />
      <path d="M10.6 16h10.8l-.7 6a1.6 1.6 0 0 1-1.6 1.4h-6.2a1.6 1.6 0 0 1-1.6-1.4l-.7-6Z" fill="#e09a2b" />
      <rect x="8.5" y="8.5" width="15" height="3" rx="1.5" fill="#fffaf2" />
    </svg>
  );
}

export default function AppHeader() {
  const { cartCount, hydrated } = useAppStore();
  const [bump, setBump] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Giỏ hàng "nảy" lên mỗi khi có món bay vào
  useEffect(() => {
    const onBump = () => {
      setBump(false);
      requestAnimationFrame(() => setBump(true));
    };
    window.addEventListener(CART_BUMP_EVENT, onBump);
    return () => window.removeEventListener(CART_BUMP_EVENT, onBump);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-300 ${scrolled ? 'border-roast/10 bg-cream/95 shadow-[0_8px_24px_-18px_rgba(59,42,32,.6)]' : 'border-transparent bg-cream'}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-xl font-extrabold tracking-tight text-espresso">
          <LogoMark />
          <span className="hidden min-[380px]:inline">BrewLite</span>
        </Link>
        <div className="hidden min-w-0 flex-1 md:block md:max-w-md lg:max-w-lg">
          <SearchBox />
        </div>
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
          {/* BrewLite chỉ có một quán nhận đơn: hiện tên quán, không cần chọn */}
          <span className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-roast/70 lg:flex" title={STORE.address}>
            <PinIcon className="h-4 w-4" /> {STORE.shortName}
          </span>
          <NotificationBell />
          <Link
            href="/checkout"
            data-cart-target
            aria-label={`Giỏ hàng, ${hydrated ? cartCount : 0} món`}
            className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-roast/5"
          >
            <span className={bump ? 'animate-bump' : ''} onAnimationEnd={() => setBump(false)}>
              <BagIcon className="h-6 w-6" />
            </span>
            {hydrated && cartCount > 0 && (
              <span key={cartCount} className="absolute -right-0.5 -top-0.5 h-5 min-w-5 animate-pop-in rounded-full bg-gold px-1 text-center text-xs font-bold leading-5 tabular-nums text-roast">
                {cartCount}
              </span>
            )}
          </Link>
          <UserMenu />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
        <SearchBox />
      </div>
    </header>
  );
}

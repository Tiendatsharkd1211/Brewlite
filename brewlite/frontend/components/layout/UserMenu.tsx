'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { formatNumber } from '@/lib/format';
import { tierOf } from '@/lib/pricing';
import { LogoutIcon, ReceiptIcon, UserIcon, WalletIcon } from '@/components/ui/Icons';

/** Trích xuất 1–2 chữ cái đầu của tên người dùng để hiển thị trên avatar */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/);
  const picked = words.length > 1 ? [words[words.length - 2], words[words.length - 1]] : words;
  return picked
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Menu tài khoản góc phải header: nút đăng nhập (khách) hoặc avatar dropdown xem điểm & quản lý tài khoản */
export default function UserMenu() {
  const router = useRouter();
  const { status, user, logout } = useAuth();

  const [open, setOpen] = useState(false);

  if (status === 'loading') return <span className="skeleton hidden h-10 w-10 rounded-full md:block" aria-hidden="true" />;

  if (status === 'guest' || !user) {
    return (
      <Link href="/login" className="ml-1 hidden h-10 items-center rounded-full bg-espresso px-4 text-sm font-semibold text-foam transition-colors hover:bg-roast md:inline-flex">
        Đăng nhập
      </Link>
    );
  }

  const tier = tierOf(user.points);
  return (
    <div className="relative ml-1 hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Tài khoản của ${user.fullName}`}
        className="grid h-10 w-10 place-items-center rounded-full bg-espresso text-sm font-bold text-foam ring-2 ring-gold/0 transition-shadow hover:ring-gold"
      >
        {initialsOf(user.fullName)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-40 mt-2 w-72 animate-pop-in rounded-2xl border border-roast/10 bg-foam p-2 shadow-xl">
            <div className="rounded-xl bg-cream px-3 py-3">
              <p className="font-bold">{user.fullName}</p>
              <p className="truncate text-sm text-roast/60">{user.email}</p>
              <p className="mt-2 text-sm">
                Hạng <b>{tier.name}</b>, <b className="tabular-nums">{formatNumber(user.points)}</b> điểm
              </p>
            </div>
            <nav className="mt-1 flex flex-col text-sm font-semibold">
              <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-cream">
                <UserIcon /> Tài khoản và điểm thưởng
              </Link>
              <Link href="/orders" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-cream">
                <ReceiptIcon /> Đơn hàng của tôi
              </Link>
              <Link href="/payments" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-cream">
                <WalletIcon /> Lịch sử giao dịch
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                  router.push('/');
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-chili hover:bg-chili/10"
              >
                <LogoutIcon /> Đăng xuất
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

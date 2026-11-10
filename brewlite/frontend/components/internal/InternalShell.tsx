'use client';

// KHUNG KHU NỘI BỘ: thanh trên cùng màu mực, tách hẳn khỏi giao diện của khách.
// Chưa đăng nhập thì đưa về trang đăng nhập nội bộ; sai vai trò thì báo không có quyền.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { INTERNAL_LOGIN, ROLE_LABEL, canOpen, homeOf } from '@/lib/internal';
import Skeleton from '@/components/ui/Skeleton';
import Toast from '@/components/ui/Toast';
import ChangePassword from '@/components/auth/ChangePassword';
import { LockIcon, LogoutIcon } from '@/components/ui/Icons';

const AREAS = [
  { href: '/staff', label: 'Quầy pha chế', roles: ['STAFF'] },
  { href: '/quan-ly', label: 'Quản lý cửa hàng', roles: ['MANAGER'] },
];

export default function InternalShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user, logout } = useAuth();
  const leaving = useRef(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwDone, setPwDone] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'guest' && !leaving.current) router.replace(`${INTERNAL_LOGIN}?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  if (status !== 'authed' || !user) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 pt-20" aria-busy="true">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const areas = AREAS.filter((a) => a.roles.includes(user.role));
  const allowed = canOpen(user.role, pathname) && user.role !== 'CUSTOMER';

  function signOut() {
    leaving.current = true;
    logout();
    router.replace(INTERNAL_LOGIN);
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-roast text-cream">
        <div className={`mx-auto flex h-14 items-center gap-4 px-4 ${pathname.startsWith('/staff') ? 'max-w-[100rem] lg:px-6' : 'max-w-7xl'}`}>
          <Link href={homeOf(user.role)} className="flex shrink-0 items-center gap-2" aria-label="BrewLite nội bộ">
            <span className="font-display text-2xl font-black leading-none">BrewLite</span>
            <span className="border border-cream/50 px-1.5 py-px font-label text-[10px] uppercase tracking-[0.2em]">Nội bộ</span>
          </Link>

          <nav aria-label="Khu làm việc" className="hidden h-full items-stretch gap-1 md:flex">
            {areas.map((a) => {
              const on = pathname.startsWith(a.href);
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex items-center border-b-[3px] px-3 font-label text-sm font-semibold uppercase tracking-wider ${on ? 'border-gold text-cream' : 'border-transparent text-cream/60 hover:text-cream'}`}
                >
                  {a.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            {user.role === 'MANAGER' && (
              <Link href="/" className="inline-flex h-9 items-center border border-cream/50 px-3 font-label text-xs font-semibold uppercase tracking-wider hover:bg-cream hover:text-roast">
                <span className="hidden sm:inline">Xem trang khách&nbsp;</span>↗
              </Link>
            )}
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-sm font-semibold">{user.fullName}</span>
              <span className="block font-label text-[10px] uppercase tracking-wider text-cream/60">{ROLE_LABEL[user.role]}</span>
            </span>
            <button type="button" onClick={() => setChangingPw(true)} aria-label="Đổi mật khẩu" title="Đổi mật khẩu" className="grid h-9 w-9 place-items-center hover:bg-cream/10">
              <LockIcon className="h-5 w-5" />
            </button>
            <button type="button" onClick={signOut} aria-label="Đăng xuất" title="Đăng xuất" className="grid h-9 w-9 place-items-center hover:bg-cream/10">
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Điện thoại: hàng chọn khu làm việc */}
        {areas.length > 1 && (
          <nav aria-label="Khu làm việc" className="flex border-t border-cream/15 md:hidden">
            {areas.map((a) => {
              const on = pathname.startsWith(a.href);
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`flex-1 border-b-[3px] py-2 text-center font-label text-xs font-semibold uppercase tracking-wider ${on ? 'border-gold' : 'border-transparent text-cream/60'}`}
                >
                  {a.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {allowed ? (
        children
      ) : (
        <main className="mx-auto mt-14 max-w-md border-2 border-roast px-6 py-10 text-center">
          <LockIcon className="mx-auto h-10 w-10 text-gold" />
          <p className="mt-3 font-display text-2xl font-black">
            {user.role === 'CUSTOMER' ? 'Khu dành cho nhân viên' : pathname.startsWith('/quan-ly') ? 'Khu dành cho quản lý' : 'Khu dành cho nhân viên quầy'}
          </p>
          <p className="mt-2 text-sm text-roast/70">
            {user.role === 'CUSTOMER'
              ? 'Bạn đang đăng nhập bằng tài khoản khách hàng. Nhân viên đăng nhập bằng tài khoản được cửa hàng cấp.'
              : 'Mỗi vai trò làm việc ở khu riêng: nhân viên ở Quầy pha chế, quản lý ở Quản lý cửa hàng. Tài khoản của bạn không có quyền vào khu này.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {user.role === 'CUSTOMER' ? (
              <>
                <Link href="/" className="inline-flex h-10 items-center border-2 border-roast px-5 font-label text-xs font-semibold uppercase tracking-wider">
                  Về trang khách
                </Link>
                <button type="button" onClick={signOut} className="h-10 bg-roast px-5 text-xs font-semibold tracking-wider text-cream">
                  Đổi tài khoản
                </button>
              </>
            ) : (
              <Link href={homeOf(user.role)} className="inline-flex h-10 items-center bg-roast px-5 font-label text-xs font-semibold uppercase tracking-wider text-cream">
                Về khu làm việc của bạn
              </Link>
            )}
          </div>
        </main>
      )}
      <ChangePassword open={changingPw} onClose={() => setChangingPw(false)} onDone={() => setPwDone('Đã đổi mật khẩu. Các máy khác đang dùng tài khoản này đã bị đăng xuất.')} />
      <Toast message={pwDone} onDone={() => setPwDone(null)} />
    </>
  );
}

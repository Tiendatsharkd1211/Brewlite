'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import Skeleton from '@/components/ui/Skeleton';
import { LockIcon } from '@/components/ui/Icons';

/** Bọc nội dung cần đăng nhập: chưa đăng nhập thì hiện lời mời đăng nhập thay vì trang trống */
export default function AuthGate({ children, title, description }: { children: ReactNode; title: string; description: string }) {
  const { status } = useAuth();
  const pathname = usePathname();

  if (status === 'loading') {
    return (
      <div className="mt-6 space-y-4" aria-busy="true">
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (status === 'guest') {
    const next = encodeURIComponent(pathname);
    return (
      <div className="mx-auto mt-8 max-w-md animate-rise rounded-[2rem] bg-foam px-6 py-10 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cream text-espresso">
          <LockIcon className="h-8 w-8" />
        </span>
        <h2 className="mt-4 text-xl font-extrabold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-roast/65">{description}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href={`/login?next=${next}`} className="inline-flex h-11 items-center justify-center rounded-full bg-gold px-6 font-bold text-roast">
            Đăng nhập
          </Link>
          <Link href={`/register?next=${next}`} className="inline-flex h-11 items-center justify-center rounded-full border-2 border-espresso px-6 font-semibold text-espresso">
            Tạo tài khoản
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

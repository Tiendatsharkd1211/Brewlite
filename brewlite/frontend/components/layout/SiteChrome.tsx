'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { isInternalPath } from '@/lib/internal';
import { CUSTOMER_ONLY } from '@/lib/preview';

/** Trang của khách có măng-sét, chân trang, thanh dưới; khu nội bộ tự dựng khung riêng.
 *  Nhân viên quầy chỉ làm việc ở quầy pha chế: mở trang của khách thì đưa về quầy.
 *  Quản lý xem được trang khách, trừ các trang chỉ khách dùng (giỏ, đơn, tài khoản). */
export default function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const internal = isInternalPath(pathname);
  const staffOutside = !internal && user?.role === 'STAFF';
  const managerBlocked = user?.role === 'MANAGER' && CUSTOMER_ONLY.test(pathname);

  useEffect(() => {
    if (staffOutside) router.replace('/staff');
    else if (managerBlocked) router.replace('/');
  }, [staffOutside, managerBlocked, router]);

  if (internal) return <>{children}</>;
  if (staffOutside || managerBlocked) return null;
  return (
    <>
      {header}
      {children}
      {footer}
    </>
  );
}

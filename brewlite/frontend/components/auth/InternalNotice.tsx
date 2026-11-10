'use client';

// Nhân viên, quản lý mở trang mua hàng của khách (thanh toán, đơn hàng, tài khoản...): báo và chỉ về khu của mình.
// Máy chủ cũng chặn các API này với tài khoản nội bộ (403), đây chỉ là lớp giao diện.
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { ROLE_LABEL, homeOf } from '@/lib/internal';
import { LockIcon } from '@/components/ui/Icons';

export default function InternalNotice() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="mx-auto mt-8 max-w-md animate-rise rounded-[2rem] bg-foam px-6 py-10 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cream text-espresso">
        <LockIcon className="h-8 w-8" />
      </span>
      <h2 className="mt-4 text-xl font-extrabold">Tài khoản nội bộ không dùng để đặt món</h2>
      <p className="mt-2 text-sm leading-relaxed text-roast/65">
        Bạn đang đăng nhập bằng tài khoản {ROLE_LABEL[user.role].toLowerCase()}. Muốn đặt món, hãy đăng xuất và dùng tài khoản khách.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href={homeOf(user.role)} className="inline-flex h-11 items-center justify-center rounded-full bg-gold px-6 font-bold text-roast">
          Về {user.role === 'MANAGER' ? 'trang quản lý' : 'quầy pha chế'}
        </Link>
        <button type="button" onClick={logout} className="inline-flex h-11 items-center justify-center rounded-full border-2 border-espresso px-6 font-semibold text-espresso">
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

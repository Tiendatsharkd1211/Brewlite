import type { Metadata } from 'next';
import AccountView from '@/components/account/AccountView';
import AuthGate from '@/components/auth/AuthGate';

export const metadata: Metadata = { title: 'Tài khoản – BrewLite' };

/** Trang quản lý tài khoản: dùng AuthGate bảo vệ, yêu cầu đăng nhập trước khi render AccountView */
export default function AccountPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Tài khoản</h1>
      <AuthGate title="Đăng nhập để xem tài khoản" description="Xem điểm thưởng, hạng thành viên, lịch sử đơn và đổi quà.">
        <AccountView />
      </AuthGate>
    </main>
  );
}


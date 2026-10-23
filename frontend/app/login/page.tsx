import type { Metadata } from 'next';
import AuthShell from '@/components/auth/AuthShell';
import LoginForm from '@/components/auth/LoginForm';
import { safeNext } from '@/lib/safe-next';

export const metadata: Metadata = { title: 'Đăng nhập – BrewLite' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell quote="Ly cà phê của bạn đã sẵn sàng trước cả khi bạn tới quầy.">
      <LoginForm next={safeNext(next)} />
    </AuthShell>
  );
}

import type { Metadata } from 'next';
import AuthShell from '@/components/auth/AuthShell';
import RegisterForm from '@/components/auth/RegisterForm';
import { safeNext } from '@/lib/safe-next';

export const metadata: Metadata = { title: 'Tạo tài khoản – BrewLite' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell quote="Mỗi 1.000đ là 1 điểm. Đổi điểm lấy ly miễn phí bất cứ lúc nào.">
      <RegisterForm next={safeNext(next)} />
    </AuthShell>
  );
}

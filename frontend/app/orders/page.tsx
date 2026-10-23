import type { Metadata } from 'next';
import AuthGate from '@/components/auth/AuthGate';
import OrdersList from '@/components/orders/OrdersList';

export const metadata: Metadata = { title: 'Đơn hàng – BrewLite' };

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 md:pb-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Đơn hàng</h1>
      <AuthGate title="Đăng nhập để xem đơn hàng" description="Đơn của bạn được lưu theo tài khoản, xem được trên mọi thiết bị.">
        <OrdersList />
      </AuthGate>
    </main>
  );
}

import type { Metadata } from 'next';
import AuthGate from '@/components/auth/AuthGate';
import OrderTracking from '@/components/orders/OrderTracking';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Đơn ${id} – BrewLite` };
}

export default async function OrderPage({ params }: Props) {
  const { id } = await params;
  return (
    <AuthGate title="Đăng nhập để theo dõi đơn" description="Chỉ chủ tài khoản đặt đơn mới xem được trạng thái và mã lấy món.">
      <OrderTracking orderId={id} />
    </AuthGate>
  );
}

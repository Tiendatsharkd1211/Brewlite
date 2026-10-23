import type { Metadata } from 'next';
import AuthGate from '@/components/auth/AuthGate';
import PaymentHistory from '@/components/payment/PaymentHistory';

export const metadata: Metadata = { title: 'Lịch sử giao dịch – BrewLite' };

export default function PaymentsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 md:pb-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Lịch sử giao dịch</h1>
      <p className="mt-1 text-sm text-roast/60">Mọi lần thanh toán qua VNPay và bằng điểm, kèm mã giao dịch VNPay để đối chiếu.</p>
      <AuthGate title="Đăng nhập để xem lịch sử giao dịch" description="Giao dịch được lưu theo tài khoản, xem được trên mọi thiết bị.">
        <PaymentHistory />
      </AuthGate>
    </main>
  );
}

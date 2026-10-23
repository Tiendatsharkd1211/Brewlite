import type { Metadata } from 'next';
import AuthGate from '@/components/auth/AuthGate';
import VnpayReturn from '@/components/payment/VnpayReturn';

export const metadata: Metadata = { title: 'Kết quả thanh toán VNPay – BrewLite' };

/** VNPay chuyển khách về trang này (vnp_ReturnUrl) kèm kết quả giao dịch trên thanh địa chỉ */
export default function VnpayReturnPage() {
  return (
    <main className="mx-auto max-w-xl px-4 pb-28 pt-6 md:pb-16">
      <AuthGate title="Đăng nhập để xem kết quả thanh toán" description="Kết quả thanh toán được lưu theo tài khoản đã đặt đơn.">
        <VnpayReturn />
      </AuthGate>
    </main>
  );
}

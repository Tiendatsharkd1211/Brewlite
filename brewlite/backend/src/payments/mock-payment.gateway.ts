import { Injectable } from '@nestjs/common';
import { sleep } from '../common/sleep';

export interface ChargeRequest {
  amount: number;
  method: string;
  /** Khoá idempotency được chuyển tiếp cho cổng thanh toán (cổng thật cũng chống trùng theo khoá này) */
  reference: string;
  /** Chỉ dùng khi demo/kiểm thử: buộc giao dịch thất bại */
  simulate?: 'success' | 'fail';
}

export interface ChargeResult {
  success: boolean;
  transactionId?: string;
  reason?: string;
}

const FAIL_REASON: Record<string, string> = {
  MOMO: 'Ví MoMo không đủ số dư hoặc bạn đã từ chối giao dịch',
  ZALOPAY: 'ZaloPay từ chối giao dịch',
  SHOPEEPAY: 'ShopeePay từ chối giao dịch',
  VNPAY: 'VNPay báo giao dịch không thành công',
  VIETQR: 'Ngân hàng chưa nhận được tiền chuyển khoản',
  CARD: 'Thẻ bị từ chối, kiểm tra số dư hoặc hạn mức',
};

/**
 * Cổng thanh toán GIẢ LẬP (mô phỏng MoMo / ZaloPay / VNPay / thẻ).
 * Khi tích hợp thật, chỉ cần thay lớp này; PaymentsService giữ nguyên.
 */
@Injectable()
export class MockPaymentGateway {
  /** Đếm số lần "trừ tiền" thật sự, test dùng để chứng minh không trừ 2 lần */
  chargeCount = 0;

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    this.chargeCount++;
    await sleep(Number(process.env.PAYMENT_MOCK_LATENCY_MS ?? 400));
    if (req.simulate === 'fail') return { success: false, reason: FAIL_REASON[req.method] ?? 'Giao dịch bị từ chối' };
    if (req.amount > 5_000_000) return { success: false, reason: 'Số tiền vượt hạn mức giao dịch' };
    return { success: true, transactionId: `MOCK-${req.method}-${Date.now()}` };
  }
}

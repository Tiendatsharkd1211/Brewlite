'use client';

// GIAO DỊCH THANH TOÁN VNPay: trạng thái cấu hình, lịch sử giao dịch, chi tiết, đối soát với VNPay
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from './api';
import type { PaymentDetail, PaymentHistoryItem, PaymentStatus } from './types';

export const PAYMENTS_KEY = ['payments'] as const;

/** Thẻ test do VNPay công bố cho môi trường sandbox (không phải thẻ thật, không mất tiền) */
export const SANDBOX_TEST_CARD = {
  bank: 'NCB',
  number: '9704198526191432198',
  holder: 'NGUYEN VAN A',
  issueDate: '07/15',
  otp: '123456',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PROCESSING: 'Chờ thanh toán',
  SUCCEEDED: 'Thành công',
  FAILED: 'Không thành công',
  NEEDS_REFUND: 'Cần hoàn tiền',
};

export const PAYMENT_STATUS_STYLE: Record<PaymentStatus | 'EXPIRED', string> = {
  PROCESSING: 'bg-gold/20 text-gold-deep',
  SUCCEEDED: 'bg-leaf/15 text-leaf',
  FAILED: 'bg-chili/10 text-chili',
  NEEDS_REFUND: 'bg-chili text-foam',
  EXPIRED: 'bg-roast/10 text-roast/60',
};

/** Link VNPay quá 15 phút mà chưa có kết quả: hiển thị "Hết hạn" */
export const isExpired = (p: { status: PaymentStatus; expiresAt: string | null }) =>
  p.status === 'PROCESSING' && p.expiresAt !== null && new Date(p.expiresAt).getTime() < Date.now();

export const statusLabelOf = (p: { status: PaymentStatus; expiresAt: string | null }) => (isExpired(p) ? 'Hết hạn link' : PAYMENT_STATUS_LABEL[p.status]);
export const statusStyleOf = (p: { status: PaymentStatus; expiresAt: string | null }) => PAYMENT_STATUS_STYLE[isExpired(p) ? 'EXPIRED' : p.status];

/** "20261023143005" (giờ Việt Nam) => "14:30:05 23/10/2026" */
export function formatVnpDate(value: string | null): string {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(value ?? '');
  return m ? `${m[4]}:${m[5]}:${m[6]} ${m[3]}/${m[2]}/${m[1]}` : '—';
}

/** Tên loại thẻ theo vnp_CardType VNPay trả về */
export const CARD_TYPE_LABEL: Record<string, string> = { ATM: 'Thẻ ATM nội địa', QRCODE: 'Quét QR', CREDIT: 'Thẻ quốc tế', VISA: 'Thẻ Visa', MASTERCARD: 'Thẻ Mastercard', JCB: 'Thẻ JCB' };

/** GET /payments/vnpay/status (công khai): backend đã điền mã VNPay sandbox chưa */
export function useVnpayStatus() {
  return useQuery({
    queryKey: ['vnpay-status'],
    queryFn: () => apiRequest<{ configured: boolean; sandbox: boolean; returnUrl: string | null }>('/payments/vnpay/status'),
    staleTime: 60_000,
  });
}

/** GET /payments/me: lịch sử giao dịch của người đang đăng nhập */
export function useMyPayments() {
  const { status, user, request } = useAuth();
  return useQuery({
    queryKey: [...PAYMENTS_KEY, user?.id],
    queryFn: () => request<PaymentHistoryItem[]>('/payments/me'),
    enabled: status === 'authed',
  });
}

/** GET /payments/:id: chi tiết kèm nhật ký trao đổi với VNPay */
export function usePaymentDetail(id: string | null) {
  const { status, request } = useAuth();
  return useQuery({
    queryKey: [...PAYMENTS_KEY, 'detail', id],
    queryFn: () => request<PaymentDetail>(`/payments/${encodeURIComponent(id!)}`),
    enabled: status === 'authed' && id !== null,
  });
}

/** POST /payments/:id/query: hỏi lại VNPay trạng thái thật của giao dịch */
export function useReconcile() {
  const { request } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<PaymentDetail & { message: string }>(`/payments/${encodeURIComponent(id)}/query`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY }),
  });
}

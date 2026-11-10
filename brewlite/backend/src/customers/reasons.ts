// Lý do khoá / mở khoá tài khoản khách. Quản lý chọn một lý do; "Lý do khác" thì bắt buộc ghi rõ.
// Câu lý do (kèm ghi chú nếu có) được gửi cho khách: khoá thì hiện khi đăng nhập, mở khoá thì vào mục Thông báo.

export const LOCK_REASONS = {
  'fake-orders': 'Đặt nhiều đơn rồi không nhận, không thanh toán',
  'promo-abuse': 'Lạm dụng mã giảm giá hoặc điểm thưởng',
  'payment-fraud': 'Có dấu hiệu gian lận khi thanh toán',
  behavior: 'Có lời lẽ, hành vi không phù hợp với nhân viên',
  'owner-request': 'Theo yêu cầu của chính chủ tài khoản',
  other: 'Lý do khác',
} as const;

export const UNLOCK_REASONS = {
  resolved: 'Sự việc đã được xác minh và giải quyết xong',
  mistake: 'Tài khoản bị khoá nhầm',
  'owner-request': 'Theo yêu cầu của chính chủ tài khoản',
  other: 'Lý do khác',
} as const;

export type LockReason = keyof typeof LOCK_REASONS;
export type UnlockReason = keyof typeof UNLOCK_REASONS;

/** Ghép lý do đã chọn và ghi chú thành câu gửi cho khách */
export function reasonText(labels: Record<string, string>, code: string, note?: string): string {
  const n = note?.trim();
  if (code === 'other') return n ?? '';
  return n ? `${labels[code]}. ${n}` : labels[code];
}

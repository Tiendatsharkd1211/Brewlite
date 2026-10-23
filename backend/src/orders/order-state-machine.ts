import { ConflictException } from '@nestjs/common';

/**
 * MÁY TRẠNG THÁI ĐƠN HÀNG (Task 10.1)
 *
 *   PENDING ──thanh toán OK──▶ PAID ──barista nhận──▶ PREPARING ──pha xong──▶ READY ──giao khách──▶ COMPLETED
 *      │  ▲                     │
 *      │  └──thử lại──┐          └──huỷ──▶ CANCELLED
 *      ▼              │
 *   PAYMENT_FAILED ───┘──huỷ──▶ CANCELLED
 *      (PENDING cũng huỷ được)
 *
 * Mọi chuyển tiếp KHÔNG có trong bảng dưới đều bị assertTransition chặn lại.
 * COMPLETED và CANCELLED là trạng thái kết thúc (không đi tiếp được nữa).
 */
export type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'PAYMENT_FAILED';

export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

/** Luồng thành công dùng cho nút "chuyển bước tiếp theo" của quầy */
export const HAPPY_PATH_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
};

export class InvalidOrderTransitionException extends ConflictException {
  constructor(
    public readonly from: OrderStatus,
    public readonly to: OrderStatus,
  ) {
    super(`Không thể chuyển đơn hàng từ ${from} sang ${to}`);
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Ném lỗi 409 nếu chuyển trạng thái không hợp lệ. Gọi hàm này trước MỌI lần cập nhật status. */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidOrderTransitionException(from, to);
  }
}

export function isTerminal(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

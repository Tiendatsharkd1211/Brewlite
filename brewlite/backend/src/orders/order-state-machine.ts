import { ConflictException } from '@nestjs/common';

/**
 * MÁY TRẠNG THÁI ĐƠN HÀNG (Order State Machine)
 *
 * Sơ đồ luồng:
 *   PENDING ──thanh toán OK──▶ PAID ──barista nhận──▶ PREPARING ──pha xong──▶ READY ──giao khách──▶ COMPLETED
 *      │  ▲                     │
 *      │  └──thử lại──┐          └──huỷ──▶ CANCELLED
 *      ▼              │
 *   PAYMENT_FAILED ───┘──huỷ──▶ CANCELLED
 *      (PENDING cũng huỷ được)
 *
 * Nguyên tắc:
 * - Chuyển trạng thái ngoài bảng ORDER_TRANSITIONS sẽ bị chặn (lỗi 409).
 * - COMPLETED và CANCELLED là trạng thái kết thúc (không thể chuyển đi tiếp).
 */
export type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'PAYMENT_FAILED';

/** Bảng ma trận quy định các bước chuyển trạng thái hợp lệ */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

/** Luồng chuẩn thành công (Happy Path) cho nút "Chuyển bước tiếp theo" tại quầy */
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

/** Chặn và ném lỗi 409 nếu chuyển trạng thái không hợp lệ */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidOrderTransitionException(from, to);
  }
}

/** Kiểm tra trạng thái đã kết thúc vòng đời chưa (COMPLETED hoặc CANCELLED) */
export function isTerminal(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

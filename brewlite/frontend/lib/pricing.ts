// Tính giá TẠM TÍNH trên giao diện (thêm món vào giỏ). Mã giảm giá và tổng tiền thật do máy chủ báo giá (lib/quote.ts).
import { SIZES, TOPPINGS } from './mock-data';
import type { OrderStatus, Product, SizeId } from './types';

export const DELIVERY_FEE = 15000;
/** 1 điểm BrewLite = 100đ khi thanh toán */
export const POINT_VALUE = 100;
/** Tích 1 điểm cho mỗi 1.000đ thanh toán bằng tiền */
export const EARN_PER_VND = 1000;

export function unitPriceOf(product: Product, size: SizeId | null, toppingIds: string[]): number {
  const sizeExtra = size ? (SIZES.find((s) => s.id === size)?.extra ?? 0) : 0;
  const toppings = toppingIds.reduce((sum, id) => sum + (product.toppings.find((t) => t.id === id)?.price ?? TOPPINGS.find((t) => t.id === id)?.price ?? 0), 0);
  return product.price + sizeExtra + toppings;
}

export const VOUCHER_HINT = 'Mỗi đơn dùng được một mã. Xem mã đang có ở mục Ưu đãi.';

export function pointsEarnedFor(paidByMoney: number): number {
  return Math.floor(paidByMoney / EARN_PER_VND);
}

export function tierOf(points: number): { name: 'Silver' | 'Gold' | 'Platinum'; next: number | null } {
  if (points >= 5000) return { name: 'Platinum', next: null };
  if (points >= 2000) return { name: 'Gold', next: 5000 };
  return { name: 'Silver', next: 2000 };
}

/** 4 bước hiển thị trên thanh tiến trình, ứng với PAID → PREPARING → READY → COMPLETED */
export const ORDER_STAGES = ['Đã thanh toán', 'Đang pha chế', 'Sẵn sàng lấy món', 'Đã hoàn thành'] as const;

export function stageIndex(status: OrderStatus): number {
  return ['PAID', 'PREPARING', 'READY', 'COMPLETED'].indexOf(status);
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng lấy món',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã huỷ',
  PAYMENT_FAILED: 'Thanh toán lỗi',
};

export function statusLabel(status: OrderStatus, fulfillment: 'PICKUP' | 'DELIVERY' = 'PICKUP'): string {
  if (status === 'READY' && fulfillment === 'DELIVERY') return 'Đang giao hàng';
  return STATUS_LABEL[status];
}

export const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'PAYMENT_FAILED', 'PAID', 'PREPARING', 'READY'];

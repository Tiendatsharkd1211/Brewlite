/**
 * Tiện ích tính giá và logic hiển thị tạm tính ở frontend (backend sẽ xác thực lại khi tạo đơn).
 */
import { SIZES, TOPPINGS } from './mock-data';
import type { Fulfillment, OrderStatus, PaymentMethodId, Product, SizeId } from './types';

/** Phí giao hàng cố định */
export const DELIVERY_FEE = 15000;
/** Giá trị quy đổi: 1 điểm = 100đ */
export const POINT_VALUE = 100;
/** Tỉ lệ tích điểm: 1 điểm cho mỗi 1.000đ thanh toán bằng tiền */
export const EARN_PER_VND = 1000;

/** Tính đơn giá một món gồm giá gốc + phụ phí size + tổng giá các loại topping đã chọn */
export function unitPriceOf(product: Product, size: SizeId | null, toppingIds: string[]): number {
  const sizeExtra = size ? (SIZES.find((s) => s.id === size)?.extra ?? 0) : 0;
  const toppings = toppingIds.reduce((sum, id) => sum + (product.toppings.find((t) => t.id === id)?.price ?? TOPPINGS.find((t) => t.id === id)?.price ?? 0), 0);
  return product.price + sizeExtra + toppings;
}


export type VoucherResult =
  | { ok: true; code: string; label: string; discount: number; freeShip: boolean }
  | { ok: false; code: string; message: string };

export const VOUCHER_HINT = 'Mã thử nghiệm: BREW20, VNPAY20, FREESHIP';

/** Xem trước mã giảm giá (luật giống backend: bảng Voucher trong CSDL) */
export function applyVoucher(raw: string, subtotal: number, fulfillment: Fulfillment, method: PaymentMethodId | null): VoucherResult {
  const code = raw.trim().toUpperCase();
  if (!code) return { ok: false, code, message: 'Nhập mã ưu đãi trước khi áp dụng.' };

  if (code === 'BREW20') {
    if (subtotal < 50000) return { ok: false, code, message: 'BREW20 áp dụng cho đơn từ 50.000đ.' };
    return { ok: true, code, label: 'Giảm 20%, tối đa 20.000đ', discount: Math.min(Math.round(subtotal * 0.2), 20000), freeShip: false };
  }
  if (code === 'VNPAY20') {
    if (method !== 'VNPAY') return { ok: false, code, message: 'VNPAY20 chỉ áp dụng khi thanh toán qua VNPay.' };
    return { ok: true, code, label: 'Giảm 20% khi trả qua VNPay, tối đa 25.000đ', discount: Math.min(Math.round(subtotal * 0.2), 25000), freeShip: false };
  }
  if (code === 'FREESHIP') {
    if (fulfillment !== 'delivery') return { ok: false, code, message: 'FREESHIP chỉ dùng cho đơn giao tận nơi.' };
    return { ok: true, code, label: 'Miễn phí giao hàng', discount: 0, freeShip: true };
  }
  return { ok: false, code, message: `Mã ${code} không tồn tại hoặc đã hết hạn.` };
}

/** Tính số điểm thưởng nhận được dựa trên số tiền thực trả */
export function pointsEarnedFor(paidByMoney: number): number {
  return Math.floor(paidByMoney / EARN_PER_VND);
}

/** Xác định hạng thành viên (Silver, Gold, Platinum) và mốc điểm lên hạng kế tiếp */
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

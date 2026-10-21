/**
 * Luật áp mã giảm giá (Task 10.4), viết dạng hàm thuần để dễ test.
 * Voucher lấy từ bảng Voucher trong CSDL.
 */
export interface VoucherLike {
  code: string;
  type: 'PERCENT' | 'FREESHIP';
  label: string;
  percent: number;
  maxDiscount: number;
  minOrder: number;
  requiredMethod: string | null;
  requiresDelivery: boolean;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
}

export interface VoucherContext {
  subtotal: number;
  fulfillment: 'PICKUP' | 'DELIVERY';
  method: string;
}

export type VoucherOutcome = { ok: true; discount: number; freeShip: boolean } | { ok: false; reason: string };

const METHOD_NAMES: Record<string, string> = { MOMO: 'Ví MoMo', ZALOPAY: 'ZaloPay', SHOPEEPAY: 'ShopeePay', VNPAY: 'VNPay', VIETQR: 'VietQR', CARD: 'thẻ', POINTS: 'điểm' };

export function evaluateVoucher(v: VoucherLike | null, ctx: VoucherContext): VoucherOutcome {
  if (!v || !v.active) return { ok: false, reason: 'Mã giảm giá không tồn tại hoặc đã hết hạn' };
  if (v.usageLimit !== null && v.usedCount >= v.usageLimit) return { ok: false, reason: `Mã ${v.code} đã hết lượt sử dụng` };
  if (ctx.subtotal < v.minOrder) return { ok: false, reason: `Mã ${v.code} áp dụng cho đơn từ ${v.minOrder.toLocaleString('vi-VN')}đ` };
  if (v.requiredMethod && v.requiredMethod !== ctx.method) {
    return { ok: false, reason: `Mã ${v.code} chỉ áp dụng khi thanh toán bằng ${METHOD_NAMES[v.requiredMethod] ?? v.requiredMethod}` };
  }
  if (v.requiresDelivery && ctx.fulfillment !== 'DELIVERY') return { ok: false, reason: `Mã ${v.code} chỉ dùng cho đơn giao tận nơi` };
  if (v.type === 'FREESHIP') return { ok: true, discount: 0, freeShip: true };
  const discount = Math.min(Math.round((ctx.subtotal * v.percent) / 100), v.maxDiscount || Number.MAX_SAFE_INTEGER);
  return { ok: true, discount, freeShip: false };
}

/** 1.000đ trả bằng tiền = 1 điểm */
export function pointsEarnedFor(amountPaid: number): number {
  return Math.floor(amountPaid / 1000);
}

/** 1 điểm = 100đ khi thanh toán bằng điểm */
export function pointsNeededFor(total: number): number {
  return Math.ceil(total / 100);
}

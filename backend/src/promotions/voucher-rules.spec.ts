import { evaluateVoucher, pointsEarnedFor, pointsNeededFor, VoucherLike } from './voucher-rules';

const base: VoucherLike = {
  code: 'BREW20',
  type: 'PERCENT',
  label: '',
  percent: 20,
  maxDiscount: 20000,
  minOrder: 50000,
  requiredMethod: null,
  requiresDelivery: false,
  usageLimit: null,
  usedCount: 0,
  active: true,
};
const ctx = { subtotal: 80000, fulfillment: 'PICKUP' as const, method: 'POINTS' };

describe('Khuyến mãi và điểm thưởng', () => {
  it('giảm theo % nhưng không vượt mức tối đa', () => {
    expect(evaluateVoucher(base, ctx)).toEqual({ ok: true, discount: 16000, freeShip: false });
    expect(evaluateVoucher(base, { ...ctx, subtotal: 200000 })).toEqual({ ok: true, discount: 20000, freeShip: false });
  });

  it('từ chối mã không đủ điều kiện', () => {
    expect(evaluateVoucher(null, ctx).ok).toBe(false);
    expect(evaluateVoucher({ ...base, active: false }, ctx).ok).toBe(false);
    expect(evaluateVoucher(base, { ...ctx, subtotal: 30000 }).ok).toBe(false);
    expect(evaluateVoucher({ ...base, requiredMethod: 'VNPAY' }, ctx).ok).toBe(false);
    expect(evaluateVoucher({ ...base, usageLimit: 10, usedCount: 10 }, ctx).ok).toBe(false);
    expect(evaluateVoucher({ ...base, type: 'FREESHIP', requiresDelivery: true }, ctx).ok).toBe(false);
  });

  it('miễn phí giao hàng cho đơn giao tận nơi', () => {
    expect(evaluateVoucher({ ...base, type: 'FREESHIP', requiresDelivery: true, minOrder: 0 }, { ...ctx, fulfillment: 'DELIVERY' })).toEqual({ ok: true, discount: 0, freeShip: true });
  });

  it('quy đổi điểm', () => {
    expect(pointsEarnedFor(35200)).toBe(35);
    expect(pointsNeededFor(35200)).toBe(352);
  });
});

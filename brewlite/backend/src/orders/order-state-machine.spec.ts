import { assertTransition, canTransition, InvalidOrderTransitionException, isTerminal, ORDER_TRANSITIONS, OrderStatus } from './order-state-machine';

// Unit test cho Máy trạng thái đơn hàng (Order State Machine)
describe('Order state machine', () => {
  // Luồng chuẩn từ lúc tạo đến khi hoàn tất đơn
  it('cho phép đi hết luồng thành công PENDING → PAID → PREPARING → READY → COMPLETED', () => {
    const path: OrderStatus[] = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED'];
    for (let i = 0; i < path.length - 1; i++) {
      expect(() => assertTransition(path[i], path[i + 1])).not.toThrow();
    }
  });

  // Xử lý lỗi thanh toán: cho phép thử lại (về PENDING) hoặc huỷ đơn (CANCELLED)
  it('cho phép nhánh lỗi thanh toán rồi thử lại', () => {
    expect(() => assertTransition('PENDING', 'PAYMENT_FAILED')).not.toThrow();
    expect(() => assertTransition('PAYMENT_FAILED', 'PENDING')).not.toThrow();
    expect(() => assertTransition('PAYMENT_FAILED', 'CANCELLED')).not.toThrow();
  });

  // Chặn tất cả các trường hợp chuyển sai luồng (nhảy cóc, đi lùi, tự chuyển chính nó...)
  it.each<[OrderStatus, OrderStatus]>([
    ['PENDING', 'COMPLETED'],     // nhảy cóc, chưa thanh toán đã hoàn thành
    ['PENDING', 'PREPARING'],     // chưa trả tiền đã pha
    ['PAYMENT_FAILED', 'PAID'],   // phải quay lại PENDING trước
    ['PREPARING', 'CANCELLED'],   // đang pha thì không huỷ được
    ['READY', 'PAID'],            // đi lùi
    ['COMPLETED', 'CANCELLED'],   // trạng thái kết thúc
    ['CANCELLED', 'PENDING'],     // trạng thái kết thúc
    ['PAID', 'PAID'],             // không tự chuyển sang chính nó
  ])('chặn %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(InvalidOrderTransitionException);
  });

  // COMPLETED và CANCELLED là trạng thái cuối, không thể đi tiếp
  it('COMPLETED và CANCELLED là trạng thái kết thúc', () => {
    expect(isTerminal('COMPLETED')).toBe(true);
    expect(isTerminal('CANCELLED')).toBe(true);
    expect(isTerminal('PAID')).toBe(false);
  });

  it('bảng chuyển trạng thái có đủ 7 trạng thái', () => {
    expect(Object.keys(ORDER_TRANSITIONS).sort()).toEqual(['CANCELLED', 'COMPLETED', 'PAID', 'PAYMENT_FAILED', 'PENDING', 'PREPARING', 'READY']);
  });
});

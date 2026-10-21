import { randomUUID } from 'crypto';
import { createFixture, createServices, orderDto } from './helpers';

// Task 10 – tiêu chí (b): gửi 2 lần cùng Idempotency-Key chỉ tạo 1 giao dịch, chỉ trừ tiền 1 lần
describe('Thanh toán idempotent (PostgreSQL thật)', () => {
  let s: Awaited<ReturnType<typeof createServices>>;
  let fx: Awaited<ReturnType<typeof createFixture>>;

  beforeAll(async () => {
    s = await createServices();
    fx = await createFixture(s.prisma, 50);
  });
  afterAll(async () => {
    await fx.cleanup();
    await s.prisma.$disconnect();
  });

  it('gửi lại tuần tự cùng khoá: trả kết quả cũ, không trừ tiền lần 2, không cộng điểm lần 2', async () => {
    const order = await s.orders.create(fx.user.id, orderDto(fx.product.id, 2));
    const key = randomUUID();
    const chargesBefore = s.gateway.chargeCount;

    const first = await s.payments.pay(fx.user.id, key, { orderId: order.id, method: 'CARD' });
    const second = await s.payments.pay(fx.user.id, key, { orderId: order.id, method: 'CARD' });

    expect(first.order.status).toBe('PAID');
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.payment.id).toBe(first.payment.id);
    expect(s.gateway.chargeCount - chargesBefore).toBe(1);
    expect(await s.prisma.payment.count({ where: { orderId: order.id } })).toBe(1);

    const user = await s.prisma.user.findUniqueOrThrow({ where: { id: fx.user.id } });
    expect(user.loyaltyPoints).toBe(Math.floor(order.total / 1000)); // cộng đúng 1 lần
  });

  it('5 request cùng khoá tới ĐỒNG THỜI: chỉ 1 giao dịch, tất cả nhận cùng kết quả', async () => {
    const order = await s.orders.create(fx.user.id, orderDto(fx.product.id, 1));
    const key = randomUUID();
    const chargesBefore = s.gateway.chargeCount;

    const results = await Promise.all(Array.from({ length: 5 }, () => s.payments.pay(fx.user.id, key, { orderId: order.id, method: 'CARD' })));

    expect(new Set(results.map((r) => r.payment.id)).size).toBe(1);
    expect(results.every((r) => r.order.status === 'PAID')).toBe(true);
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect(s.gateway.chargeCount - chargesBefore).toBe(1);
    expect(await s.prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('dùng lại khoá cũ cho đơn khác thì bị từ chối', async () => {
    const a = await s.orders.create(fx.user.id, orderDto(fx.product.id));
    const b = await s.orders.create(fx.user.id, orderDto(fx.product.id));
    const key = randomUUID();
    await s.payments.pay(fx.user.id, key, { orderId: a.id, method: 'CARD' });
    await expect(s.payments.pay(fx.user.id, key, { orderId: b.id, method: 'CARD' })).rejects.toThrow('Idempotency-Key');
  });

  it('thanh toán lỗi: đơn sang PAYMENT_FAILED; thử lại bằng khoá mới thì sang PAID', async () => {
    const order = await s.orders.create(fx.user.id, orderDto(fx.product.id));
    const failed = await s.payments.pay(fx.user.id, randomUUID(), { orderId: order.id, method: 'CARD', simulate: 'fail' });
    expect(failed.order.status).toBe('PAYMENT_FAILED');
    expect(failed.payment.status).toBe('FAILED');

    const retried = await s.payments.pay(fx.user.id, randomUUID(), { orderId: order.id, method: 'CARD' });
    expect(retried.order.status).toBe('PAID');
  });
});

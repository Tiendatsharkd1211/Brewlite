import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createFixture, createServices, orderDto } from './helpers';

// Task 10 – tiêu chí (b): gửi 2 lần cùng Idempotency-Key chỉ tạo 1 giao dịch, chỉ trừ tiền tài khoản ảo 1 lần
describe('Thanh toán idempotent, trừ tiền tài khoản ảo (PostgreSQL thật)', () => {
  let s: Awaited<ReturnType<typeof createServices>>;
  let fx: Awaited<ReturnType<typeof createFixture>>;

  beforeAll(async () => {
    s = await createServices();
    fx = await createFixture(s.prisma, 50, 1_000_000);
  });
  afterAll(async () => {
    await fx.cleanup();
    await s.prisma.$disconnect();
  });

  it('thanh toán thành công: số dư tài khoản ảo bị trừ đúng tổng tiền, có dòng lịch sử số dư', async () => {
    const before = await fx.balanceOf();
    const order = await s.orders.create(fx.user.id, orderDto(fx.product.id, 2));
    const result = await s.payments.pay(fx.user.id, randomUUID(), { orderId: order.id, method: 'CARD' });

    expect(result.order.status).toBe('PAID');
    expect(result.payment.walletId).toBe(fx.wallet.id);
    expect(result.wallet?.balance).toBe(before - order.total);
    expect(await fx.balanceOf()).toBe(before - order.total);
    const log = await s.prisma.walletTransaction.findMany({ where: { orderId: order.id } });
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ type: 'PAYMENT', amount: -order.total, balanceAfter: before - order.total });
  });

  it('gửi lại tuần tự cùng khoá: trả kết quả cũ, không trừ tiền lần 2, không cộng điểm lần 2', async () => {
    const order = await s.orders.create(fx.user.id, orderDto(fx.product.id, 2));
    const key = randomUUID();
    const before = await fx.balanceOf();
    const pointsBefore = (await s.prisma.user.findUniqueOrThrow({ where: { id: fx.user.id } })).loyaltyPoints;

    const first = await s.payments.pay(fx.user.id, key, { orderId: order.id, method: 'CARD' });
    const second = await s.payments.pay(fx.user.id, key, { orderId: order.id, method: 'CARD' });

    expect(first.order.status).toBe('PAID');
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.payment.id).toBe(first.payment.id);
    expect(await fx.balanceOf()).toBe(before - order.total); // chỉ trừ 1 lần
    expect(await s.prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
    expect(await s.prisma.walletTransaction.count({ where: { orderId: order.id } })).toBe(1);

    const user = await s.prisma.user.findUniqueOrThrow({ where: { id: fx.user.id } });
    expect(user.loyaltyPoints - pointsBefore).toBe(Math.floor(order.total / 1000)); // cộng đúng 1 lần
  });

  it('5 request cùng khoá tới ĐỒNG THỜI: chỉ 1 giao dịch, chỉ trừ tiền 1 lần, tất cả nhận cùng kết quả', async () => {
    const order = await s.orders.create(fx.user.id, orderDto(fx.product.id, 1));
    const key = randomUUID();
    const before = await fx.balanceOf();

    const results = await Promise.all(Array.from({ length: 5 }, () => s.payments.pay(fx.user.id, key, { orderId: order.id, method: 'CARD' })));

    expect(new Set(results.map((r) => r.payment.id)).size).toBe(1);
    expect(results.every((r) => r.order.status === 'PAID')).toBe(true);
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect(await fx.balanceOf()).toBe(before - order.total);
    expect(await s.prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('cùng 1 đơn, 3 khoá KHÁC nhau gửi đồng thời: đơn chỉ PAID 1 lần, tiền chỉ bị trừ 1 lần', async () => {
    const order = await s.orders.create(fx.user.id, orderDto(fx.product.id, 1));
    const before = await fx.balanceOf();

    const results = await Promise.allSettled(Array.from({ length: 3 }, () => s.payments.pay(fx.user.id, randomUUID(), { orderId: order.id, method: 'CARD' })));
    const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.payment.status === 'SUCCEEDED');

    expect(succeeded).toHaveLength(1);
    expect(await fx.balanceOf()).toBe(before - order.total);
    expect(await s.prisma.walletTransaction.count({ where: { orderId: order.id } })).toBe(1);
    expect((await s.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PAID');
  });

  it('dùng lại khoá cũ cho đơn khác thì bị từ chối', async () => {
    const a = await s.orders.create(fx.user.id, orderDto(fx.product.id));
    const b = await s.orders.create(fx.user.id, orderDto(fx.product.id));
    const key = randomUUID();
    await s.payments.pay(fx.user.id, key, { orderId: a.id, method: 'CARD' });
    await expect(s.payments.pay(fx.user.id, key, { orderId: b.id, method: 'CARD' })).rejects.toThrow('Idempotency-Key');
  });

  it('chưa liên kết ví MoMo thì không tạo được đơn trả bằng MoMo', async () => {
    await expect(s.orders.create(fx.user.id, orderDto(fx.product.id, 1, 'MOMO'))).rejects.toBeInstanceOf(BadRequestException);
  });
});

// Thanh toán lỗi THẬT do tài khoản ảo không đủ số dư (thay cho nút "giả lập thất bại" trước đây)
describe('Không đủ số dư tài khoản ảo (PostgreSQL thật)', () => {
  let s: Awaited<ReturnType<typeof createServices>>;

  beforeAll(async () => {
    s = await createServices();
  });
  afterAll(async () => {
    await s.prisma.$disconnect();
  });

  it('số dư 20.000đ, đơn 30.000đ: đơn PAYMENT_FAILED, không bị trừ đồng nào; nạp thêm rồi thử lại thì PAID', async () => {
    const fx = await createFixture(s.prisma, 10, 20_000);
    try {
      const order = await s.orders.create(fx.user.id, orderDto(fx.product.id, 1));
      expect(order.total).toBe(30_000);

      const failed = await s.payments.pay(fx.user.id, randomUUID(), { orderId: order.id, method: 'CARD' });
      expect(failed.order.status).toBe('PAYMENT_FAILED');
      expect(failed.payment.status).toBe('FAILED');
      expect(failed.payment.failureReason).toContain('không đủ số dư');
      expect(await fx.balanceOf()).toBe(20_000);
      expect(failed.order.pointsEarned).toBe(0);

      const topped = await s.wallets.topup(fx.user.id, fx.wallet.id, 50_000);
      expect(topped.balance).toBe(70_000);

      const retried = await s.payments.pay(fx.user.id, randomUUID(), { orderId: order.id, method: 'CARD' });
      expect(retried.order.status).toBe('PAID');
      expect(await fx.balanceOf()).toBe(40_000);
    } finally {
      await fx.cleanup();
    }
  });

  it('số dư 50.000đ, 5 đơn 30.000đ thanh toán ĐỒNG THỜI: chỉ 1 đơn PAID, số dư còn 20.000đ, không bao giờ âm', async () => {
    const fx = await createFixture(s.prisma, 10, 50_000);
    try {
      const orders = await Promise.all(Array.from({ length: 5 }, () => s.orders.create(fx.user.id, orderDto(fx.product.id, 1))));
      const results = await Promise.all(orders.map((o) => s.payments.pay(fx.user.id, randomUUID(), { orderId: o.id, method: 'CARD' })));

      expect(results.filter((r) => r.order.status === 'PAID')).toHaveLength(1);
      expect(results.filter((r) => r.order.status === 'PAYMENT_FAILED')).toHaveLength(4);
      expect(await fx.balanceOf()).toBe(20_000);
    } finally {
      await fx.cleanup();
    }
  });
});

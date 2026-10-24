import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InvalidOrderTransitionException } from '../src/orders/order-state-machine';
import { createFixture, createServices, orderDto, payByVnpay, vnpayCallback } from './helpers';

/**
 * Kiểm thử tích hợp (Integration Test) trên PostgreSQL thật:
 * 1. Kiểm soát tồn kho khi nhiều khách đặt đồng thời (Concurrency - chống bán âm/vượt tồn kho).
 * 2. Thực thi máy trạng thái đơn hàng (Order State Machine) ở tầng CSDL.
 */
describe('Tồn kho khi đặt đồng thời + máy trạng thái (PostgreSQL thật)', () => {
  let s: Awaited<ReturnType<typeof createServices>>;

  beforeAll(async () => {
    s = await createServices();
  });
  afterAll(async () => {
    await s.prisma.$disconnect();
  });

  // Test 1: Đặt 12 đơn đồng thời vào món chỉ còn 5 phần -> đúng 5 đơn thành công, 7 đơn bị từ chối (409), kho về 0 (không âm)
  it('kho còn 5, 12 khách đặt cùng lúc mỗi người 1 phần: đúng 5 đơn thành công, kho về 0, không âm', async () => {
    const fx = await createFixture(s.prisma, 5);
    try {
      const results = await Promise.allSettled(Array.from({ length: 12 }, () => s.orders.create(fx.user.id, orderDto(fx.product.id, 1))));
      const ok = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

      expect(ok).toHaveLength(5);
      expect(rejected).toHaveLength(7);
      rejected.forEach((r) => expect(r.reason).toBeInstanceOf(ConflictException));

      const product = await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } });
      expect(product.stock).toBe(0);
      const sold = await s.prisma.orderItem.aggregate({ where: { productId: fx.product.id }, _sum: { qty: true } });
      expect(sold._sum.qty).toBe(5);
    } finally {
      await fx.cleanup();
    }
  });

  // Test 2: Mỗi đơn đặt nhiều phần (3 phần/đơn, kho 10) -> tối đa 3 đơn thành công (= 9 phần), còn dư 1 trong kho, không vượt tồn
  it('đặt nhiều phần cùng lúc (mỗi đơn 3 phần, kho 10): tổng đã bán không vượt 10', async () => {
    const fx = await createFixture(s.prisma, 10);
    try {
      await Promise.allSettled(Array.from({ length: 8 }, () => s.orders.create(fx.user.id, orderDto(fx.product.id, 3))));
      const product = await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } });
      const sold = await s.prisma.orderItem.aggregate({ where: { productId: fx.product.id }, _sum: { qty: true } });
      expect(sold._sum.qty).toBe(9); // 3 đơn x 3 phần; đơn thứ 4 cần 3 nhưng chỉ còn 1
      expect(product.stock).toBe(1);
    } finally {
      await fx.cleanup();
    }
  });

  // Test 3: Huỷ đơn chưa thanh toán -> hoàn lại số lượng tồn kho (restock) về CSDL
  it('huỷ đơn chưa thanh toán thì hoàn lại tồn kho', async () => {
    const fx = await createFixture(s.prisma, 3);
    try {
      const order = await s.orders.create(fx.user.id, orderDto(fx.product.id, 2));
      expect((await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } })).stock).toBe(1);
      const cancelled = await s.orders.cancel(fx.user.id, order.id);
      expect(cancelled.status).toBe('CANCELLED');
      expect((await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } })).stock).toBe(3);
    } finally {
      await fx.cleanup();
    }
  });

  // Test 4: Chặn chuyển trạng thái sai trên đơn thật (PENDING không thể advance, đơn huỷ không thể thanh toán, đơn PAID không tự huỷ)
  it('chặn chuyển trạng thái sai trên đơn thật: PENDING không thể "pha chế", đơn đã huỷ không thể thanh toán', async () => {
    const fx = await createFixture(s.prisma, 5);
    try {
      const order = await s.orders.create(fx.user.id, orderDto(fx.product.id));
      await expect(s.orders.advance(fx.user.id, order.id)).rejects.toBeInstanceOf(ConflictException);

      await s.orders.cancel(fx.user.id, order.id);
      await expect(s.payments.pay(fx.user.id, randomUUID(), { orderId: order.id, method: 'VNPAY' }, '127.0.0.1')).rejects.toThrow('huỷ');

      const paid = await s.orders.create(fx.user.id, orderDto(fx.product.id));
      expect((await payByVnpay(s, fx.user.id, paid.id)).order.status).toBe('PAID');
      const preparing = await s.orders.advance(fx.user.id, paid.id);
      expect(preparing.status).toBe('PREPARING');
      await expect(s.orders.cancel(fx.user.id, paid.id)).rejects.toBeInstanceOf(ConflictException);
      await s.orders.advance(fx.user.id, paid.id); // READY
      const done = await s.orders.advance(fx.user.id, paid.id); // COMPLETED
      expect(done.status).toBe('COMPLETED');
      await expect(s.orders.advance(fx.user.id, paid.id)).rejects.toBeInstanceOf(ConflictException);
    } finally {
      await fx.cleanup();
    }
  });

  // Test 5: Huỷ đơn khi đang có link thanh toán VNPay -> link đổi sang FAILED; nếu khách vẫn trả tiền qua VNPay thì đánh dấu NEEDS_REFUND
  it('huỷ đơn khi đang có link VNPay: link FAILED; nếu VNPay vẫn báo đã trừ tiền thì ghi "cần hoàn tiền", đơn vẫn CANCELLED', async () => {
    const fx = await createFixture(s.prisma, 5);
    try {
      const order = await s.orders.create(fx.user.id, orderDto(fx.product.id));
      const r = await s.payments.pay(fx.user.id, randomUUID(), { orderId: order.id, method: 'VNPAY' }, '127.0.0.1');
      await s.orders.cancel(fx.user.id, order.id);
      expect((await s.prisma.payment.findUniqueOrThrow({ where: { id: r.payment.id } })).status).toBe('FAILED');

      await s.payments.handleIpn(vnpayCallback(r.payUrl!));
      expect((await s.prisma.payment.findUniqueOrThrow({ where: { id: r.payment.id } })).status).toBe('NEEDS_REFUND');
      expect((await s.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('CANCELLED');
      expect((await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } })).stock).toBe(5); // đã hoàn kho
    } finally {
      await fx.cleanup();
    }
  });

  // Test 6: Ngoại lệ InvalidOrderTransitionException phải trả về đúng mã HTTP 409 Conflict
  it('assertTransition ném đúng loại lỗi', () => {
    expect(new InvalidOrderTransitionException('PENDING', 'COMPLETED').getStatus()).toBe(409);
  });
});

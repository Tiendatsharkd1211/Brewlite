import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { overview } from '../src/manage/overview';
import { PENDING_TTL_MS } from '../src/orders/orders.service';
import { createFixture, createServices, orderDto, payByVnpay } from './helpers';

// Các luồng đặt / huỷ / báo giá / thống kê trên PostgreSQL thật
describe('Luồng đơn hàng: báo giá, tự huỷ, quầy huỷ, tổng quan (PostgreSQL thật)', () => {
  let s: Awaited<ReturnType<typeof createServices>>;
  beforeAll(async () => {
    s = await createServices();
  });
  afterAll(async () => {
    await s.prisma.$disconnect();
  });

  it('báo giá tính theo giá CSDL, báo món thiếu tồn, mã sai lý do; không giữ kho', async () => {
    const fx = await createFixture(s.prisma, 3);
    try {
      const q = await s.orders.quote({ ...orderDto(fx.product.id, 2), voucherCode: 'KHONGCO' });
      expect(q.subtotal).toBe(60000); // size S: 30.000đ × 2
      expect(q.ok).toBe(true);
      expect(q.voucher).toEqual({ code: 'KHONGCO', ok: false, message: 'Mã giảm giá không tồn tại hoặc đã hết hạn' });
      expect(q.discount).toBe(0);
      const over = await s.orders.quote(orderDto(fx.product.id, 5));
      expect(over.ok).toBe(false);
      expect(over.lines[0].problem).toContain('chỉ còn 3 phần');
      expect((await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } })).stock).toBe(3);
    } finally {
      await fx.cleanup();
    }
  });

  it('đơn bỏ dở quá 30 phút tự huỷ, trả món về kho; đơn còn link VNPay đang mở thì chưa huỷ', async () => {
    const fx = await createFixture(s.prisma, 10);
    try {
      const a = await s.orders.create(fx.user.id, orderDto(fx.product.id, 3));
      const b = await s.orders.create(fx.user.id, orderDto(fx.product.id, 2));
      await s.payments.pay(fx.user.id, randomUUID(), { orderId: b.id, method: 'VNPAY' }, '127.0.0.1'); // link sống 15 phút
      const old = new Date(Date.now() - PENDING_TTL_MS - 60_000);
      await s.prisma.order.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { createdAt: old } });
      expect((await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } })).stock).toBe(5);

      await s.orders.expireStale();
      expect((await s.prisma.order.findUniqueOrThrow({ where: { id: a.id } })).status).toBe('CANCELLED');
      expect((await s.prisma.order.findUniqueOrThrow({ where: { id: b.id } })).status).toBe('PENDING');
      expect((await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } })).stock).toBe(8);

      // Link hết hạn thì đơn B cũng được dọn
      await s.orders.expireStale(new Date(Date.now() + 16 * 60_000));
      expect((await s.prisma.order.findUniqueOrThrow({ where: { id: b.id } })).status).toBe('CANCELLED');
      expect((await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } })).stock).toBe(10);
    } finally {
      await s.prisma.notification.deleteMany({ where: { userId: fx.user.id } });
      await fx.cleanup();
    }
  });

  it('quầy huỷ đơn trả bằng điểm: hoàn điểm, trả kho, bớt số đã bán; đơn đang pha thì không huỷ được', async () => {
    const fx = await createFixture(s.prisma, 10);
    try {
      await s.prisma.user.update({ where: { id: fx.user.id }, data: { loyaltyPoints: 2000 } });
      const o = await s.orders.create(fx.user.id, orderDto(fx.product.id, 2, 'POINTS'));
      await s.payments.pay(fx.user.id, randomUUID(), { orderId: o.id, method: 'POINTS' }, '127.0.0.1');
      expect(await fx.pointsOf()).toBe(2000 - 600); // 60.000đ = 600 điểm
      await s.orders.staffCancel(o.id, 'Khách đổi ý, nhờ quầy huỷ');
      expect(await fx.pointsOf()).toBe(2000);
      const p = await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } });
      expect(p.stock).toBe(10);
      expect(p.sold).toBe(0);
      await expect(s.orders.staffCancel(o.id, 'Huỷ lại')).rejects.toThrow(ConflictException);

      const o2 = await s.orders.create(fx.user.id, orderDto(fx.product.id, 1, 'POINTS'));
      await s.payments.pay(fx.user.id, randomUUID(), { orderId: o2.id, method: 'POINTS' }, '127.0.0.1');
      await s.orders.advance(o2.id); // đang pha
      await expect(s.orders.staffCancel(o2.id, 'Thử huỷ')).rejects.toThrow('Đơn đã bắt đầu pha');
    } finally {
      await s.prisma.notification.deleteMany({ where: { userId: fx.user.id } });
      await fx.cleanup();
    }
  });

  it('quầy huỷ đơn trả qua VNPay: giao dịch chuyển "cần hoàn tiền", thu lại điểm đã tích', async () => {
    const fx = await createFixture(s.prisma, 10);
    try {
      const o = await s.orders.create(fx.user.id, orderDto(fx.product.id, 2));
      await payByVnpay(s, fx.user.id, o.id);
      expect(await fx.pointsOf()).toBe(60); // tích 60 điểm cho 60.000đ
      await s.orders.staffCancel(o.id, 'Quầy hết món');
      expect(await fx.pointsOf()).toBe(0);
      const pay = await s.prisma.payment.findFirstOrThrow({ where: { orderId: o.id } });
      expect(pay.status).toBe('NEEDS_REFUND');
      expect(pay.failureReason).toContain('Quầy hết món');
    } finally {
      await s.prisma.notification.deleteMany({ where: { userId: fx.user.id } });
      await fx.cleanup();
    }
  });

  it('tổng quan tính từ đơn thật: đơn đã trả có trong doanh thu, đơn huỷ thì không', async () => {
    const fx = await createFixture(s.prisma, 10);
    try {
      const before = await overview(s.prisma, 'today');
      const o = await s.orders.create(fx.user.id, orderDto(fx.product.id, 2));
      await payByVnpay(s, fx.user.id, o.id);
      const after = await overview(s.prisma, 'today');
      expect(after.revenue - before.revenue).toBe(60000);
      expect(after.orders - before.orders).toBe(1);
      expect(after.recent[0].code).toBe(o.id);
      await s.orders.staffCancel(o.id, 'Thử huỷ');
      expect((await overview(s.prisma, 'today')).revenue).toBe(before.revenue);
    } finally {
      await s.prisma.notification.deleteMany({ where: { userId: fx.user.id } });
      await fx.cleanup();
    }
  });
});

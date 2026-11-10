import { randomUUID } from 'crypto';
import { NotificationsService } from '../src/notifications/notifications.service';
import { createFixture, createServices, orderDto } from './helpers';

const IP = '127.0.0.1';

// Thông báo được tạo cùng transaction với việc đổi trạng thái đơn (PostgreSQL thật)
describe('Thông báo theo trạng thái đơn (PostgreSQL thật)', () => {
  let s: Awaited<ReturnType<typeof createServices>>;
  let notifications: NotificationsService;
  beforeAll(async () => {
    s = await createServices();
    notifications = new NotificationsService(s.prisma);
  });
  afterAll(async () => {
    await s.prisma.$disconnect();
  });

  it('trả điểm → PAID, quầy pha → sẵn sàng → hoàn tất: mỗi bước một thông báo, đánh dấu đã đọc được', async () => {
    const fx = await createFixture(s.prisma, 10);
    try {
      await s.prisma.user.update({ where: { id: fx.user.id }, data: { loyaltyPoints: 1000 } });
      const order = await s.orders.create(fx.user.id, orderDto(fx.product.id, 1, 'POINTS'));
      await s.payments.pay(fx.user.id, randomUUID(), { orderId: order.id, method: 'POINTS' }, IP);
      for (let i = 0; i < 3; i++) await s.orders.advance(order.id);

      const mine = await notifications.findMine(fx.user.id);
      expect(mine.items.map((n) => n.title)).toEqual([
        `Đơn ${order.id} đã hoàn tất`,
        `Đơn ${order.id} đã sẵn sàng`,
        `Quầy đang pha đơn ${order.id}`,
        `Đã nhận thanh toán đơn ${order.id}`,
      ]);
      expect(mine.unread).toBe(4);
      expect(mine.items.every((n) => n.orderId === order.id)).toBe(true);

      const after = await notifications.markRead(fx.user.id, mine.items[0].id);
      expect(after.unread).toBe(3);
      expect((await notifications.markAllRead(fx.user.id)).unread).toBe(0);
    } finally {
      await fx.cleanup();
    }
  });

  it('không đánh dấu được thông báo của người khác', async () => {
    const a = await createFixture(s.prisma, 5);
    const b = await createFixture(s.prisma, 5);
    try {
      const n = await s.prisma.notification.create({ data: { userId: a.user.id, title: 'x', body: 'y' } });
      await notifications.markRead(b.user.id, n.id);
      expect((await s.prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).readAt).toBeNull();
    } finally {
      await a.cleanup();
      await b.cleanup();
    }
  });
});

import { randomUUID } from 'crypto';
import { OrdersService } from '../src/orders/orders.service';
import { MockPaymentGateway } from '../src/payments/mock-payment.gateway';
import { PaymentsService } from '../src/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PromotionsService } from '../src/promotions/promotions.service';

/** Dựng các service thật trên PostgreSQL thật (không giả lập CSDL) */
export async function createServices() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const gateway = new MockPaymentGateway();
  const orders = new OrdersService(prisma, new PromotionsService(prisma));
  const payments = new PaymentsService(prisma, gateway);
  return { prisma, gateway, orders, payments };
}

/** Tạo khách và sản phẩm riêng cho từng bài test, xoá sạch sau khi chạy */
export async function createFixture(prisma: PrismaService, stock: number) {
  const tag = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `test-${tag}@brewlite.test`, fullName: 'Người kiểm thử', passwordHash: 'x', loyaltyPoints: 0 },
  });
  const product = await prisma.product.create({
    data: { id: `test-${tag}`, name: `Món test ${tag}`, description: 'test', price: 30000, imageUrl: '', stock, category: 'test', kind: 'drink', keywords: [] },
  });
  const cleanup = async () => {
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.loyaltyTransaction.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.product.delete({ where: { id: product.id } });
  };
  return { user, product, cleanup };
}

export const orderDto = (productId: string, qty = 1, paymentMethod: 'CARD' | 'MOMO' | 'POINTS' = 'CARD') => ({
  items: [{ productId, size: 'S' as const, sugar: 100, ice: 100, toppingIds: [], note: '', qty }],
  fulfillment: 'PICKUP' as const,
  storeId: 'adv',
  pickupTime: 'Lấy ngay',
  paymentMethod,
});

import { randomUUID } from 'crypto';
import { OrdersService } from '../src/orders/orders.service';
import { PaymentsService } from '../src/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PromotionsService } from '../src/promotions/promotions.service';
import { WalletsService } from '../src/wallets/wallets.service';

/** Dựng các service thật trên PostgreSQL thật (không giả lập CSDL) */
export async function createServices() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const wallets = new WalletsService(prisma);
  const orders = new OrdersService(prisma, new PromotionsService(prisma));
  const payments = new PaymentsService(prisma, wallets);
  return { prisma, wallets, orders, payments };
}

/**
 * Tạo khách, sản phẩm và tài khoản ảo (thẻ) riêng cho từng bài test, xoá sạch sau khi chạy.
 * `balance`: số dư ban đầu của thẻ ảo (mặc định đủ lớn để không ảnh hưởng test tồn kho).
 */
export async function createFixture(prisma: PrismaService, stock: number, balance = 10_000_000) {
  const tag = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `test-${tag}@brewlite.test`, fullName: 'Người kiểm thử', passwordHash: 'x', loyaltyPoints: 0 },
  });
  const product = await prisma.product.create({
    data: { id: `test-${tag}`, name: `Món test ${tag}`, description: 'test', price: 30000, imageUrl: '', stock, category: 'test', kind: 'drink', keywords: [] },
  });
  const wallet = await prisma.walletAccount.create({
    data: { userId: user.id, provider: 'CARD', holderName: 'Người kiểm thử', maskedNumber: '•••• 4242', balance },
  });
  const balanceOf = async () => (await prisma.walletAccount.findUniqueOrThrow({ where: { id: wallet.id } })).balance;
  const cleanup = async () => {
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.loyaltyTransaction.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } }); // xoá luôn tài khoản ảo và lịch sử số dư
    await prisma.product.delete({ where: { id: product.id } });
  };
  return { user, product, wallet, balanceOf, cleanup };
}

export const orderDto = (productId: string, qty = 1, paymentMethod: 'CARD' | 'MOMO' | 'POINTS' = 'CARD') => ({
  items: [{ productId, size: 'S' as const, sugar: 100, ice: 100, toppingIds: [], note: '', qty }],
  fulfillment: 'PICKUP' as const,
  pickupTime: 'Lấy ngay',
  paymentMethod,
});

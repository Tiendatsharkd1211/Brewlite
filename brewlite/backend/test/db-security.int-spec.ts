import { createFixture, createServices } from './helpers';

// Rào CSDL (src/db-harden.ts): kiểm tra trên PostgreSQL thật bằng đúng tài khoản app (DATABASE_URL)
describe('Rào CSDL (PostgreSQL thật)', () => {
  let s: Awaited<ReturnType<typeof createServices>>;
  beforeAll(async () => {
    s = await createServices();
  });
  afterAll(async () => {
    await s.prisma.$disconnect();
  });

  it('CHECK constraint chặn tồn kho âm và điểm âm dù câu lệnh đi thẳng vào CSDL', async () => {
    const fx = await createFixture(s.prisma, 5);
    try {
      await expect(s.prisma.product.update({ where: { id: fx.product.id }, data: { stock: -1 } })).rejects.toThrow(/product_stock_nonneg/);
      await expect(s.prisma.user.update({ where: { id: fx.user.id }, data: { loyaltyPoints: -10 } })).rejects.toThrow(/user_points_nonneg/);
      expect((await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } })).stock).toBe(5);
    } finally {
      await fx.cleanup();
    }
  });

  const separateAppAccount = new URL(process.env.DATABASE_URL!).username !== new URL(process.env.DIRECT_URL!).username;
  (separateAppAccount ? it : it.skip)('tài khoản app không xoá bảng, không tạo bảng, không đổi cấu trúc được', async () => {
    await expect(s.prisma.$executeRawUnsafe('DROP TABLE "Payment"')).rejects.toThrow(/must be owner|permission denied/);
    await expect(s.prisma.$executeRawUnsafe('CREATE TABLE hack (id int)')).rejects.toThrow(/permission denied/);
    await expect(s.prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN hack int')).rejects.toThrow(/must be owner|permission denied/);
    await expect(s.prisma.$executeRawUnsafe('TRUNCATE "Order" CASCADE')).rejects.toThrow(/permission denied/);
  });
});

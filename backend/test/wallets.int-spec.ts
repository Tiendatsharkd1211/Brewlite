import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createFixture, createServices } from './helpers';

// Liên kết tài khoản ảo, nạp tiền, huỷ liên kết
describe('Tài khoản ảo liên kết (PostgreSQL thật)', () => {
  let s: Awaited<ReturnType<typeof createServices>>;
  let fx: Awaited<ReturnType<typeof createFixture>>;

  beforeAll(async () => {
    s = await createServices();
    fx = await createFixture(s.prisma, 1);
  });
  afterAll(async () => {
    await fx.cleanup();
    await s.prisma.$disconnect();
  });

  it('liên kết ví MoMo: chỉ lưu số đã che, được cấp số dư ban đầu 200.000đ', async () => {
    const w = await s.wallets.link(fx.user.id, { provider: 'MOMO', accountNumber: '0901 234 567' });
    expect(w).toMatchObject({ provider: 'MOMO', maskedNumber: '090•••4567', balance: 200_000, holderName: 'Người kiểm thử' });
    expect(w.transactions).toHaveLength(1);
    expect(w.transactions?.[0]).toMatchObject({ type: 'OPENING', amount: 200_000 });
  });

  it('không liên kết 2 lần cùng loại ví, không nhận số sai định dạng', async () => {
    await expect(s.wallets.link(fx.user.id, { provider: 'MOMO', accountNumber: '0909999999' })).rejects.toBeInstanceOf(ConflictException);
    await expect(s.wallets.link(fx.user.id, { provider: 'ZALOPAY', accountNumber: '12345' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('nạp tiền cộng đúng số dư, chặn số tiền ngoài giới hạn', async () => {
    const [momo] = (await s.wallets.list(fx.user.id)).filter((w) => w.provider === 'MOMO');
    const after = await s.wallets.topup(fx.user.id, momo.id, 150_000);
    expect(after.balance).toBe(350_000);
    expect(after.transactions?.[0]).toMatchObject({ type: 'TOPUP', amount: 150_000, balanceAfter: 350_000 });
    await expect(s.wallets.topup(fx.user.id, momo.id, 1_000)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('người khác không nạp, không huỷ được tài khoản ảo của mình', async () => {
    const other = await createFixture(s.prisma, 1);
    try {
      await expect(s.wallets.topup(other.user.id, fx.wallet.id, 50_000)).rejects.toBeInstanceOf(NotFoundException);
      await expect(s.wallets.unlink(other.user.id, fx.wallet.id)).rejects.toBeInstanceOf(NotFoundException);
    } finally {
      await other.cleanup();
    }
  });

  it('huỷ liên kết', async () => {
    const [momo] = (await s.wallets.list(fx.user.id)).filter((w) => w.provider === 'MOMO');
    await s.wallets.unlink(fx.user.id, momo.id);
    expect((await s.wallets.list(fx.user.id)).map((w) => w.provider)).toEqual(['CARD']);
  });
});

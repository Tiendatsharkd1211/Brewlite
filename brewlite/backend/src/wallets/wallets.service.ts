import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WalletAccount } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueViolation } from '../prisma/prisma-errors';
import { LinkWalletDto } from './dto/link-wallet.dto';
import {
  BALANCE_MAX,
  insufficientMessage,
  maskAccountNumber,
  OPENING_BALANCE,
  PROVIDER_NAMES,
  validateAccountNumber,
  validateTopup,
  WalletProvider,
} from './wallet-rules';

const WITH_HISTORY = { transactions: { orderBy: { createdAt: 'desc' }, take: 10 } } satisfies Prisma.WalletAccountInclude;
type WalletWithHistory = Prisma.WalletAccountGetPayload<{ include: typeof WITH_HISTORY }>;

/** Thông tin tài khoản ảo trả cho client (không kèm userId) */
export function toWalletView(w: WalletAccount | WalletWithHistory) {
  return {
    id: w.id,
    provider: w.provider,
    holderName: w.holderName,
    maskedNumber: w.maskedNumber,
    balance: w.balance,
    createdAt: w.createdAt,
    ...('transactions' in w ? { transactions: w.transactions.map(({ walletId: _w, ...t }) => t) } : {}),
  };
}

export type DebitResult = { ok: true; wallet: WalletAccount } | { ok: false; reason: string; wallet: WalletAccount | null };

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /wallets: các tài khoản ảo đã liên kết, kèm 10 biến động số dư gần nhất */
  async list(userId: string) {
    const wallets = await this.prisma.walletAccount.findMany({ where: { userId }, include: WITH_HISTORY, orderBy: { createdAt: 'asc' } });
    return wallets.map(toWalletView);
  }

  /** POST /wallets: liên kết tài khoản ảo, được cấp sẵn số dư ban đầu để đặt thử */
  async link(userId: string, dto: LinkWalletDto) {
    const error = validateAccountNumber(dto.provider, dto.accountNumber);
    if (error) throw new BadRequestException(error);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    try {
      const wallet = await this.prisma.walletAccount.create({
        data: {
          userId,
          provider: dto.provider,
          holderName: dto.holderName || user.fullName,
          maskedNumber: maskAccountNumber(dto.provider, dto.accountNumber),
          balance: OPENING_BALANCE,
          transactions: { create: { type: 'OPENING', amount: OPENING_BALANCE, balanceAfter: OPENING_BALANCE, note: 'Số dư ban đầu khi liên kết tài khoản ảo' } },
        },
        include: WITH_HISTORY,
      });
      return toWalletView(wallet);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(`Bạn đã liên kết ${PROVIDER_NAMES[dto.provider]} rồi`);
      throw err;
    }
  }

  /** POST /wallets/:id/topup: nạp thêm tiền (cộng có điều kiện để không vượt số dư tối đa dù bấm liên tục) */
  async topup(userId: string, walletId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.walletAccount.findFirst({ where: { id: walletId, userId } });
      if (!wallet) throw new NotFoundException('Không tìm thấy tài khoản ảo này');
      const error = validateTopup(wallet.balance, amount);
      if (error) throw new BadRequestException(error);
      const res = await tx.walletAccount.updateMany({
        where: { id: wallet.id, balance: { lte: BALANCE_MAX - amount } },
        data: { balance: { increment: amount } },
      });
      if (res.count === 0) throw new BadRequestException(`Số dư tài khoản ảo tối đa ${BALANCE_MAX.toLocaleString('vi-VN')}đ`);
      const fresh = await tx.walletAccount.findUniqueOrThrow({ where: { id: wallet.id } });
      await tx.walletTransaction.create({ data: { walletId: wallet.id, type: 'TOPUP', amount, balanceAfter: fresh.balance, note: 'Nạp tiền vào tài khoản ảo' } });
      return toWalletView(await tx.walletAccount.findUniqueOrThrow({ where: { id: wallet.id }, include: WITH_HISTORY }));
    });
  }

  /** DELETE /wallets/:id: huỷ liên kết */
  async unlink(userId: string, walletId: string) {
    const res = await this.prisma.walletAccount.deleteMany({ where: { id: walletId, userId } });
    if (res.count === 0) throw new NotFoundException('Không tìm thấy tài khoản ảo này');
    return { ok: true };
  }

  /**
   * TRỪ TIỀN khi thanh toán, chạy BÊN TRONG transaction của PaymentsService.
   * UPDATE ... SET balance = balance - amount WHERE id = ? AND balance >= amount
   *  - PostgreSQL khoá dòng ví khi UPDATE nên nhiều đơn trả cùng lúc cũng không làm số dư âm.
   *  - 0 dòng bị ảnh hưởng nghĩa là không đủ số dư: không trừ gì, báo lý do để đơn sang PAYMENT_FAILED.
   * Transaction bị rollback (lỗi bất kỳ) thì lần trừ tiền này cũng bị huỷ theo.
   */
  async debitInTx(tx: Prisma.TransactionClient, userId: string, provider: WalletProvider, amount: number, orderId: string): Promise<DebitResult> {
    const wallet = await tx.walletAccount.findUnique({ where: { userId_provider: { userId, provider } } });
    if (!wallet) return { ok: false, wallet: null, reason: `Bạn chưa liên kết ${PROVIDER_NAMES[provider]}. Vào trang Tài khoản để liên kết rồi thanh toán lại.` };
    const res = await tx.walletAccount.updateMany({ where: { id: wallet.id, balance: { gte: amount } }, data: { balance: { decrement: amount } } });
    const fresh = await tx.walletAccount.findUniqueOrThrow({ where: { id: wallet.id } });
    if (res.count === 0) return { ok: false, wallet: fresh, reason: insufficientMessage(provider, fresh.balance, amount) };
    await tx.walletTransaction.create({
      data: { walletId: wallet.id, type: 'PAYMENT', amount: -amount, balanceAfter: fresh.balance, orderId, note: `Thanh toán đơn ${orderId}` },
    });
    return { ok: true, wallet: fresh };
  }
}

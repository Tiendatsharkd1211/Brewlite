import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateVoucher, VoucherContext } from './voucher-rules';

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Trả về số tiền giảm và có miễn phí ship không. Mã sai thì ném lỗi 400 kèm lý do. */
  async apply(code: string | null | undefined, ctx: VoucherContext, db: Db = this.prisma) {
    if (!code) return { code: null, discount: 0, freeShip: false };
    const normalized = code.trim().toUpperCase();
    const voucher = await db.voucher.findUnique({ where: { code: normalized } });
    const outcome = evaluateVoucher(voucher, ctx);
    if (!outcome.ok) throw new BadRequestException(outcome.reason);
    return { code: normalized, discount: outcome.discount, freeShip: outcome.freeShip };
  }
}

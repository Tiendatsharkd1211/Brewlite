import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LinkWalletDto } from './dto/link-wallet.dto';
import { TopupDto } from './dto/topup.dto';
import { WalletsService } from './wallets.service';

/** Tài khoản ảo liên kết (ví điện tử / thẻ). Mỗi người chỉ thấy và dùng được tài khoản của mình. */
@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  /** GET /wallets: danh sách tài khoản ảo + số dư + lịch sử biến động */
  @Get()
  list(@CurrentUser() user: User) {
    return this.wallets.list(user.id);
  }

  /** POST /wallets: liên kết tài khoản ảo mới { provider, accountNumber, holderName? } */
  @Post()
  link(@CurrentUser() user: User, @Body() dto: LinkWalletDto) {
    return this.wallets.link(user.id, dto);
  }

  /** POST /wallets/:id/topup: nạp tiền { amount } */
  @Post(':id/topup')
  @HttpCode(200)
  topup(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: TopupDto) {
    return this.wallets.topup(user.id, id, dto.amount);
  }

  /** DELETE /wallets/:id: huỷ liên kết */
  @Delete(':id')
  unlink(@CurrentUser() user: User, @Param('id') id: string) {
    return this.wallets.unlink(user.id, id);
  }
}

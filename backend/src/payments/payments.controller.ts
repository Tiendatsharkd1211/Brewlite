import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { clientIp } from './client-ip';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';
import { VnpayGateway } from './vnpay/vnpay.gateway';

const KEY_PATTERN = /^[A-Za-z0-9_.:-]{8,128}$/;

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly vnpay: VnpayGateway,
  ) {}

  /**
   * POST /payments
   * Header bắt buộc: Idempotency-Key: <chuỗi ngẫu nhiên 8–128 ký tự, ví dụ UUID>
   * Body: { orderId, method }
   * VNPAY: trả về payUrl, frontend chuyển khách sang cổng VNPay. POINTS: trừ điểm ngay.
   */
  @Post()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  pay(@CurrentUser() user: User, @Headers('idempotency-key') key: string | undefined, @Body() dto: CreatePaymentDto, @Req() req: Request) {
    if (!key || !KEY_PATTERN.test(key)) {
      throw new BadRequestException('Thiếu header Idempotency-Key hợp lệ (8–128 ký tự, ví dụ một UUID)');
    }
    return this.payments.pay(user.id, key, dto, clientIp(req));
  }

  /** GET /payments/vnpay/status (công khai): backend đã điền mã VNPay chưa, để trang thanh toán báo cho người chạy demo */
  @Get('vnpay/status')
  status() {
    const c = this.vnpay.config;
    return { configured: c !== null, sandbox: c ? c.payUrl.includes('sandbox') : true, returnUrl: c?.returnUrl ?? null };
  }

  /** GET /payments/vnpay/return?vnp_...: trang /payment/vnpay-return của frontend gửi nguyên chuỗi tham số VNPay trả về */
  @Get('vnpay/return')
  @UseGuards(JwtAuthGuard)
  vnpayReturn(@CurrentUser() user: User, @Query() query: Record<string, unknown>) {
    return this.payments.handleReturn(user.id, query);
  }

  /** GET /payments/vnpay/ipn?vnp_...: VNPay gọi thẳng (không có đăng nhập), bảo vệ bằng chữ ký HMAC-SHA512 */
  @Get('vnpay/ipn')
  vnpayIpn(@Query() query: Record<string, unknown>) {
    return this.payments.handleIpn(query);
  }

  /** GET /payments/me: lịch sử giao dịch (khai báo trước ':id') */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: User) {
    return this.payments.findMine(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.payments.findOne(user.id, id);
  }

  /** POST /payments/:id/query: hỏi lại VNPay trạng thái giao dịch (đối soát) */
  @Post(':id/query')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  reconcile(@CurrentUser() user: User, @Param('id') id: string, @Req() req: Request) {
    return this.payments.reconcile(user.id, id, clientIp(req));
  }
}

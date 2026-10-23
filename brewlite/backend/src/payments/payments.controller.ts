import { BadRequestException, Body, Controller, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

const KEY_PATTERN = /^[A-Za-z0-9_.:-]{8,128}$/;

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * POST /payments
   * Header bắt buộc: Idempotency-Key: <chuỗi ngẫu nhiên 8–128 ký tự, ví dụ UUID>
   * Body: { orderId, method }
   * Tiền được trừ thật vào tài khoản ảo đã liên kết ứng với `method` (hoặc trừ điểm nếu method = POINTS).
   */
  @Post()
  @HttpCode(200)
  pay(@CurrentUser() user: User, @Headers('idempotency-key') key: string | undefined, @Body() dto: CreatePaymentDto) {
    if (!key || !KEY_PATTERN.test(key)) {
      throw new BadRequestException('Thiếu header Idempotency-Key hợp lệ (8–128 ký tự, ví dụ một UUID)');
    }
    return this.payments.pay(user.id, key, dto);
  }
}

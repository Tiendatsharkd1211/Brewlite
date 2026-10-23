import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { readVnpayConfig, VnpayGateway } from './vnpay/vnpay.gateway';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    // Đọc VNP_TMN_CODE, VNP_HASH_SECRET... từ .env (ConfigModule đã nạp vào process.env)
    { provide: VnpayGateway, useFactory: () => new VnpayGateway(readVnpayConfig()) },
  ],
})
export class PaymentsModule {}

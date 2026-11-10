import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { StaffController } from './staff.controller';

@Module({
  imports: [OrdersModule],
  controllers: [StaffController],
})
export class StaffModule {}

import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrdersService } from '../orders/orders.service';
import { StaffCancelDto } from '../orders/dto/quote-order.dto';

/** API của quầy pha chế: nhân viên quầy và quản lý gọi được (khách gọi nhận 403) */
@Controller('staff/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF')
export class StaffController {
  constructor(private readonly orders: OrdersService) {}

  /** GET /staff/orders: đơn đã thanh toán đang chờ quầy xử lý */
  @Get()
  queue() {
    return this.orders.findQueue();
  }

  /** POST /staff/orders/:id/advance: chuyển đơn sang bước tiếp theo theo máy trạng thái */
  @Post(':id/advance')
  @HttpCode(200)
  advance(@Param('id') id: string) {
    return this.orders.advance(id);
  }

  /** POST /staff/orders/:id/cancel: huỷ đơn đã thanh toán, chưa pha; hoàn điểm hoặc đánh dấu cần hoàn tiền VNPay */
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id') id: string, @Body() dto: StaffCancelDto) {
    return this.orders.staffCancel(id, dto.reason.trim());
  }
}

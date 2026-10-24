import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

/** Mọi API đơn hàng đều yêu cầu xác thực JWT (@UseGuards) */
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** POST /orders: Tạo đơn hàng mới ở trạng thái PENDING và giữ chỗ tồn kho */
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.id, dto);
  }

  /** GET /orders/me: Lấy lịch sử đơn hàng của người dùng đang đăng nhập (khai báo trước ':id' để tránh xung đột route) */
  @Get('me')
  findMine(@CurrentUser() user: User) {
    return this.orders.findMine(user.id);
  }

  /** GET /orders/:id: Xem chi tiết một đơn hàng theo mã ID */
  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.findOne(user.id, id);
  }

  /** POST /orders/:id/cancel: Khách huỷ đơn chưa thanh toán (hoàn lại tồn kho đã giữ) */
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.cancel(user.id, id);
  }

  /** POST /orders/:id/advance: Chuyển đơn sang bước tiếp theo (PAID → PREPARING → READY → COMPLETED) */
  @Post(':id/advance')
  @HttpCode(200)
  advance(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.advance(user.id, id);
  }
}

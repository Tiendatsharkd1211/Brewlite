import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

/** Mọi API đơn hàng đều cần đăng nhập (JWT); mỗi người chỉ thấy đơn của mình */
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** POST /orders: tạo đơn PENDING, giữ chỗ tồn kho, trả mã đơn */
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.id, dto);
  }

  /** GET /orders/me: lịch sử đơn (khai báo trước ':id' để không bị nhầm 'me' là mã đơn) */
  @Get('me')
  findMine(@CurrentUser() user: User) {
    return this.orders.findMine(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.findOne(user.id, id);
  }
}

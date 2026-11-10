import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { CustomerOnly } from '../auth/customer-only.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { QuoteOrderDto } from './dto/quote-order.dto';
import { OrdersService } from './orders.service';

/** Mọi API đơn hàng chỉ cho khách đã đăng nhập (nhân viên, quản lý nhận 403); mỗi người chỉ thấy đơn của mình */
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** POST /orders/quote: báo giá giỏ hàng (giá, mã giảm giá, còn hàng). Công khai: khách chưa đăng nhập cũng xem được tổng tiền */
  @Post('quote')
  @HttpCode(200)
  quote(@Body() dto: QuoteOrderDto) {
    return this.orders.quote(dto);
  }

  /** POST /orders: tạo đơn PENDING, giữ chỗ tồn kho, trả mã đơn */
  @Post()
  @CustomerOnly()
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.id, dto);
  }

  /** GET /orders/me: lịch sử đơn (khai báo trước ':id' để không bị nhầm 'me' là mã đơn) */
  @Get('me')
  @CustomerOnly()
  findMine(@CurrentUser() user: User) {
    return this.orders.findMine(user.id);
  }

  @Get(':id')
  @CustomerOnly()
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.findOne(user.id, id);
  }

  @Post(':id/cancel')
  @CustomerOnly()
  @HttpCode(200)
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.cancel(user.id, id);
  }
}

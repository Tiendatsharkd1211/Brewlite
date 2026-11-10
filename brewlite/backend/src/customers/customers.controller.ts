import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, ListCustomersDto, LockCustomerDto, UnlockCustomerDto } from './dto';

/** Tài khoản khách, chỉ quản lý cửa hàng. Cố ý không có route xoá. */
@Controller('staff/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  /** GET /staff/customers?q=&status=all|active|locked&sort=new|name&page=1&size=10: một trang danh sách khách */
  @Get()
  findAll(@Query() dto: ListCustomersDto) {
    return this.customers.findAll(dto);
  }

  /** GET /staff/customers/:id: chi tiết, lịch sử khoá */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.findOne(id);
  }

  /** POST /staff/customers: tạo tài khoản cho khách */
  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser() by: User) {
    return this.customers.create(dto, by);
  }

  /** POST /staff/customers/:id/lock: khoá, bắt buộc chọn lý do */
  @Post(':id/lock')
  @HttpCode(200)
  lock(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LockCustomerDto, @CurrentUser() by: User) {
    return this.customers.lock(id, dto, by);
  }

  /** POST /staff/customers/:id/unlock: mở khoá, bắt buộc chọn lý do */
  @Post(':id/unlock')
  @HttpCode(200)
  unlock(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UnlockCustomerDto, @CurrentUser() by: User) {
    return this.customers.unlock(id, dto, by);
  }
}

import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { overview, type Range } from './overview';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BulkProductsDto, CreateProductDto, SaveVoucherDto, SiteContentDto, UpdateProductDto, VoucherActiveDto } from './dto';
import { ManageService } from './manage.service';

/** API công khai: mã giảm giá trên trang Ưu đãi, nội dung trang nhất */
@Controller()
export class PublicContentController {
  constructor(private readonly manage: ManageService) {}

  /** GET /vouchers: mã đang chạy, cho hiện trên trang Ưu đãi */
  @Get('vouchers')
  vouchers() {
    return this.manage.publicVouchers();
  }

  /** GET /content: chữ trang nhất, dải thông báo, khối quảng bá */
  @Get('content')
  content() {
    return this.manage.content();
  }
}

/** API khu Quản lý cửa hàng: chỉ MANAGER (nhân viên quầy, khách nhận 403) */
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
export class ManageController {
  constructor(
    private readonly manage: ManageService,
    private readonly prisma: PrismaService,
  ) {}

  /** GET /staff/overview?range=today|7d|30d: số liệu trang Tổng quan tính từ đơn thật */
  @Get('overview')
  overview(@Query('range') range: string = '7d') {
    if (!['today', '7d', '30d'].includes(range)) throw new BadRequestException('Kỳ xem là today, 7d hoặc 30d');
    return overview(this.prisma, range as Range);
  }

  /** GET /staff/products: mọi món kể cả món ẩn, kèm cờ ẩn / báo hết */
  @Get('products')
  products() {
    return this.manage.products();
  }

  /** POST /staff/products: thêm món */
  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.manage.createProduct(dto);
  }

  /** POST /staff/products/bulk: ẩn, hiện, báo hết, mở bán nhiều món (khai báo trước ':id') */
  @Post('products/bulk')
  bulk(@Body() dto: BulkProductsDto) {
    return this.manage.bulkProducts(dto);
  }

  /** PATCH /staff/products/:id: sửa tên, giá, ảnh, nhãn, ẩn, báo hết */
  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.manage.updateProduct(id, dto);
  }

  /** GET /staff/vouchers: mọi mã */
  @Get('vouchers')
  vouchers() {
    return this.manage.vouchers();
  }

  /** POST /staff/vouchers: tạo mã */
  @Post('vouchers')
  createVoucher(@Body() dto: SaveVoucherDto) {
    return this.manage.saveVoucher(dto);
  }

  /** PUT /staff/vouchers/:code: sửa mã */
  @Put('vouchers/:code')
  updateVoucher(@Param('code') code: string, @Body() dto: SaveVoucherDto) {
    return this.manage.saveVoucher(dto, code.toUpperCase());
  }

  /** PATCH /staff/vouchers/:code/active: tạm dừng / chạy lại */
  @Patch('vouchers/:code/active')
  setActive(@Param('code') code: string, @Body() dto: VoucherActiveDto) {
    return this.manage.setVoucherActive(code.toUpperCase(), dto.active);
  }

  /** DELETE /staff/vouchers/:code: chỉ xoá được mã chưa ai dùng */
  @Delete('vouchers/:code')
  removeVoucher(@Param('code') code: string) {
    return this.manage.removeVoucher(code.toUpperCase());
  }

  /** PUT /staff/content: lưu nội dung trang khách */
  @Put('content')
  saveContent(@Body() dto: SiteContentDto) {
    return this.manage.saveContent(dto);
  }
}

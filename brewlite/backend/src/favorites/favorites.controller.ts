import { Controller, Delete, Get, Param, Put } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { CustomerOnly } from '../auth/customer-only.decorator';
import { FavoritesService } from './favorites.service';

/** Món yêu thích chỉ dành cho người đã đăng nhập; mọi lệnh đều trả lại danh sách mới */
@Controller('favorites')
@CustomerOnly()
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  /** GET /favorites/me: mã các món đã lưu */
  @Get('me')
  findMine(@CurrentUser() user: User) {
    return this.favorites.findMine(user.id);
  }

  /** PUT /favorites/:productId: lưu món (gọi lại nhiều lần vẫn vậy) */
  @Put(':productId')
  add(@CurrentUser() user: User, @Param('productId') productId: string) {
    return this.favorites.add(user.id, productId);
  }

  /** DELETE /favorites/:productId: bỏ món */
  @Delete(':productId')
  remove(@CurrentUser() user: User, @Param('productId') productId: string) {
    return this.favorites.remove(user.id, productId);
  }
}

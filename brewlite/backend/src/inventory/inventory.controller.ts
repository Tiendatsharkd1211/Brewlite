import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateReceiptDto, SaveIngredientDto, SaveRecipeDto } from './dto';
import { InventoryService } from './inventory.service';

/** Kho nguyên liệu: quản lý xem, sửa, nhập kho, sửa công thức */
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /** GET /staff/inventory: nguyên liệu, công thức, phiếu nhập, lịch sử nhập / xuất */
  @Get('inventory')
  snapshot() {
    return this.inventory.snapshot();
  }

  /** POST /staff/ingredients: thêm nguyên liệu */
  @Post('ingredients')
  create(@Body() dto: SaveIngredientDto) {
    return this.inventory.createIngredient(dto);
  }

  /** PUT /staff/ingredients/:id: sửa thông tin, số tồn */
  @Put('ingredients/:id')
  update(@Param('id') id: string, @Body() dto: SaveIngredientDto) {
    return this.inventory.updateIngredient(id, dto);
  }

  /** POST /staff/receipts: lưu phiếu nhập kho */
  @Post('receipts')
  receipt(@Body() dto: CreateReceiptDto, @CurrentUser() by: User) {
    return this.inventory.createReceipt(dto, by);
  }

  /** PUT /staff/recipes/:productId: thay công thức của một món */
  @Put('recipes/:productId')
  recipe(@Param('productId') productId: string, @Body() dto: SaveRecipeDto) {
    return this.inventory.saveRecipe(productId, dto);
  }
}

/** Quầy pha chế xem nguyên liệu sắp hết (nhân viên quầy và quản lý) */
@Controller('staff/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'MANAGER')
export class InventoryAlertsController {
  constructor(private readonly inventory: InventoryService) {}

  /** GET /staff/inventory/alerts */
  @Get('alerts')
  alerts() {
    return this.inventory.alerts();
  }
}

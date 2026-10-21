import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** GET /products?category=pha-may: menu lấy từ PostgreSQL (Task 2) */
  @Get()
  findAll(@Query('category') category?: string) {
    return this.products.findAll(category);
  }

  /** GET /products/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }
}

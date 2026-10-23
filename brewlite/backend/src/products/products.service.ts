import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Bỏ cột version (chỉ dùng nội bộ cho optimistic locking) khỏi dữ liệu trả về */
function toPublic<T extends { version: number }>(product: T): Omit<T, 'version'> {
  const { version: _version, ...rest } = product;
  return rest;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: string) {
    const products = await this.prisma.product.findMany({
      where: category ? { category } : undefined,
      include: { toppings: { orderBy: { price: 'asc' } } },
      orderBy: { sold: 'desc' },
    });
    return products.map(toPublic);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { toppings: { orderBy: { price: 'asc' } } },
    });
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    return toPublic(product);
  }
}

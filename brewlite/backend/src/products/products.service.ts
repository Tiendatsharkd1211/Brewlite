import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { loadRecipeBook } from '../inventory/inventory.service';
import { cupsLeft } from '../inventory/usage';

/**
 * Dữ liệu món cho khách: bỏ cột nội bộ (version, hidden, soldOut);
 * món quản lý báo hết thì trả tồn 0 để giao diện hiện "Hết hàng" (số tồn thật vẫn giữ trong CSDL).
 */
function toPublic<T extends { version: number; hidden: boolean; soldOut: boolean; stock: number }>(product: T) {
  const { version: _version, hidden: _hidden, soldOut, ...rest } = product;
  return { ...rest, stock: soldOut ? 0 : rest.stock };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: string) {
    const products = await this.prisma.product.findMany({
      where: { hidden: false, ...(category ? { category } : {}) },
      include: { toppings: { orderBy: { price: 'asc' } } },
      orderBy: { sold: 'desc' },
    });
    // Số còn bán = ít hơn giữa tồn món và số ly nguyên liệu còn pha được: hết nguyên liệu thì khách thấy "Hết hàng"
    const book = await loadRecipeBook(this.prisma);
    return products.map((p) => {
      const out = toPublic(p);
      const cups = cupsLeft(book.recipes.get(p.id), book.ingredients);
      return cups === null ? out : { ...out, stock: Math.min(out.stock, cups) };
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, hidden: false },
      include: { toppings: { orderBy: { price: 'asc' } } },
    });
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    const book = await loadRecipeBook(this.prisma, [id]);
    const cups = cupsLeft(book.recipes.get(id), book.ingredients);
    const out = toPublic(product);
    return cups === null ? out : { ...out, stock: Math.min(out.stock, cups) };
  }
}

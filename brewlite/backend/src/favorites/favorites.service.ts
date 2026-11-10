import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mã các món yêu thích của một người, món lưu sau đứng trước */
  async findMine(userId: string): Promise<string[]> {
    const rows = await this.prisma.favorite.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { productId: true } });
    return rows.map((r) => r.productId);
  }

  /** Lưu một món; bấm lại món đã lưu thì không báo lỗi */
  async add(userId: string, productId: string): Promise<string[]> {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundException('Không tìm thấy món');
    await this.prisma.favorite.upsert({ where: { userId_productId: { userId, productId } }, create: { userId, productId }, update: {} });
    return this.findMine(userId);
  }

  /** Bỏ một món; chỉ xoá được món của chính mình vì userId nằm trong điều kiện */
  async remove(userId: string, productId: string): Promise<string[]> {
    await this.prisma.favorite.deleteMany({ where: { userId, productId } });
    return this.findMine(userId);
  }
}

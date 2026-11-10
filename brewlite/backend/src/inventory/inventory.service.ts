import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueViolation } from '../prisma/prisma-errors';
import type { CreateReceiptDto, SaveIngredientDto, SaveRecipeDto } from './dto';
import { ingredientNeeds, type UsageItem } from './usage';

type Db = PrismaService | Prisma.TransactionClient;
const round = (n: number) => Math.round(n * 1000) / 1000;
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Đọc công thức và tồn nguyên liệu thành Map để tính (dùng khi đặt đơn, khi quầy pha, khi hiện thực đơn) */
export async function loadRecipeBook(db: Db, productIds?: string[]) {
  const lines = await db.recipeLine.findMany({ where: productIds ? { productId: { in: productIds } } : undefined });
  const ingredients = await db.ingredient.findMany({ where: { id: { in: [...new Set(lines.map((l) => l.ingredientId))] } } });
  const recipes = new Map<string, { ingredientId: string; amount: number }[]>();
  for (const l of lines) recipes.set(l.productId, [...(recipes.get(l.productId) ?? []), l]);
  return { recipes, ingredients: new Map(ingredients.map((i) => [i.id, i])) };
}

/**
 * Quầy bắt đầu pha: trừ nguyên liệu theo công thức, ghi lịch sử "Xuất pha chế" kèm mã đơn.
 * Chạy trong cùng transaction với việc đổi trạng thái đơn. Tồn không bao giờ âm (GREATEST(..., 0)):
 * nếu thực tế quầy còn ít hơn sổ sách, quản lý sửa lại số tồn ở trang Nguyên liệu.
 */
export async function consumeForOrder(tx: Prisma.TransactionClient, orderId: string, items: UsageItem[]) {
  const book = await loadRecipeBook(tx, [...new Set(items.map((i) => i.productId))]);
  const need = ingredientNeeds(items, book.recipes, book.ingredients);
  // Khoá dòng theo thứ tự id để 2 đơn pha cùng lúc không deadlock
  for (const id of [...need.keys()].sort()) {
    const qty = need.get(id)!;
    await tx.$executeRaw`UPDATE "Ingredient" SET "stock" = GREATEST(ROUND(("stock" - ${qty})::numeric, 3)::float8, 0) WHERE "id" = ${id}`;
    await tx.stockMove.create({ data: { ingredientId: id, kind: 'usage', qty: -qty, note: `Pha đơn ${orderId}`, ref: orderId } });
  }
  return need;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Toàn bộ kho cho trang quản lý: nguyên liệu, công thức, 50 phiếu nhập, 300 lần nhập / xuất gần nhất */
  async snapshot() {
    const [ingredients, lines, receipts, moves] = await Promise.all([
      this.prisma.ingredient.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.recipeLine.findMany({ include: { product: { select: { kind: true } } } }),
      this.prisma.receipt.findMany({ orderBy: { at: 'desc' }, take: 50, include: { lines: { select: { ingredientId: true, qty: true, price: true } } } }),
      this.prisma.stockMove.findMany({ orderBy: { at: 'desc' }, take: 300 }),
    ]);
    const recipes = new Map<string, { productId: string; size: string; lines: { ingredientId: string; amount: number }[] }>();
    for (const l of lines) {
      const r = recipes.get(l.productId) ?? { productId: l.productId, size: l.product.kind === 'food' ? '1 cái' : 'M', lines: [] };
      r.lines.push({ ingredientId: l.ingredientId, amount: l.amount });
      recipes.set(l.productId, r);
    }
    return {
      ingredients: ingredients.map(({ createdAt: _c, ...i }) => i),
      recipes: [...recipes.values()],
      receipts,
      movements: moves.map((m) => ({ ...m, ref: m.ref ?? undefined })),
    };
  }

  /** Nguyên liệu sắp hết / đã hết: quầy pha chế xem để báo quản lý */
  async alerts() {
    const rows = await this.prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
    return rows.filter((i) => i.stock <= i.min).map((i) => ({ id: i.id, name: i.name, stock: i.stock, min: i.min, unit: i.unit, out: i.stock <= 0 }));
  }

  async createIngredient(dto: SaveIngredientDto) {
    const id = slug(dto.name);
    if (id.length < 2) throw new BadRequestException('Tên nguyên liệu cần có chữ hoặc số');
    // So theo tên đã bỏ dấu, không phân biệt hoa thường (mã nguyên liệu mẫu không nhất thiết sinh từ tên)
    const names = await this.prisma.ingredient.findMany({ select: { name: true } });
    if (names.some((n) => slug(n.name) === id)) throw new ConflictException('Đã có nguyên liệu trùng tên');
    try {
      const { createdAt: _c, ...row } = await this.prisma.ingredient.create({ data: { id, ...dto, stock: round(dto.stock), min: round(dto.min) } });
      return row;
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Đã có nguyên liệu trùng tên');
      throw err;
    }
  }

  /** Sửa thông tin và số tồn; theo yêu cầu, sửa tay không ghi vào lịch sử kho */
  async updateIngredient(id: string, dto: SaveIngredientDto) {
    const res = await this.prisma.ingredient.updateMany({ where: { id }, data: { ...dto, stock: round(dto.stock), min: round(dto.min) } });
    if (res.count === 0) throw new NotFoundException('Không tìm thấy nguyên liệu này');
    const { createdAt: _c, ...row } = await this.prisma.ingredient.findUniqueOrThrow({ where: { id } });
    return row;
  }

  /**
   * Lưu phiếu nhập: cộng tồn, tính lại giá vốn bình quân gia quyền, ghi lịch sử "Nhập kho".
   * Mã phiếu PN0001 tăng dần; 2 quản lý lưu cùng lúc trùng mã thì thử lại.
   */
  async createReceipt(dto: CreateReceiptDto, by: User) {
    const ids = [...new Set(dto.lines.map((l) => l.ingredientId))];
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const ings = await tx.ingredient.findMany({ where: { id: { in: ids } } });
          if (ings.length !== ids.length) throw new BadRequestException('Có nguyên liệu không tồn tại trong phiếu');
          const last = await tx.receipt.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
          const id = `PN${String((last ? Number(last.id.slice(2)) : 0) + 1).padStart(4, '0')}`;
          await tx.receipt.create({ data: { id, by: by.fullName, note: dto.note, lines: { create: dto.lines.map((l) => ({ ...l, qty: round(l.qty) })) } } });
          for (const ing of ings.sort((a, b) => a.id.localeCompare(b.id))) {
            const mine = dto.lines.filter((l) => l.ingredientId === ing.id);
            const qty = round(mine.reduce((n, l) => n + l.qty, 0));
            const paid = mine.reduce((n, l) => n + l.qty * l.price, 0);
            const before = Math.max(ing.stock, 0);
            const cost = Math.round((before * ing.cost + paid) / (before + qty));
            await tx.ingredient.update({ where: { id: ing.id }, data: { stock: { increment: qty }, cost } });
            await tx.stockMove.create({ data: { ingredientId: ing.id, kind: 'receipt', qty, note: dto.note || 'Phiếu nhập', ref: id } });
          }
          return tx.receipt.findUniqueOrThrow({ where: { id }, include: { lines: { select: { ingredientId: true, qty: true, price: true } } } });
        });
      } catch (err) {
        if (isUniqueViolation(err) && attempt < 5) continue;
        throw err;
      }
    }
  }

  /** Thay toàn bộ công thức của một món */
  async saveRecipe(productId: string, dto: SaveRecipeDto) {
    const ids = dto.lines.map((l) => l.ingredientId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Một nguyên liệu chỉ ghi một dòng trong công thức');
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { kind: true } });
    if (!product) throw new NotFoundException('Không tìm thấy món này');
    if ((await this.prisma.ingredient.count({ where: { id: { in: ids } } })) !== ids.length) throw new BadRequestException('Có nguyên liệu không tồn tại trong công thức');
    await this.prisma.$transaction([
      this.prisma.recipeLine.deleteMany({ where: { productId } }),
      this.prisma.recipeLine.createMany({ data: dto.lines.map((l) => ({ productId, ingredientId: l.ingredientId, amount: l.amount })) }),
    ]);
    return { productId, size: product.kind === 'food' ? '1 cái' : 'M', lines: dto.lines };
  }
}

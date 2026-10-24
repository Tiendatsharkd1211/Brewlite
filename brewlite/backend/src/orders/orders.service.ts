import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { assertTransition, OrderStatus } from './order-state-machine';
import { DELIVERY_FEE, SIZE_EXTRA } from './pricing';

export const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 };

const ORDER_INCLUDE = { items: true } satisfies Prisma.OrderInclude;
const newOrderId = () => `BL${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
  ) {}

  /** Tạo đơn PENDING và trừ tồn kho trong một transaction (Task 6) */
  create(userId: string, dto: CreateOrderDto) {
    return this.prisma.$transaction((tx) => this.createInTx(tx, userId, dto), TX_OPTIONS);
  }

  private async createInTx(tx: Prisma.TransactionClient, userId: string, dto: CreateOrderDto) {
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await tx.product.findMany({ where: { id: { in: ids } }, include: { toppings: true } });
    const byId = new Map(products.map((p) => [p.id, p]));

    // 1. Tính tiền từng dòng theo giá trong CSDL
    const needed = new Map<string, number>();
    let subtotal = 0;
    const items = dto.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) throw new BadRequestException(`Sản phẩm ${item.productId} không tồn tại`);
      const isDrink = product.kind === 'drink';
      const size = isDrink ? (item.size ?? 'M') : null;
      const toppingIds = [...new Set(item.toppingIds)];
      const toppingPrice = toppingIds.reduce((sum, id) => {
        const topping = product.toppings.find((t) => t.id === id);
        if (!topping) throw new BadRequestException(`Topping ${id} không dùng được cho ${product.name}`);
        return sum + topping.price;
      }, 0);
      const unitPrice = product.price + (size ? SIZE_EXTRA[size] : 0) + toppingPrice;
      const lineTotal = unitPrice * item.qty;
      subtotal += lineTotal;
      needed.set(product.id, (needed.get(product.id) ?? 0) + item.qty);
      return {
        productId: product.id,
        productName: product.name,
        size,
        sugar: isDrink ? (item.sugar ?? 100) : null,
        ice: isDrink && product.hasIce ? (item.ice ?? 100) : null,
        toppingIds,
        note: (item.note ?? '').trim(),
        qty: item.qty,
        unitPrice,
        lineTotal,
      };
    });

    // 2. Kiểm tra và trừ tồn kho
    for (const [productId, qty] of needed) {
      const product = byId.get(productId)!;
      if (product.stock < qty) {
        throw new ConflictException(
          product.stock === 0 ? `${product.name} đã hết hàng` : `${product.name} chỉ còn ${product.stock} phần, không đủ ${qty} phần bạn đặt`,
        );
      }
      await tx.product.update({ where: { id: productId }, data: { stock: { decrement: qty } } });
    }

    // 3. Khuyến mãi và phí giao hàng (Task 10.4)
    if (dto.fulfillment === 'DELIVERY' && (dto.address ?? '').trim().length < 8) {
      throw new BadRequestException('Nhập địa chỉ giao hàng đầy đủ');
    }
    const promo = await this.promotions.apply(dto.voucherCode, { subtotal, fulfillment: dto.fulfillment, method: dto.paymentMethod }, tx);
    const fee = dto.fulfillment === 'DELIVERY' && !promo.freeShip ? DELIVERY_FEE : 0;
    const total = Math.max(subtotal + fee - promo.discount, 0);

    return tx.order.create({
      data: {
        id: newOrderId(),
        userId,
        status: 'PENDING',
        subtotal,
        fee,
        discount: promo.discount,
        total,
        voucherCode: promo.code,
        paymentMethod: dto.paymentMethod,
        fulfillment: dto.fulfillment,
        storeId: dto.storeId,
        pickupTime: dto.pickupTime,
        address: dto.fulfillment === 'DELIVERY' ? (dto.address ?? '').trim() : '',
        pickupCode: String(Math.floor(1000 + Math.random() * 9000)),
        items: { create: items },
      },
      include: ORDER_INCLUDE,
    });
  }

  /** GET /orders/me: lịch sử đơn của tài khoản (Task 9) */
  findMine(userId: string) {
    return this.prisma.order.findMany({ where: { userId }, include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  async findOne(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, userId }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn ${id}`);
    return order;
  }
}

/**
 * Đổi trạng thái đơn an toàn:
 *  - assertTransition chặn chuyển tiếp không hợp lệ theo máy trạng thái;
 *  - UPDATE có điều kiện "status vẫn là trạng thái cũ" (compare-and-set) để 2 request đồng thời không cùng đổi.
 */
export async function moveOrderStatus(
  db: Prisma.TransactionClient | PrismaService,
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  data: Omit<Prisma.OrderUpdateManyMutationInput, 'status'> = {},
): Promise<OrderStatus> {
  assertTransition(from, to);
  const res = await db.order.updateMany({ where: { id: orderId, status: from }, data: { ...data, status: to } });
  if (res.count === 0) throw new ConflictException('Đơn hàng vừa được cập nhật bởi một yêu cầu khác, vui lòng tải lại');
  return to;
}

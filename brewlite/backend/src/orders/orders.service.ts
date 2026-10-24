import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { sleep } from '../common/sleep';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueViolation } from '../prisma/prisma-errors';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { assertTransition, HAPPY_PATH_NEXT, OrderStatus } from './order-state-machine';
import { DELIVERY_FEE, SIZE_EXTRA } from './pricing';

/** Thử lại tối đa 8 lần khi đụng độ phiên bản tồn kho (optimistic locking) */
const MAX_ATTEMPTS = 8;
export const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 };

/** Có request khác vừa trừ kho món này trước: kích hoạt retry cả transaction */
export class StockVersionConflict extends Error {
  constructor(public readonly productId: string) {
    super(`Phiên bản tồn kho của ${productId} đã thay đổi`);
  }
}

const ORDER_INCLUDE = { items: true } satisfies Prisma.OrderInclude;
const newOrderId = () => `BL${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
  ) {}

  /**
   * Tạo đơn PENDING và giữ chỗ tồn kho (Task 6 + 10.3).
   * Cơ chế chống bán vượt tồn kho (Over-selling):
   * - Dùng Transaction + Optimistic Locking (cột version).
   * - Nếu đụng độ version, thử lại tối đa 8 lần kèm lùi ngẫu nhiên (jitter backoff).
   * - Nếu kho thực sự không đủ thì ném 409 ngay, không thử lại.
   */
  async create(userId: string, dto: CreateOrderDto) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction((tx) => this.createInTx(tx, userId, dto), TX_OPTIONS);
      } catch (err) {
        const retryable = err instanceof StockVersionConflict || isUniqueViolation(err);
        if (retryable && attempt < MAX_ATTEMPTS) {
          await sleep(5 + Math.random() * 20 * attempt); // lùi ngẫu nhiên để các request tránh đụng nhau tiếp
          continue;
        }
        if (err instanceof StockVersionConflict) {
          throw new ConflictException('Có nhiều khách đang đặt cùng món, vui lòng thử lại');
        }
        throw err;
      }
    }
  }

  private async createInTx(tx: Prisma.TransactionClient, userId: string, dto: CreateOrderDto) {
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await tx.product.findMany({ where: { id: { in: ids } }, include: { toppings: true } });
    const byId = new Map(products.map((p) => [p.id, p]));

    // 1. Tính giá từng món theo dữ liệu trong CSDL (chống giả mạo giá từ client)
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

    // 2. Trừ kho bằng Optimistic Locking. Sắp xếp theo productId (.sort()) để tránh DEADLOCK giữa các transaction.
    for (const productId of [...needed.keys()].sort()) {
      const product = byId.get(productId)!;
      const qty = needed.get(productId)!;
      if (product.stock < qty) {
        throw new ConflictException(
          product.stock === 0 ? `${product.name} đã hết hàng` : `${product.name} chỉ còn ${product.stock} phần, không đủ ${qty} phần bạn đặt`,
        );
      }
      // Chỉ trừ kho khi version chưa bị request khác thay đổi
      const res = await tx.product.updateMany({
        where: { id: productId, version: product.version },
        data: { stock: { decrement: qty }, version: { increment: 1 } },
      });
      if (res.count === 0) throw new StockVersionConflict(productId);
    }

    // 3. Áp dụng voucher khuyến mãi và tính phí giao hàng
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
        pickupTime: dto.pickupTime,
        address: dto.fulfillment === 'DELIVERY' ? (dto.address ?? '').trim() : '',
        items: { create: items },
      },
      include: ORDER_INCLUDE,
    });
  }

  /** GET /orders/me: Lịch sử đơn hàng của user, mới nhất lên đầu */
  findMine(userId: string) {
    return this.prisma.order.findMany({ where: { userId }, include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  async findOne(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, userId }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn ${id}`);
    return order;
  }

  /** Khách huỷ đơn chưa thanh toán: chuyển CANCELLED và hoàn lại số lượng tồn kho (restock) */
  async cancel(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, userId }, include: ORDER_INCLUDE });
      if (!order) throw new NotFoundException(`Không tìm thấy đơn ${id}`);
      if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
        throw new ConflictException('Đơn đã thanh toán hoặc đã kết thúc, vui lòng liên hệ quầy để huỷ');
      }
      await moveOrderStatus(tx, order.id, order.status, 'CANCELLED');
      await tx.payment.updateMany({ where: { orderId: order.id, status: 'PROCESSING' }, data: { status: 'FAILED', failureReason: 'Đơn đã bị huỷ' } });

      // Hoàn lại tồn kho cho các món đã giữ
      const restock = new Map<string, number>();
      for (const item of order.items) restock.set(item.productId, (restock.get(item.productId) ?? 0) + item.qty);
      for (const productId of [...restock.keys()].sort()) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: restock.get(productId)! }, version: { increment: 1 } },
        });
      }
      return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    }, TX_OPTIONS);
  }

  /** Quầy chuyển đơn sang bước tiếp theo: PAID → PREPARING → READY → COMPLETED */
  async advance(userId: string, id: string) {
    const order = await this.findOne(userId, id);
    const next = HAPPY_PATH_NEXT[order.status as OrderStatus];
    if (!next) throw new ConflictException(`Đơn đang ở trạng thái ${order.status}, không có bước tiếp theo`);
    await moveOrderStatus(this.prisma, order.id, order.status as OrderStatus, next);
    return this.findOne(userId, id);
  }
}

/**
 * Đổi trạng thái đơn an toàn (Atomic State Transition):
 * 1. assertTransition: Chặn chuyển trạng thái sai quy tắc.
 * 2. Compare-and-set: updateMany kèm điều kiện `status: from` để tránh race condition khi 2 request cùng đổi status.
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

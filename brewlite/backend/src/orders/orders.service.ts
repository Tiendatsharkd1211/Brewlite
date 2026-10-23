import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { sleep } from '../common/sleep';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueViolation } from '../prisma/prisma-errors';
import { PromotionsService } from '../promotions/promotions.service';
import { isWalletProvider, PROVIDER_NAMES } from '../wallets/wallet-rules';
import { CreateOrderDto } from './dto/create-order.dto';
import { assertTransition, HAPPY_PATH_NEXT, OrderStatus } from './order-state-machine';
import { DELIVERY_FEE, SIZE_EXTRA } from './pricing';

/** Số lần thử lại khi đụng độ phiên bản tồn kho (optimistic locking) */
const MAX_ATTEMPTS = 8;
export const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 };

/** Có người khác vừa trừ kho cùng sản phẩm trước mình: cần thử lại cả transaction */
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
   * Tạo đơn PENDING và GIỮ CHỖ tồn kho (Task 6 + Task 10.3).
   *
   * Kiểm soát tồn kho khi nhiều khách đặt cùng lúc = Transaction + Optimistic Locking:
   *  1. Đọc sản phẩm kèm cột `version`.
   *  2. UPDATE ... SET stock = stock - qty, version = version + 1 WHERE id = ? AND version = <version vừa đọc>.
   *  3. Nếu UPDATE ảnh hưởng 0 dòng => có người khác vừa trừ kho trước => huỷ transaction (rollback) và THỬ LẠI từ đầu.
   *  4. Nếu kho không đủ => báo 409, không thử lại.
   * Nhờ vậy dù 100 người bấm cùng lúc, tổng số đã bán không bao giờ vượt `stock`.
   */
  async create(userId: string, dto: CreateOrderDto) {
    // Trả bằng ví/thẻ thì phải liên kết tài khoản ảo trước (tiền sẽ bị trừ vào tài khoản đó)
    if (isWalletProvider(dto.paymentMethod)) {
      const linked = await this.prisma.walletAccount.findUnique({ where: { userId_provider: { userId, provider: dto.paymentMethod } } });
      if (!linked) {
        throw new BadRequestException(`Bạn chưa liên kết ${PROVIDER_NAMES[dto.paymentMethod]}. Vào trang Tài khoản để liên kết tài khoản ảo trước khi thanh toán.`);
      }
    }
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction((tx) => this.createInTx(tx, userId, dto), TX_OPTIONS);
      } catch (err) {
        const retryable = err instanceof StockVersionConflict || isUniqueViolation(err);
        if (retryable && attempt < MAX_ATTEMPTS) {
          await sleep(5 + Math.random() * 20 * attempt); // lùi ngẫu nhiên để các request không đụng nhau mãi
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

    // 2. Trừ kho có kiểm tra phiên bản. Sắp xếp theo id để 2 đơn luôn khoá dòng cùng thứ tự (tránh deadlock).
    for (const productId of [...needed.keys()].sort()) {
      const product = byId.get(productId)!;
      const qty = needed.get(productId)!;
      if (product.stock < qty) {
        throw new ConflictException(
          product.stock === 0 ? `${product.name} đã hết hàng` : `${product.name} chỉ còn ${product.stock} phần, không đủ ${qty} phần bạn đặt`,
        );
      }
      const res = await tx.product.updateMany({
        where: { id: productId, version: product.version },
        data: { stock: { decrement: qty }, version: { increment: 1 } },
      });
      if (res.count === 0) throw new StockVersionConflict(productId);
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
        pickupTime: dto.pickupTime,
        address: dto.fulfillment === 'DELIVERY' ? (dto.address ?? '').trim() : '',
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

  /** Khách huỷ đơn chưa thanh toán: chuyển CANCELLED và hoàn lại tồn kho đã giữ */
  async cancel(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, userId }, include: ORDER_INCLUDE });
      if (!order) throw new NotFoundException(`Không tìm thấy đơn ${id}`);
      if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
        throw new ConflictException('Đơn đã thanh toán hoặc đã kết thúc, vui lòng liên hệ quầy để huỷ');
      }
      await moveOrderStatus(tx, order.id, order.status, 'CANCELLED');
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

  /** Quầy chuyển đơn sang bước tiếp theo: PAID → PREPARING → READY → COMPLETED (dùng khi demo) */
  async advance(userId: string, id: string) {
    const order = await this.findOne(userId, id);
    const next = HAPPY_PATH_NEXT[order.status as OrderStatus];
    if (!next) throw new ConflictException(`Đơn đang ở trạng thái ${order.status}, không có bước tiếp theo`);
    await moveOrderStatus(this.prisma, order.id, order.status as OrderStatus, next);
    return this.findOne(userId, id);
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

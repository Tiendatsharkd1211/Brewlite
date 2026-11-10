import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { sleep } from '../common/sleep';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueViolation } from '../prisma/prisma-errors';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateOrderDto } from './dto/create-order.dto';
import type { QuoteOrderDto } from './dto/quote-order.dto';
import { evaluateVoucher } from '../promotions/voucher-rules';
import { orderMessage } from '../notifications/order-messages';
import { assertTransition, HAPPY_PATH_NEXT, OrderStatus } from './order-state-machine';
import { DELIVERY_FEE, SIZE_EXTRA } from './pricing';
import { consumeForOrder, loadRecipeBook } from '../inventory/inventory.service';
import { firstShortage, ingredientNeeds } from '../inventory/usage';

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
/** Quầy chỉ cần tên khách để gọi món, không trả email hay điểm của khách */
const STAFF_ORDER_INCLUDE = { items: true, user: { select: { fullName: true } } } satisfies Prisma.OrderInclude;
const QUEUE_STATUSES: OrderStatus[] = ['PAID', 'PREPARING', 'READY'];
/** Đơn chưa thanh toán quá thời gian này thì tự huỷ để trả món về kho (link VNPay chỉ sống 15 phút) */
export const PENDING_TTL_MS = 30 * 60_000;
type Tx = Prisma.TransactionClient;

const newOrderId = () => `BL${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Orders');
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
  ) {}

  /** Mỗi phút dọn đơn bỏ dở (khách đóng tab giữa chừng) để món không bị giữ mãi */
  onModuleInit() {
    this.timer = setInterval(() => void this.expireStale().catch((err) => this.log.warn(`Dọn đơn quá hạn lỗi: ${String(err)}`)), 60_000);
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /**
   * Báo giá cho trang thanh toán: tính giá từng dòng theo CSDL (không tin giá trong giỏ), kiểm tra món còn bán,
   * còn tồn, còn nguyên liệu, và mã giảm giá có áp được không. Không ghi gì, không giữ kho.
   */
  async quote(dto: QuoteOrderDto) {
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({ where: { id: { in: ids } }, include: { toppings: true } });
    const byId = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    const lines = dto.items.map((item) => {
      const p = byId.get(item.productId);
      if (!p || p.hidden) return { productId: item.productId, unitPrice: 0, lineTotal: 0, problem: 'Món này không còn bán' as string | null };
      const size = p.kind === 'drink' ? (item.size ?? 'M') : null;
      let problem: string | null = p.soldOut ? `${p.name} đã hết hàng` : null;
      let toppingPrice = 0;
      for (const id of new Set(item.toppingIds)) {
        const t = p.toppings.find((x) => x.id === id);
        if (t) toppingPrice += t.price;
        else problem ??= `Topping đã chọn không còn dùng được cho ${p.name}`;
      }
      const unitPrice = p.price + (size ? SIZE_EXTRA[size] : 0) + toppingPrice;
      subtotal += unitPrice * item.qty;
      return { productId: p.id, unitPrice, lineTotal: unitPrice * item.qty, problem };
    });
    // Tồn món: cộng các dòng cùng món
    const wanted = new Map<string, number>();
    dto.items.forEach((i) => wanted.set(i.productId, (wanted.get(i.productId) ?? 0) + i.qty));
    for (const [id, qty] of wanted) {
      const p = byId.get(id);
      if (p && !p.hidden && !p.soldOut && p.stock < qty) {
        lines.forEach((l) => l.productId === id && !l.problem && (l.problem = p.stock === 0 ? `${p.name} đã hết hàng` : `${p.name} chỉ còn ${p.stock} phần`));
      }
    }
    // Nguyên liệu: thiếu thì đánh dấu các món dùng nguyên liệu đó
    const book = await loadRecipeBook(this.prisma, ids);
    const short = firstShortage(ingredientNeeds(dto.items.map((i) => ({ productId: i.productId, size: byId.get(i.productId)?.kind === 'drink' ? (i.size ?? 'M') : null, qty: i.qty })), book.recipes, book.ingredients), book.ingredients);
    if (short) {
      lines.forEach((l) => {
        if (!l.problem && book.recipes.get(l.productId)?.some((r) => r.ingredientId === short.id)) l.problem = `Quầy đang hết ${short.name}`;
      });
    }
    // Mã giảm giá: báo lý do nếu không áp được, không ném lỗi
    let voucher: { code: string; ok: boolean; label?: string; message?: string } | null = null;
    let discount = 0;
    let freeShip = false;
    const code = dto.voucherCode?.trim().toUpperCase();
    if (code) {
      const v = await this.prisma.voucher.findUnique({ where: { code } });
      const r = evaluateVoucher(v, { subtotal, fulfillment: dto.fulfillment, method: dto.paymentMethod ?? '' });
      if (r.ok) {
        discount = r.discount;
        freeShip = r.freeShip;
        voucher = { code, ok: true, label: v!.label };
      } else voucher = { code, ok: false, message: r.reason };
    }
    const fee = dto.fulfillment === 'DELIVERY' && !freeShip ? DELIVERY_FEE : 0;
    return { lines, subtotal, fee, discount, total: Math.max(subtotal + fee - discount, 0), voucher, ok: lines.every((l) => !l.problem) };
  }

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
      if (!product || product.hidden) throw new BadRequestException(`Sản phẩm ${item.productId} không tồn tại`);
      if (product.soldOut) throw new ConflictException(`${product.name} đã hết hàng`);
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

    // 2a. Quầy còn đủ nguyên liệu để pha cả đơn không (theo công thức, size quy đổi). Chỉ kiểm tra, chưa trừ:
    //     nguyên liệu bị trừ khi quầy bấm "Bắt đầu pha".
    const book = await loadRecipeBook(tx, ids);
    const short = firstShortage(ingredientNeeds(items, book.recipes, book.ingredients), book.ingredients);
    if (short) throw new ConflictException(`Quầy đang hết ${short.name} nên chưa pha được đơn này, bạn bớt số lượng hoặc chọn món khác`);

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
        throw new ConflictException('Đơn đã thanh toán, quầy sẽ huỷ giúp bạn nếu đơn chưa bắt đầu pha');
      }
      await cancelUnpaid(tx, order.id, order.status, order.items);
      return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    }, TX_OPTIONS);
  }

  /** Tự huỷ đơn chưa thanh toán quá PENDING_TTL_MS (trừ đơn còn link VNPay đang mở), trả món về kho */
  async expireStale(now = new Date()) {
    const stale = await this.prisma.order.findMany({
      where: {
        status: { in: ['PENDING', 'PAYMENT_FAILED'] },
        createdAt: { lt: new Date(now.getTime() - PENDING_TTL_MS) },
        NOT: { payments: { some: { status: 'PROCESSING', expiresAt: { gt: now } } } },
      },
      select: { id: true },
      take: 50,
    });
    let done = 0;
    for (const { id } of stale) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
          const order = await tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
          if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') return; // vừa được thanh toán
          await cancelUnpaid(tx, id, order.status, order.items);
          await tx.notification.create({ data: { userId: order.userId, orderId: id, title: `Đơn ${id} đã tự huỷ`, body: 'Đơn quá 30 phút chưa thanh toán nên được huỷ, món đã trả lại kho. Bạn chưa bị trừ tiền.' } });
        }, TX_OPTIONS);
        done++;
      } catch (err) {
        this.log.warn(`Không huỷ được đơn quá hạn ${id}: ${String(err)}`);
      }
    }
    if (done) this.log.log(`Đã tự huỷ ${done} đơn quá ${PENDING_TTL_MS / 60_000} phút chưa thanh toán`);
    return done;
  }

  /**
   * Quầy huỷ đơn ĐÃ THANH TOÁN nhưng CHƯA PHA (khách đổi ý, quầy hết món...). Đảo ngược mọi thứ lúc thanh toán:
   * trả món về kho, bớt số đã bán, trả lượt mã giảm giá, hoàn điểm đã dùng, thu lại điểm đã tích,
   * giao dịch VNPay chuyển "cần hoàn tiền". Khách nhận thông báo kèm lý do.
   */
  async staffCancel(id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (!order) throw new NotFoundException(`Không tìm thấy đơn ${id}`);
      if (order.status === 'PREPARING' || order.status === 'READY') throw new ConflictException('Đơn đã bắt đầu pha, không huỷ được nữa');
      if (order.status !== 'PAID') throw new ConflictException(`Quầy chỉ huỷ được đơn đã thanh toán và chưa pha (đơn đang ${order.status})`);
      await moveOrderStatus(tx, id, 'PAID', 'CANCELLED');
      await restock(tx, order.items);
      for (const it of order.items) await tx.product.updateMany({ where: { id: it.productId, sold: { gte: it.qty } }, data: { sold: { decrement: it.qty } } });
      if (order.voucherCode) await tx.voucher.updateMany({ where: { code: order.voucherCode, usedCount: { gte: 1 } }, data: { usedCount: { decrement: 1 } } });
      const notes: string[] = [];
      if (order.pointsUsed > 0) {
        await tx.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { increment: order.pointsUsed } } });
        await tx.loyaltyTransaction.create({ data: { userId: order.userId, orderId: id, delta: order.pointsUsed, reason: `Hoàn điểm đơn ${id} bị huỷ` } });
        notes.push(`Đã hoàn ${order.pointsUsed.toLocaleString('vi-VN')} điểm vào tài khoản.`);
      }
      if (order.pointsEarned > 0) {
        // Thu lại điểm đã tích; khách đã tiêu bớt thì chỉ thu phần còn lại (điểm không bao giờ âm)
        const u = await tx.user.findUniqueOrThrow({ where: { id: order.userId }, select: { loyaltyPoints: true } });
        const take = Math.min(u.loyaltyPoints, order.pointsEarned);
        if (take > 0) {
          await tx.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { decrement: take } } });
          await tx.loyaltyTransaction.create({ data: { userId: order.userId, orderId: id, delta: -take, reason: `Thu lại điểm tích của đơn ${id} bị huỷ` } });
        }
      }
      const refund = await tx.payment.updateMany({
        where: { orderId: id, method: 'VNPAY', status: 'SUCCEEDED' },
        data: { status: 'NEEDS_REFUND', failureReason: `Quầy huỷ đơn: ${reason}. Cần hoàn tiền cho khách qua VNPay` },
      });
      if (refund.count) notes.push('Tiền đã trả qua VNPay sẽ được hoàn lại cho bạn.');
      await tx.notification.create({ data: { userId: order.userId, orderId: id, title: `Quầy đã huỷ đơn ${id}`, body: `Lý do: ${reason}. ${notes.join(' ')}`.trim() } });
      return tx.order.findUniqueOrThrow({ where: { id }, include: STAFF_ORDER_INCLUDE });
    }, TX_OPTIONS);
  }

  /** Quầy chuyển đơn sang bước tiếp theo: PAID → PREPARING → READY → COMPLETED (dùng khi demo) */
  /** Hàng đợi của quầy: đơn đã thanh toán, đang pha, chờ lấy; đơn cũ nhất lên trước */
  findQueue() {
    return this.prisma.order.findMany({
      where: { status: { in: QUEUE_STATUSES } },
      include: STAFF_ORDER_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Nhân viên quầy chuyển đơn sang bước tiếp theo (PAID → PREPARING → READY → COMPLETED) */
  async advance(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn ${id}`);
    const next = HAPPY_PATH_NEXT[order.status as OrderStatus];
    if (!next) throw new ConflictException(`Đơn đang ở trạng thái ${order.status}, không có bước tiếp theo`);
    await this.prisma.$transaction(async (tx) => {
      await moveOrderStatus(tx, order.id, order.status as OrderStatus, next);
      // Bắt đầu pha: trừ nguyên liệu theo công thức trong cùng transaction (đổi trạng thái lỗi thì không trừ)
      if (next === 'PREPARING') {
        const items = await tx.orderItem.findMany({ where: { orderId: order.id }, select: { productId: true, size: true, qty: true } });
        await consumeForOrder(tx, order.id, items);
      }
    }, TX_OPTIONS);
    return this.prisma.order.findUniqueOrThrow({ where: { id }, include: STAFF_ORDER_INCLUDE });
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
  // Báo cho khách ngay trong cùng transaction: trạng thái đổi thì chắc chắn có thông báo, rollback thì không có
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, select: { userId: true, fulfillment: true } });
  const message = orderMessage(orderId, to, order.fulfillment);
  if (message) await db.notification.create({ data: { userId: order.userId, orderId, ...message } });
  return to;
}

/** Trả món của đơn về kho (khoá dòng theo thứ tự id để tránh deadlock) */
async function restock(tx: Tx, items: { productId: string; qty: number }[]) {
  const back = new Map<string, number>();
  for (const it of items) back.set(it.productId, (back.get(it.productId) ?? 0) + it.qty);
  for (const productId of [...back.keys()].sort()) {
    await tx.product.update({ where: { id: productId }, data: { stock: { increment: back.get(productId)! }, version: { increment: 1 } } });
  }
}

/** Huỷ đơn chưa thanh toán: CANCELLED, link VNPay đang chờ không dùng nữa, trả món về kho */
async function cancelUnpaid(tx: Tx, orderId: string, from: OrderStatus, items: { productId: string; qty: number }[]) {
  await moveOrderStatus(tx, orderId, from, 'CANCELLED');
  // Nếu khách vẫn trả qua link cũ thì giao dịch được ghi "cần hoàn tiền"
  await tx.payment.updateMany({ where: { orderId, status: 'PROCESSING' }, data: { status: 'FAILED', failureReason: 'Đơn đã bị huỷ' } });
  await restock(tx, items);
}

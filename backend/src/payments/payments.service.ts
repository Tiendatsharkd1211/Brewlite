import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Payment, Prisma } from '@prisma/client';
import { sleep } from '../common/sleep';
import { moveOrderStatus, TX_OPTIONS } from '../orders/orders.service';
import { OrderStatus } from '../orders/order-state-machine';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueViolation } from '../prisma/prisma-errors';
import { pointsEarnedFor, pointsNeededFor } from '../promotions/voucher-rules';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MockPaymentGateway } from './mock-payment.gateway';

export interface PaymentResult {
  payment: Payment;
  order: Prisma.OrderGetPayload<{ include: { items: true } }>;
  /** true = đây là kết quả của lần gửi trước với cùng Idempotency-Key, không trừ tiền lần nữa */
  replayed: boolean;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: MockPaymentGateway,
  ) {}

  /**
   * THANH TOÁN IDEMPOTENT (Task 8 + Task 10.2)
   *
   * Client gửi header `Idempotency-Key` (một chuỗi ngẫu nhiên cho MỖI lần bấm "Thanh toán").
   * Mạng chập chờn khiến request bị gửi lại với CÙNG khoá thì:
   *  - Khoá đã có trong bảng Payment => trả lại đúng kết quả cũ, không gọi cổng thanh toán lần 2.
   *  - Hai request cùng khoá tới ĐỒNG THỜI => cả hai cố INSERT Payment, cột idempotencyKey là UNIQUE
   *    nên CSDL chỉ cho 1 request thắng; request thua đợi request thắng xử lý xong rồi trả cùng kết quả.
   * => Một khoá chỉ trừ tiền tối đa 1 lần và chỉ chuyển đơn sang PAID 1 lần.
   */
  async pay(userId: string, idempotencyKey: string, dto: CreatePaymentDto): Promise<PaymentResult> {
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) return this.replay(existing, userId, dto);

    const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, userId } });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn ${dto.orderId}`);
    if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
      throw new ConflictException(order.status === 'CANCELLED' ? 'Đơn đã bị huỷ' : 'Đơn này đã được thanh toán');
    }
    if (dto.method !== order.paymentMethod) {
      throw new BadRequestException('Phương thức thanh toán khác với lúc tạo đơn, hãy tạo lại đơn');
    }

    // Bước "giành khoá": UNIQUE(idempotencyKey) bảo đảm chỉ 1 request đi tiếp
    let payment: Payment;
    try {
      payment = await this.prisma.payment.create({
        data: { orderId: order.id, idempotencyKey, amount: order.total, method: dto.method },
      });
    } catch (err) {
      if (isUniqueViolation(err)) return this.replay(await this.waitUntilSettled(idempotencyKey), userId, dto);
      throw err;
    }

    // Gọi cổng thanh toán ngoài transaction (gọi mạng lâu, không nên giữ khoá CSDL)
    let outcome: { success: boolean; reason?: string };
    if (dto.method === 'POINTS') {
      outcome = { success: true }; // trừ điểm làm trong transaction bên dưới
    } else {
      try {
        outcome = await this.gateway.charge({ amount: order.total, method: dto.method, reference: idempotencyKey, simulate: dto.simulate });
      } catch {
        outcome = { success: false, reason: 'Cổng thanh toán không phản hồi' };
      }
    }

    const settled = await this.prisma.$transaction((tx) => this.settle(tx, payment.id, order.id, userId, outcome), TX_OPTIONS);
    return { ...settled, replayed: false };
  }

  /** Ghi kết quả: cập nhật Payment, chuyển trạng thái đơn theo máy trạng thái, cộng/trừ điểm, đếm lượt dùng mã */
  private async settle(tx: Prisma.TransactionClient, paymentId: string, orderId: string, userId: string, outcome: { success: boolean; reason?: string }) {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });

    // Một giao dịch khác đã thanh toán đơn này trước (khác khoá): không được PAID lần 2
    if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED', failureReason: 'Đơn đã được thanh toán bởi giao dịch khác, giao dịch này sẽ được hoàn tiền' },
      });
      return { payment, order };
    }

    let success = outcome.success;
    let reason = outcome.reason ?? null;
    let pointsUsed = 0;
    if (success && order.paymentMethod === 'POINTS') {
      pointsUsed = pointsNeededFor(order.total);
      // Trừ có điều kiện "còn đủ điểm": không bao giờ âm điểm dù bấm liên tục
      const res = await tx.user.updateMany({ where: { id: userId, loyaltyPoints: { gte: pointsUsed } }, data: { loyaltyPoints: { decrement: pointsUsed } } });
      if (res.count === 0) {
        success = false;
        reason = 'Không đủ điểm BrewLite để thanh toán đơn này';
        pointsUsed = 0;
      } else {
        await tx.loyaltyTransaction.create({ data: { userId, orderId, delta: -pointsUsed, reason: `Thanh toán đơn ${orderId}` } });
      }
    }

    // Máy trạng thái: PAYMENT_FAILED phải quay lại PENDING ("thử lại") trước khi sang PAID / PAYMENT_FAILED
    let from = order.status as OrderStatus;
    if (from === 'PAYMENT_FAILED') from = await moveOrderStatus(tx, orderId, from, 'PENDING');
    const pointsEarned = success && order.paymentMethod !== 'POINTS' ? pointsEarnedFor(order.total) : 0;
    await moveOrderStatus(tx, orderId, from, success ? 'PAID' : 'PAYMENT_FAILED', success ? { pointsEarned, pointsUsed } : {});

    if (success) {
      // Điểm thưởng (Task 10.4): chỉ cộng khi đơn đã PAID
      if (pointsEarned > 0) {
        await tx.user.update({ where: { id: userId }, data: { loyaltyPoints: { increment: pointsEarned } } });
        await tx.loyaltyTransaction.create({ data: { userId, orderId, delta: pointsEarned, reason: `Tích điểm đơn ${orderId}` } });
      }
      if (order.voucherCode) {
        await tx.voucher.update({ where: { code: order.voucherCode }, data: { usedCount: { increment: 1 } } });
      }
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { sold: { increment: item.qty } } });
      }
    }

    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: success ? 'SUCCEEDED' : 'FAILED', failureReason: success ? null : reason },
    });
    const fresh = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    return { payment, order: fresh };
  }

  /** Trả lại kết quả của lần gửi trước với cùng khoá */
  private async replay(payment: Payment, userId: string, dto: CreatePaymentDto): Promise<PaymentResult> {
    if (payment.orderId !== dto.orderId || payment.method !== dto.method) {
      throw new UnprocessableEntityException('Idempotency-Key này đã được dùng cho một yêu cầu thanh toán khác');
    }
    const settled = payment.status === 'PROCESSING' ? await this.waitUntilSettled(payment.idempotencyKey) : payment;
    const order = await this.prisma.order.findFirst({ where: { id: settled.orderId, userId }, include: { items: true } });
    if (!order) throw new UnprocessableEntityException('Idempotency-Key không hợp lệ');
    return { payment: settled, order, replayed: true };
  }

  /** Request "thua" đợi request "thắng" xử lý xong (tối đa ~10 giây) */
  private async waitUntilSettled(idempotencyKey: string): Promise<Payment> {
    for (let i = 0; i < 100; i++) {
      const payment = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
      if (payment && payment.status !== 'PROCESSING') return payment;
      await sleep(100);
    }
    throw new ConflictException('Giao dịch đang được xử lý, vui lòng thử lại sau giây lát');
  }
}

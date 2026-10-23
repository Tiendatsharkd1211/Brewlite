import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Payment, Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import { sleep } from '../common/sleep';
import { moveOrderStatus, TX_OPTIONS } from '../orders/orders.service';
import { OrderStatus } from '../orders/order-state-machine';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueViolation } from '../prisma/prisma-errors';
import { pointsEarnedFor, pointsNeededFor } from '../promotions/voucher-rules';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VnpayGateway } from './vnpay/vnpay.gateway';
import { describeResponseCode, isPaidResult, parseVnpDate, QUERY_MESSAGES, TRANSACTION_STATUS_MESSAGES, VnpParams } from './vnpay/vnpay.util';

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;
type Tx = Prisma.TransactionClient;
type LogSource = 'CREATE' | 'RETURN' | 'IPN' | 'QUERY';

export interface PaymentResult {
  payment: Payment;
  order: OrderWithItems;
  /** Link sang cổng VNPay: frontend chuyển trình duyệt sang link này. null khi trả bằng điểm hoặc giao dịch đã xong */
  payUrl: string | null;
  /** true = kết quả của lần gửi trước với cùng Idempotency-Key, không tạo giao dịch mới */
  replayed: boolean;
}

/** Kết quả ghi nhận một thông báo của VNPay (dùng chung cho Return URL, IPN và truy vấn đối soát) */
type ApplyOutcome =
  | { kind: 'NOT_FOUND' }
  | { kind: 'BAD_AMOUNT'; payment: Payment }
  | { kind: 'ALREADY' | 'APPLIED'; payment: Payment; order: OrderWithItems };

const fmt = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const isPayable = (status: string) => status === 'PENDING' || status === 'PAYMENT_FAILED';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpay: VnpayGateway,
  ) {}

  /**
   * POST /payments — bắt đầu thanh toán một đơn (Task 8 + Task 10.2)
   *
   * Client gửi header `Idempotency-Key` (chuỗi ngẫu nhiên cho MỖI lần bấm "Thanh toán").
   * Mạng chập chờn khiến request bị gửi lại với CÙNG khoá thì trả lại đúng giao dịch cũ:
   * cột idempotencyKey là UNIQUE nên dù 2 request tới cùng lúc, CSDL cũng chỉ cho 1 request tạo giao dịch.
   *  - VNPAY: tạo giao dịch PROCESSING kèm link đã ký sang cổng VNPay; tiền chỉ bị trừ khi khách trả trên trang VNPay.
   *  - POINTS: trừ điểm ngay trong 1 transaction.
   */
  async pay(userId: string, idempotencyKey: string, dto: CreatePaymentDto, ipAddr: string): Promise<PaymentResult> {
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) return this.replay(existing, userId, dto);

    const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, userId } });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn ${dto.orderId}`);
    assertPayable(order.status);
    if (dto.method !== order.paymentMethod) {
      throw new BadRequestException('Phương thức thanh toán khác với lúc tạo đơn, hãy tạo lại đơn');
    }
    return dto.method === 'VNPAY' ? this.startVnpay(userId, idempotencyKey, order, ipAddr, dto) : this.payWithPoints(userId, idempotencyKey, order, dto);
  }

  // ---------------------------------------------------------------- VNPay

  /** Tạo giao dịch PROCESSING và link thanh toán VNPay (hết hạn sau 15 phút) */
  private async startVnpay(userId: string, idempotencyKey: string, order: { id: string; total: number }, ipAddr: string, dto: CreatePaymentDto) {
    const txnRef = `${order.id}_${randomInt(100_000, 1_000_000)}`; // không trùng trong ngày theo yêu cầu VNPay
    const link = this.vnpay.createPaymentLink({ txnRef, amount: order.total, orderInfo: `Thanh toan don hang ${order.id} tai BrewLite`, ipAddr, now: new Date() });
    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        await lockOrder(tx, order.id);
        const current = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
        assertPayable(current.status);
        // Đơn đang PAYMENT_FAILED: khách "thử lại" => quay về PENDING theo máy trạng thái
        if (current.status === 'PAYMENT_FAILED') await moveOrderStatus(tx, order.id, 'PAYMENT_FAILED', 'PENDING');
        return tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey,
            amount: order.total,
            method: 'VNPAY',
            txnRef,
            payUrl: link.url,
            vnpCreateDate: link.createDate,
            expiresAt: link.expiresAt,
            logs: { create: { source: 'CREATE', message: `Tạo link thanh toán VNPay ${fmt(order.total)}, hết hạn sau 15 phút`, data: link.params } },
          },
        });
      }, TX_OPTIONS);
      return { payment, order: await this.orderOf(payment.orderId), payUrl: link.url, replayed: false };
    } catch (err) {
      // Request trùng khoá tới cùng lúc: request thua trả lại giao dịch của request thắng
      if (isUniqueViolation(err)) {
        const winner = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
        if (winner) return this.replay(winner, userId, dto);
      }
      throw err;
    }
  }

  /**
   * GET /payments/vnpay/return — VNPay chuyển trình duyệt của khách về kèm kết quả.
   * Máy local không nhận được IPN (VNPay không gọi được localhost) nên kết quả ở đây cũng được ghi nhận,
   * nhưng CHỈ sau khi kiểm tra chữ ký HMAC-SHA512 và số tiền. Return và IPN dùng chung applyResult (idempotent).
   */
  async handleReturn(userId: string, query: Record<string, unknown>) {
    const { valid, params } = this.vnpay.verify(query);
    if (!valid) throw new BadRequestException('Chữ ký VNPay không hợp lệ: dữ liệu có thể đã bị sửa nên BrewLite không ghi nhận');
    const owned = params.vnp_TxnRef ? await this.prisma.payment.findFirst({ where: { txnRef: params.vnp_TxnRef, order: { userId } } }) : null;
    if (!owned) throw new NotFoundException('Không tìm thấy giao dịch này trong tài khoản của bạn');
    const outcome = await this.applyResult(params, 'RETURN');
    if (outcome.kind === 'BAD_AMOUNT') throw new BadRequestException('Số tiền VNPay báo về không khớp với đơn, BrewLite không ghi nhận');
    if (outcome.kind === 'NOT_FOUND') throw new NotFoundException('Không tìm thấy giao dịch');
    return { payment: outcome.payment, order: outcome.order, responseCode: params.vnp_ResponseCode ?? null, message: describeResponseCode(params.vnp_ResponseCode) };
  }

  /**
   * GET /payments/vnpay/ipn — VNPay gọi thẳng vào máy chủ BrewLite (server-to-server) để báo kết quả.
   * Trả JSON { RspCode, Message } đúng tài liệu VNPay. VNPay gọi lại tối đa 10 lần nếu không nhận 00 hoặc 02.
   */
  async handleIpn(query: Record<string, unknown>): Promise<{ RspCode: string; Message: string }> {
    try {
      if (!this.vnpay.configured) return { RspCode: '99', Message: 'Merchant not configured' };
      const { valid, params } = this.vnpay.verify(query);
      if (!valid) return { RspCode: '97', Message: 'Invalid signature' };
      const outcome = await this.applyResult(params, 'IPN');
      switch (outcome.kind) {
        case 'NOT_FOUND':
          return { RspCode: '01', Message: 'Order not found' };
        case 'BAD_AMOUNT':
          return { RspCode: '04', Message: 'Invalid amount' };
        case 'ALREADY':
          return { RspCode: '02', Message: 'Order already confirmed' };
        default:
          return { RspCode: '00', Message: 'Confirm Success' };
      }
    } catch {
      return { RspCode: '99', Message: 'Unknown error' };
    }
  }

  /**
   * POST /payments/:id/query — đối soát: hỏi lại VNPay (API querydr) trạng thái thật của giao dịch
   * rồi ghi nhận nếu BrewLite chưa có kết quả (ví dụ khách đóng trình duyệt trước khi quay về).
   */
  async reconcile(userId: string, paymentId: string, ipAddr: string) {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, order: { userId } } });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch');
    if (payment.method !== 'VNPAY' || !payment.txnRef || !payment.vnpCreateDate) throw new BadRequestException('Chỉ đối soát được giao dịch VNPay');

    const { request, data, valid } = await this.vnpay.query({ txnRef: payment.txnRef, transactionDate: payment.vnpCreateDate, ipAddr, now: new Date() });
    const raw = { request, response: data } as Prisma.InputJsonValue;
    const code = String(data.vnp_ResponseCode ?? '');
    const status = String(data.vnp_TransactionStatus ?? '');
    let message: string;

    if (!valid) {
      message = `Phản hồi truy vấn sai chữ ký (mã ${code || '?'}: ${QUERY_MESSAGES[code] ?? String(data.vnp_Message ?? '')}), không cập nhật`;
      await this.log(this.prisma, payment.id, 'QUERY', message, raw);
    } else if (code === '00' && status !== '' && status !== '01') {
      // VNPay đã có kết quả cuối cùng: ghi nhận như một thông báo đã ký
      const params: VnpParams = {
        vnp_TxnRef: payment.txnRef,
        vnp_Amount: String(data.vnp_Amount ?? ''),
        vnp_ResponseCode: status === '00' ? '00' : '99',
        vnp_TransactionStatus: status,
        vnp_TransactionNo: String(data.vnp_TransactionNo ?? ''),
        vnp_BankCode: String(data.vnp_BankCode ?? ''),
        vnp_PayDate: String(data.vnp_PayDate ?? ''),
      };
      const outcome = await this.applyResult(params, 'QUERY', raw);
      if (outcome.kind === 'ALREADY') {
        const same = (status === '00') === (outcome.payment.vnpTransactionStatus === '00');
        message = same
          ? 'VNPay xác nhận kết quả khớp với BrewLite'
          : `VNPay báo "${TRANSACTION_STATUS_MESSAGES[status] ?? status}" nhưng BrewLite đã ghi kết quả khác: cần kiểm tra thủ công trên trang quản trị VNPay`;
      } else if (outcome.kind === 'BAD_AMOUNT') {
        message = 'Số tiền VNPay báo khác số tiền giao dịch: không cập nhật';
      } else {
        message = `VNPay: ${TRANSACTION_STATUS_MESSAGES[status] ?? status}`;
      }
    } else {
      const expired = payment.status === 'PROCESSING' && payment.expiresAt !== null && payment.expiresAt < new Date();
      message = code === '00' ? `VNPay: ${TRANSACTION_STATUS_MESSAGES[status] ?? 'chưa có kết quả'}` : `VNPay: ${QUERY_MESSAGES[code] ?? String(data.vnp_Message ?? code)}`;
      if (expired && (code === '91' || status === '01')) {
        message = 'Link đã hết hạn và khách chưa thanh toán trên VNPay: không bị trừ tiền';
        await this.expire(payment, message, raw);
      } else {
        await this.log(this.prisma, payment.id, 'QUERY', message, raw);
      }
    }
    return { ...(await this.findOne(userId, paymentId)), message };
  }

  /**
   * Ghi nhận kết quả VNPay vào CSDL — idempotent, an toàn khi Return và IPN tới cùng lúc:
   *  1. Không tìm thấy vnp_TxnRef => NOT_FOUND. Số tiền khác => BAD_AMOUNT (không ghi gì vào đơn).
   *  2. Khoá dòng đơn hàng (SELECT ... FOR UPDATE) để các thông báo cho cùng đơn xếp hàng lần lượt.
   *  3. Giao dịch đã có kết quả VNPay rồi => ALREADY, không cộng điểm / không đổi trạng thái lần 2.
   *  4. Thành công: đơn còn chờ thanh toán => PAID; đơn đã PAID bằng giao dịch khác hoặc đã huỷ => NEEDS_REFUND.
   *  5. Thất bại: giao dịch FAILED; nếu là lần thanh toán mới nhất thì đơn sang PAYMENT_FAILED.
   */
  private async applyResult(params: VnpParams, source: LogSource, raw: Prisma.InputJsonValue = params): Promise<ApplyOutcome> {
    const found = params.vnp_TxnRef ? await this.prisma.payment.findUnique({ where: { txnRef: params.vnp_TxnRef } }) : null;
    if (!found) return { kind: 'NOT_FOUND' };
    const amount = Number(params.vnp_Amount) / 100;
    if (amount !== found.amount) {
      await this.log(this.prisma, found.id, source, `Số tiền VNPay báo (${params.vnp_Amount ?? '?'} / 100) khác số tiền giao dịch ${fmt(found.amount)}: không ghi nhận`, raw);
      return { kind: 'BAD_AMOUNT', payment: found };
    }

    return this.prisma.$transaction(async (tx) => {
      await lockOrder(tx, found.orderId);
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: found.id } });
      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: { items: true } });
      const where = source === 'RETURN' ? 'VNPay chuyển khách về' : source === 'IPN' ? 'IPN' : 'Đối soát';

      if (payment.vnpTransactionStatus !== null) {
        await this.log(tx, payment.id, source, `${where} (mã ${params.vnp_ResponseCode ?? '?'}): kết quả đã được ghi nhận trước đó, không xử lý lại`, raw);
        return { kind: 'ALREADY' as const, payment, order };
      }

      const vnp = {
        vnpResponseCode: params.vnp_ResponseCode || null,
        vnpTransactionStatus: params.vnp_TransactionStatus || '',
        vnpTransactionNo: params.vnp_TransactionNo || null,
        vnpBankCode: params.vnp_BankCode || null,
        vnpBankTranNo: params.vnp_BankTranNo || null,
        vnpCardType: params.vnp_CardType || null,
        vnpPayDate: params.vnp_PayDate || null,
      };

      if (isPaidResult(params)) {
        const paidAt = parseVnpDate(params.vnp_PayDate) ?? new Date();
        if (isPayable(order.status)) {
          await markPaid(tx, order);
          await tx.payment.update({ where: { id: payment.id }, data: { ...vnp, status: 'SUCCEEDED', failureReason: null, paidAt } });
          // Các link khác của đơn này không dùng nữa
          await tx.payment.updateMany({
            where: { orderId: order.id, status: 'PROCESSING', id: { not: payment.id } },
            data: { status: 'FAILED', failureReason: `Không dùng nữa: đơn đã thanh toán bằng giao dịch ${payment.txnRef}` },
          });
          await this.log(tx, payment.id, source, `${where}: thanh toán thành công ${fmt(amount)}, mã GD VNPay ${vnp.vnpTransactionNo ?? '?'}, ngân hàng ${vnp.vnpBankCode ?? '?'}. Đơn chuyển sang PAID`, raw);
        } else {
          const reason =
            order.status === 'CANCELLED'
              ? 'VNPay đã trừ tiền nhưng đơn đã bị huỷ trước đó: cần hoàn tiền cho khách'
              : 'VNPay đã trừ tiền nhưng đơn đã được thanh toán bằng giao dịch khác (khách trả 2 lần): cần hoàn tiền';
          await tx.payment.update({ where: { id: payment.id }, data: { ...vnp, status: 'NEEDS_REFUND', failureReason: reason, paidAt } });
          await this.log(tx, payment.id, source, `${where}: ${reason}`, raw);
        }
      } else {
        const reason = describeResponseCode(params.vnp_ResponseCode);
        await tx.payment.update({ where: { id: payment.id }, data: { ...vnp, status: 'FAILED', failureReason: reason } });
        await this.failOrderIfLatest(tx, payment, order.status as OrderStatus);
        await this.log(tx, payment.id, source, `${where}: thanh toán không thành công (mã ${params.vnp_ResponseCode ?? '?'}: ${reason}), không bị trừ tiền`, raw);
      }

      const fresh = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      const freshOrder = await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
      return { kind: 'APPLIED' as const, payment: fresh, order: freshOrder };
    }, TX_OPTIONS);
  }

  /** Link hết hạn mà khách chưa trả: đánh dấu FAILED (vẫn chưa có kết quả VNPay nên nếu VNPay báo sau vẫn ghi nhận được) */
  private async expire(payment: Payment, message: string, raw: Prisma.InputJsonValue) {
    await this.prisma.$transaction(async (tx) => {
      await lockOrder(tx, payment.orderId);
      const res = await tx.payment.updateMany({ where: { id: payment.id, status: 'PROCESSING' }, data: { status: 'FAILED', failureReason: 'Link thanh toán đã hết hạn' } });
      if (res.count > 0) {
        const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
        await this.failOrderIfLatest(tx, payment, order.status as OrderStatus);
      }
      await this.log(tx, payment.id, 'QUERY', message, raw);
    }, TX_OPTIONS);
  }

  /** Chỉ lần thanh toán MỚI NHẤT của đơn mới kéo đơn sang PAYMENT_FAILED; link cũ lỗi không ảnh hưởng link mới */
  private async failOrderIfLatest(tx: Tx, payment: Payment, orderStatus: OrderStatus) {
    const latest = await tx.payment.findFirst({ where: { orderId: payment.orderId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    if (latest?.id === payment.id && orderStatus === 'PENDING') {
      await moveOrderStatus(tx, payment.orderId, 'PENDING', 'PAYMENT_FAILED');
    }
  }

  // ---------------------------------------------------------------- Điểm BrewLite

  /** Trả bằng điểm: trừ điểm và chuyển đơn sang PAID ngay trong 1 transaction */
  private async payWithPoints(userId: string, idempotencyKey: string, order: { id: string; total: number }, dto: CreatePaymentDto): Promise<PaymentResult> {
    let payment: Payment;
    try {
      payment = await this.prisma.payment.create({ data: { orderId: order.id, idempotencyKey, amount: order.total, method: 'POINTS' } });
    } catch (err) {
      if (isUniqueViolation(err)) return this.replay(await this.waitUntilSettled(idempotencyKey), userId, dto);
      throw err;
    }
    try {
      const settled = await this.prisma.$transaction(async (tx) => {
        await lockOrder(tx, order.id);
        const current = await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
        if (!isPayable(current.status)) {
          return tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: 'Đơn đã được thanh toán bởi giao dịch khác' } });
        }
        const pointsUsed = pointsNeededFor(current.total);
        // Trừ có điều kiện "còn đủ điểm": không bao giờ âm điểm dù bấm liên tục
        const res = await tx.user.updateMany({ where: { id: userId, loyaltyPoints: { gte: pointsUsed } }, data: { loyaltyPoints: { decrement: pointsUsed } } });
        if (res.count === 0) {
          let from = current.status as OrderStatus;
          if (from === 'PAYMENT_FAILED') from = await moveOrderStatus(tx, order.id, from, 'PENDING');
          await moveOrderStatus(tx, order.id, from, 'PAYMENT_FAILED');
          return tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: 'Không đủ điểm BrewLite để thanh toán đơn này' } });
        }
        await tx.loyaltyTransaction.create({ data: { userId, orderId: order.id, delta: -pointsUsed, reason: `Thanh toán đơn ${order.id}` } });
        await markPaid(tx, current, pointsUsed);
        return tx.payment.update({ where: { id: payment.id }, data: { status: 'SUCCEEDED', paidAt: new Date() } });
      }, TX_OPTIONS);
      return { payment: settled, order: await this.orderOf(order.id), payUrl: null, replayed: false };
    } catch (err) {
      // Transaction đã rollback nên chưa trừ điểm nào; đánh dấu thất bại để lần gửi lại không phải chờ
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: 'Máy chủ chưa xử lý được giao dịch, bạn chưa bị trừ điểm' } }).catch(() => undefined);
      throw err;
    }
  }

  // ---------------------------------------------------------------- Lịch sử giao dịch

  /** GET /payments/me — lịch sử giao dịch của tài khoản, mới nhất trước */
  findMine(userId: string) {
    return this.prisma.payment.findMany({
      where: { order: { userId } },
      include: { order: { select: { id: true, status: true, total: true, createdAt: true, fulfillment: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** GET /payments/:id — chi tiết một giao dịch kèm nhật ký trao đổi với VNPay */
  async findOne(userId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, order: { userId } },
      include: { order: { include: { items: true } }, logs: { orderBy: { createdAt: 'asc' } } },
    });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch');
    return payment;
  }

  // ---------------------------------------------------------------- Hàm phụ

  private orderOf(orderId: string) {
    return this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  }

  private async log(db: Tx | PrismaService, paymentId: string, source: LogSource, message: string, data: Prisma.InputJsonValue) {
    await db.paymentLog.create({ data: { paymentId, source, message, data } });
  }

  /** Trả lại kết quả của lần gửi trước với cùng khoá */
  private async replay(payment: Payment, userId: string, dto: CreatePaymentDto): Promise<PaymentResult> {
    if (payment.orderId !== dto.orderId || payment.method !== dto.method) {
      throw new UnprocessableEntityException('Idempotency-Key này đã được dùng cho một yêu cầu thanh toán khác');
    }
    const settled = payment.method === 'POINTS' && payment.status === 'PROCESSING' ? await this.waitUntilSettled(payment.idempotencyKey) : payment;
    const order = await this.prisma.order.findFirst({ where: { id: settled.orderId, userId }, include: { items: true } });
    if (!order) throw new UnprocessableEntityException('Idempotency-Key không hợp lệ');
    return { payment: settled, order, payUrl: settled.status === 'PROCESSING' ? settled.payUrl : null, replayed: true };
  }

  /** Request "thua" đợi request "thắng" trừ điểm xong (tối đa ~10 giây) */
  private async waitUntilSettled(idempotencyKey: string): Promise<Payment> {
    for (let i = 0; i < 100; i++) {
      const payment = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
      if (payment && payment.status !== 'PROCESSING') return payment;
      await sleep(100);
    }
    throw new ConflictException('Giao dịch đang được xử lý, vui lòng thử lại sau giây lát');
  }
}

function assertPayable(status: string) {
  if (!isPayable(status)) throw new ConflictException(status === 'CANCELLED' ? 'Đơn đã bị huỷ' : 'Đơn này đã được thanh toán');
}

/** Khoá dòng đơn hàng: mọi thao tác thanh toán trên cùng 1 đơn phải xếp hàng, không chạy chồng lên nhau */
async function lockOrder(tx: Tx, orderId: string) {
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
}

/** Đơn sang PAID theo máy trạng thái, cộng điểm thưởng, đếm lượt dùng mã, tăng số đã bán */
async function markPaid(tx: Tx, order: OrderWithItems, pointsUsed = 0) {
  let from = order.status as OrderStatus;
  if (from === 'PAYMENT_FAILED') from = await moveOrderStatus(tx, order.id, from, 'PENDING');
  const pointsEarned = order.paymentMethod === 'POINTS' ? 0 : pointsEarnedFor(order.total);
  await moveOrderStatus(tx, order.id, from, 'PAID', { pointsEarned, pointsUsed });
  // Điểm thưởng (Task 10.4): chỉ cộng khi đơn đã PAID
  if (pointsEarned > 0) {
    await tx.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { increment: pointsEarned } } });
    await tx.loyaltyTransaction.create({ data: { userId: order.userId, orderId: order.id, delta: pointsEarned, reason: `Tích điểm đơn ${order.id}` } });
  }
  if (order.voucherCode) {
    await tx.voucher.update({ where: { code: order.voucherCode }, data: { usedCount: { increment: 1 } } });
  }
  for (const item of order.items) {
    await tx.product.update({ where: { id: item.productId }, data: { sold: { increment: item.qty } } });
  }
}

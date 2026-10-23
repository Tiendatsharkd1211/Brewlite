import { randomInt, randomUUID } from 'crypto';
import { OrdersService } from '../src/orders/orders.service';
import { PaymentsService } from '../src/payments/payments.service';
import { VnpayConfig, VnpayGateway } from '../src/payments/vnpay/vnpay.gateway';
import { hmacSha512, signData, vnpDate } from '../src/payments/vnpay/vnpay.util';
import { PrismaService } from '../src/prisma/prisma.service';
import { PromotionsService } from '../src/promotions/promotions.service';

/** Cấu hình VNPay dùng riêng cho test (khoá bí mật giả, không gọi mạng) */
export const TEST_VNPAY: VnpayConfig = {
  tmnCode: 'TESTCODE',
  hashSecret: 'KHOA_BI_MAT_CHI_DUNG_DE_TEST',
  payUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  apiUrl: 'https://vnpay.test/merchant_webapi/api/transaction',
  returnUrl: 'http://localhost:3000/payment/vnpay-return',
};

/** Dựng các service thật trên PostgreSQL thật (không giả lập CSDL). `http` thay cho fetch khi test truy vấn đối soát. */
export async function createServices(http?: typeof fetch) {
  const prisma = new PrismaService();
  await prisma.$connect();
  const orders = new OrdersService(prisma, new PromotionsService(prisma));
  const payments = new PaymentsService(prisma, new VnpayGateway(TEST_VNPAY, http));
  return { prisma, orders, payments };
}

/** Tạo khách và sản phẩm riêng cho từng bài test, xoá sạch sau khi chạy */
export async function createFixture(prisma: PrismaService, stock: number) {
  const tag = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `test-${tag}@brewlite.test`, fullName: 'Người kiểm thử', passwordHash: 'x', loyaltyPoints: 0 },
  });
  const product = await prisma.product.create({
    data: { id: `test-${tag}`, name: `Món test ${tag}`, description: 'test', price: 30000, imageUrl: '', stock, category: 'test', kind: 'drink', keywords: [] },
  });
  const pointsOf = async () => (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).loyaltyPoints;
  const cleanup = async () => {
    await prisma.order.deleteMany({ where: { userId: user.id } }); // xoá luôn giao dịch và nhật ký VNPay
    await prisma.loyaltyTransaction.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.product.delete({ where: { id: product.id } });
  };
  return { user, product, pointsOf, cleanup };
}

export const orderDto = (productId: string, qty = 1, paymentMethod: 'VNPAY' | 'POINTS' = 'VNPAY') => ({
  items: [{ productId, size: 'S' as const, sugar: 100, ice: 100, toppingIds: [], note: '', qty }],
  fulfillment: 'PICKUP' as const,
  pickupTime: 'Lấy ngay',
  paymentMethod,
});

/**
 * Đóng vai VNPay: đọc link thanh toán BrewLite tạo ra và trả về bộ tham số kết quả ĐÃ KÝ
 * giống hệt VNPay gửi về Return URL / IPN. `code` = vnp_ResponseCode (00 thành công, 24 khách huỷ, 51 không đủ tiền...).
 */
export function vnpayCallback(payUrl: string, opts: { code?: string; amount?: number; secret?: string } = {}): Record<string, string> {
  const sent = Object.fromEntries(new URL(payUrl).searchParams);
  const code = opts.code ?? '00';
  const ok = code === '00';
  const params: Record<string, string> = {
    vnp_Amount: opts.amount !== undefined ? String(opts.amount * 100) : sent.vnp_Amount,
    vnp_BankCode: 'NCB',
    vnp_BankTranNo: ok ? `VNP${randomInt(10_000_000, 99_999_999)}` : '',
    vnp_CardType: 'ATM',
    vnp_OrderInfo: sent.vnp_OrderInfo,
    vnp_PayDate: vnpDate(new Date()),
    vnp_ResponseCode: code,
    vnp_TmnCode: sent.vnp_TmnCode,
    vnp_TransactionNo: ok ? String(randomInt(14_000_000, 15_000_000)) : '0',
    vnp_TransactionStatus: ok ? '00' : '02',
    vnp_TxnRef: sent.vnp_TxnRef,
  };
  return { ...params, vnp_SecureHashType: 'HmacSHA512', vnp_SecureHash: hmacSha512(opts.secret ?? TEST_VNPAY.hashSecret, signData(params)) };
}

/** Tạo link VNPay cho đơn rồi giả lập khách trả xong và được chuyển về Return URL */
export async function payByVnpay(s: Awaited<ReturnType<typeof createServices>>, userId: string, orderId: string, code = '00') {
  const started = await s.payments.pay(userId, randomUUID(), { orderId, method: 'VNPAY' }, '127.0.0.1');
  return s.payments.handleReturn(userId, vnpayCallback(started.payUrl!, { code }));
}

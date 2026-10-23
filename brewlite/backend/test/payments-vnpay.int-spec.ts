import { randomUUID } from 'crypto';
import { hmacSha512, signQueryRequest, vnpDate } from '../src/payments/vnpay/vnpay.util';
import { createFixture, createServices, orderDto, payByVnpay, TEST_VNPAY, vnpayCallback } from './helpers';

const IP = '127.0.0.1';

// Task 8 + Task 10 (b): thanh toán qua VNPay, gửi trùng / VNPay báo trùng cũng chỉ ghi nhận 1 lần
describe('Thanh toán VNPay (PostgreSQL thật, VNPay giả lập bằng tham số đã ký)', () => {
  let s: Awaited<ReturnType<typeof createServices>>;
  let fx: Awaited<ReturnType<typeof createFixture>>;

  beforeAll(async () => {
    s = await createServices();
    fx = await createFixture(s.prisma, 100);
  });
  afterAll(async () => {
    await fx.cleanup();
    await s.prisma.$disconnect();
  });

  const newOrder = (qty = 1) => s.orders.create(fx.user.id, orderDto(fx.product.id, qty));
  const startPay = (orderId: string, key = randomUUID()) => s.payments.pay(fx.user.id, key, { orderId, method: 'VNPAY' }, IP);

  it('tạo link VNPay: giao dịch PROCESSING, đơn vẫn PENDING, link có số tiền x100 và chữ ký', async () => {
    const order = await newOrder(2);
    const r = await startPay(order.id);

    expect(r.payment.status).toBe('PROCESSING');
    expect(r.order.status).toBe('PENDING');
    const url = new URL(r.payUrl!);
    expect(url.origin + url.pathname).toBe(TEST_VNPAY.payUrl);
    expect(url.searchParams.get('vnp_Amount')).toBe(String(order.total * 100));
    expect(url.searchParams.get('vnp_TxnRef')).toBe(r.payment.txnRef);
    expect(url.searchParams.get('vnp_SecureHash')).toMatch(/^[0-9a-f]{128}$/);
    const logs = await s.prisma.paymentLog.findMany({ where: { paymentId: r.payment.id } });
    expect(logs.map((l) => l.source)).toEqual(['CREATE']);
  });

  it('gửi lại cùng Idempotency-Key (tuần tự và 5 request đồng thời): chỉ 1 giao dịch, cùng 1 link', async () => {
    const order = await newOrder();
    const key = randomUUID();
    const results = await Promise.all(Array.from({ length: 5 }, () => startPay(order.id, key)));
    const again = await startPay(order.id, key);

    expect(new Set([...results, again].map((r) => r.payment.id)).size).toBe(1);
    expect(new Set([...results, again].map((r) => r.payUrl)).size).toBe(1);
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect(again.replayed).toBe(true);
    expect(await s.prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('dùng lại khoá cũ cho đơn khác thì bị từ chối', async () => {
    const a = await newOrder();
    const b = await newOrder();
    const key = randomUUID();
    await startPay(a.id, key);
    await expect(startPay(b.id, key)).rejects.toThrow('Idempotency-Key');
  });

  it('VNPay báo thành công qua Return URL: đơn PAID, lưu mã GD VNPay/ngân hàng, cộng điểm; IPN tới sau trả 02, không cộng lần 2', async () => {
    const order = await newOrder(2);
    const r = await startPay(order.id);
    const points = await fx.pointsOf();
    const callback = vnpayCallback(r.payUrl!);

    const ret = await s.payments.handleReturn(fx.user.id, callback);
    expect(ret.order.status).toBe('PAID');
    expect(ret.payment).toMatchObject({ status: 'SUCCEEDED', vnpResponseCode: '00', vnpTransactionStatus: '00', vnpBankCode: 'NCB', vnpCardType: 'ATM', vnpTransactionNo: callback.vnp_TransactionNo });
    expect(ret.payment.paidAt).not.toBeNull();
    expect(await fx.pointsOf()).toBe(points + Math.floor(order.total / 1000));

    expect(await s.payments.handleIpn(callback)).toEqual({ RspCode: '02', Message: 'Order already confirmed' });
    expect(await fx.pointsOf()).toBe(points + Math.floor(order.total / 1000));
    const logs = await s.prisma.paymentLog.findMany({ where: { paymentId: r.payment.id }, orderBy: { createdAt: 'asc' } });
    expect(logs.map((l) => l.source)).toEqual(['CREATE', 'RETURN', 'IPN']);
  });

  it('Return và 4 IPN tới ĐỒNG THỜI: chỉ ghi nhận 1 lần, điểm và số đã bán chỉ cộng 1 lần', async () => {
    const order = await newOrder(3);
    const r = await startPay(order.id);
    const points = await fx.pointsOf();
    const sold = (await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } })).sold;
    const callback = vnpayCallback(r.payUrl!);

    const [ret, ...ipns] = await Promise.all([s.payments.handleReturn(fx.user.id, callback), ...Array.from({ length: 4 }, () => s.payments.handleIpn(callback))]);

    expect(ret.order.status).toBe('PAID');
    expect(ipns.every((x) => x.RspCode === '00' || x.RspCode === '02')).toBe(true);
    expect(await fx.pointsOf()).toBe(points + Math.floor(order.total / 1000));
    expect((await s.prisma.product.findUniqueOrThrow({ where: { id: fx.product.id } })).sold).toBe(sold + 3);
    expect(await s.prisma.loyaltyTransaction.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('sửa tham số sau khi VNPay ký (đổi mã lỗi 24 thành 00) hoặc ký bằng khoá khác: IPN 97, Return báo lỗi, đơn không đổi', async () => {
    const order = await newOrder();
    const r = await startPay(order.id);
    const tampered = { ...vnpayCallback(r.payUrl!, { code: '24' }), vnp_ResponseCode: '00', vnp_TransactionStatus: '00' };
    const forged = vnpayCallback(r.payUrl!, { secret: 'KHOA_DOAN_MO' });

    expect(await s.payments.handleIpn(tampered)).toEqual({ RspCode: '97', Message: 'Invalid signature' });
    expect(await s.payments.handleIpn(forged)).toEqual({ RspCode: '97', Message: 'Invalid signature' });
    await expect(s.payments.handleReturn(fx.user.id, tampered)).rejects.toThrow('Chữ ký VNPay không hợp lệ');
    expect((await s.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PENDING');
    expect((await s.prisma.payment.findUniqueOrThrow({ where: { id: r.payment.id } })).status).toBe('PROCESSING');
  });

  it('số tiền không khớp (dù đúng chữ ký): IPN 04; mã giao dịch lạ: IPN 01', async () => {
    const order = await newOrder();
    const r = await startPay(order.id);
    expect(await s.payments.handleIpn(vnpayCallback(r.payUrl!, { amount: 1000 }))).toEqual({ RspCode: '04', Message: 'Invalid amount' });
    expect((await s.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PENDING');

    const unknown = vnpayCallback(r.payUrl!.replace(r.payment.txnRef!, 'KHONGCO_1'));
    expect(await s.payments.handleIpn(unknown)).toEqual({ RspCode: '01', Message: 'Order not found' });
  });

  it('khách huỷ trên VNPay (mã 24): giao dịch FAILED, đơn PAYMENT_FAILED; tạo link mới thì đơn về PENDING và trả được', async () => {
    const order = await newOrder();
    const failed = await payByVnpay(s, fx.user.id, order.id, '24');
    expect(failed.payment.status).toBe('FAILED');
    expect(failed.payment.failureReason).toBe('Khách hàng huỷ giao dịch');
    expect(failed.order.status).toBe('PAYMENT_FAILED');
    expect(failed.order.pointsEarned).toBe(0);

    const retry = await startPay(order.id);
    expect(retry.order.status).toBe('PENDING');
    const ok = await s.payments.handleReturn(fx.user.id, vnpayCallback(retry.payUrl!));
    expect(ok.order.status).toBe('PAID');

    const history = (await s.payments.findMine(fx.user.id)).filter((p) => p.orderId === order.id);
    expect(history.map((p) => p.status)).toEqual(['SUCCEEDED', 'FAILED']); // mới nhất trước
  });

  it('link cũ báo lỗi khi khách đang trả bằng link mới: đơn vẫn PENDING (chỉ link mới nhất quyết định)', async () => {
    const order = await newOrder();
    const first = await startPay(order.id);
    const second = await startPay(order.id);
    await s.payments.handleIpn(vnpayCallback(first.payUrl!, { code: '11' }));
    expect((await s.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PENDING');
    await s.payments.handleIpn(vnpayCallback(second.payUrl!));
    expect((await s.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PAID');
  });

  it('khách trả 2 lần bằng 2 link (2 tab): đơn chỉ PAID 1 lần, giao dịch sau ghi "cần hoàn tiền", điểm cộng 1 lần', async () => {
    const order = await newOrder();
    const a = await startPay(order.id);
    const b = await startPay(order.id);
    const points = await fx.pointsOf();

    await s.payments.handleIpn(vnpayCallback(a.payUrl!));
    expect((await s.prisma.payment.findUniqueOrThrow({ where: { id: b.payment.id } })).status).toBe('FAILED'); // link b không dùng nữa
    expect(await s.payments.handleIpn(vnpayCallback(b.payUrl!))).toEqual({ RspCode: '00', Message: 'Confirm Success' });

    const pb = await s.prisma.payment.findUniqueOrThrow({ where: { id: b.payment.id } });
    expect(pb.status).toBe('NEEDS_REFUND');
    expect(pb.failureReason).toContain('cần hoàn tiền');
    expect(await fx.pointsOf()).toBe(points + Math.floor(order.total / 1000));
  });

  it('khách khác không xem được / không xác nhận được giao dịch của mình', async () => {
    const order = await newOrder();
    const r = await startPay(order.id);
    const other = await createFixture(s.prisma, 1);
    try {
      await expect(s.payments.findOne(other.user.id, r.payment.id)).rejects.toThrow('Không tìm thấy');
      await expect(s.payments.handleReturn(other.user.id, vnpayCallback(r.payUrl!))).rejects.toThrow('Không tìm thấy');
    } finally {
      await other.cleanup();
    }
  });

  it('lịch sử giao dịch: chi tiết có đơn, món và nhật ký trao đổi với VNPay', async () => {
    const order = await newOrder();
    const paid = await payByVnpay(s, fx.user.id, order.id);
    const detail = await s.payments.findOne(fx.user.id, paid.payment.id);
    expect(detail.order.items).toHaveLength(1);
    expect(detail.logs.map((l) => l.source)).toEqual(['CREATE', 'RETURN']);
    expect(detail.logs[1].message).toContain('thành công');
  });
});

// Đối soát: hỏi lại VNPay bằng API querydr (fetch giả trả phản hồi đã ký)
describe('Đối soát giao dịch với VNPay (querydr)', () => {
  let respond: (req: Record<string, string>) => Record<string, string>;
  const requests: Record<string, string>[] = [];
  const fakeFetch = (async (_url: string, init: { body: string }) => {
    const req = JSON.parse(init.body) as Record<string, string>;
    requests.push(req);
    return { json: async () => respond(req) };
  }) as unknown as typeof fetch;
  const signed = (body: Record<string, string>) => {
    const fields = ['vnp_ResponseId', 'vnp_Command', 'vnp_ResponseCode', 'vnp_Message', 'vnp_TmnCode', 'vnp_TxnRef', 'vnp_Amount', 'vnp_BankCode', 'vnp_PayDate', 'vnp_TransactionNo', 'vnp_TransactionType', 'vnp_TransactionStatus', 'vnp_OrderInfo', 'vnp_PromotionCode', 'vnp_PromotionAmount'];
    return { ...body, vnp_SecureHash: hmacSha512(TEST_VNPAY.hashSecret, fields.map((f) => body[f] ?? '').join('|')) };
  };

  let s: Awaited<ReturnType<typeof createServices>>;
  let fx: Awaited<ReturnType<typeof createFixture>>;
  beforeAll(async () => {
    s = await createServices(fakeFetch);
    fx = await createFixture(s.prisma, 10);
  });
  afterAll(async () => {
    await fx.cleanup();
    await s.prisma.$disconnect();
  });

  it('khách đóng trình duyệt sau khi trả: đối soát thấy VNPay đã thành công thì đơn sang PAID; đối soát lần 2 không đổi gì', async () => {
    const order = await s.orders.create(fx.user.id, orderDto(fx.product.id));
    const r = await s.payments.pay(fx.user.id, randomUUID(), { orderId: order.id, method: 'VNPAY' }, IP);
    respond = (req) =>
      signed({ vnp_ResponseId: 'r1', vnp_Command: 'querydr', vnp_ResponseCode: '00', vnp_Message: 'QueryDR Success', vnp_TmnCode: TEST_VNPAY.tmnCode, vnp_TxnRef: req.vnp_TxnRef, vnp_Amount: String(order.total * 100), vnp_BankCode: 'NCB', vnp_PayDate: vnpDate(new Date()), vnp_TransactionNo: '14612345', vnp_TransactionType: '01', vnp_TransactionStatus: '00', vnp_OrderInfo: 'Thanh toan' });

    const first = await s.payments.reconcile(fx.user.id, r.payment.id, IP);
    expect(first.status).toBe('SUCCEEDED');
    expect(first.order.status).toBe('PAID');
    expect(first.vnpTransactionNo).toBe('14612345');
    // Yêu cầu gửi đi đúng định dạng và đúng chữ ký
    const req = requests[0];
    expect(req).toMatchObject({ vnp_Command: 'querydr', vnp_TxnRef: r.payment.txnRef, vnp_TransactionDate: r.payment.vnpCreateDate, vnp_IpAddr: IP });
    const { vnp_SecureHash, ...rest } = req;
    expect(vnp_SecureHash).toBe(signQueryRequest(rest, TEST_VNPAY.hashSecret));

    const second = await s.payments.reconcile(fx.user.id, r.payment.id, IP);
    expect(second.message).toBe('VNPay xác nhận kết quả khớp với BrewLite');
    expect(await fx.pointsOf()).toBe(Math.floor(order.total / 1000));
  });

  it('phản hồi sai chữ ký thì không cập nhật gì', async () => {
    const order = await s.orders.create(fx.user.id, orderDto(fx.product.id));
    const r = await s.payments.pay(fx.user.id, randomUUID(), { orderId: order.id, method: 'VNPAY' }, IP);
    respond = (req) => ({ vnp_ResponseCode: '00', vnp_TxnRef: req.vnp_TxnRef, vnp_TransactionStatus: '00', vnp_Amount: String(order.total * 100), vnp_SecureHash: 'abc' });
    const res = await s.payments.reconcile(fx.user.id, r.payment.id, IP);
    expect(res.status).toBe('PROCESSING');
    expect(res.message).toContain('sai chữ ký');
  });

  it('link đã hết hạn và VNPay không có giao dịch (91): giao dịch FAILED, đơn PAYMENT_FAILED', async () => {
    const order = await s.orders.create(fx.user.id, orderDto(fx.product.id));
    const r = await s.payments.pay(fx.user.id, randomUUID(), { orderId: order.id, method: 'VNPAY' }, IP);
    await s.prisma.payment.update({ where: { id: r.payment.id }, data: { expiresAt: new Date(Date.now() - 60_000) } });
    respond = (req) => signed({ vnp_ResponseId: 'r3', vnp_Command: 'querydr', vnp_ResponseCode: '91', vnp_Message: 'Transaction not found', vnp_TmnCode: TEST_VNPAY.tmnCode, vnp_TxnRef: req.vnp_TxnRef });
    const res = await s.payments.reconcile(fx.user.id, r.payment.id, IP);
    expect(res.status).toBe('FAILED');
    expect(res.order.status).toBe('PAYMENT_FAILED');
  });
});

// Trả bằng điểm BrewLite: trừ điểm ngay, không qua VNPay
describe('Thanh toán bằng điểm (PostgreSQL thật)', () => {
  let s: Awaited<ReturnType<typeof createServices>>;
  beforeAll(async () => {
    s = await createServices();
  });
  afterAll(async () => {
    await s.prisma.$disconnect();
  });

  it('đủ điểm: PAID ngay; gửi lại cùng khoá không trừ lần 2; không đủ điểm: PAYMENT_FAILED', async () => {
    const fx = await createFixture(s.prisma, 10);
    try {
      await s.prisma.user.update({ where: { id: fx.user.id }, data: { loyaltyPoints: 500 } });
      const order = await s.orders.create(fx.user.id, orderDto(fx.product.id, 1, 'POINTS'));
      const key = randomUUID();
      const [a, b] = await Promise.all([1, 2].map(() => s.payments.pay(fx.user.id, key, { orderId: order.id, method: 'POINTS' }, IP)));
      expect(a.payment.id).toBe(b.payment.id);
      expect(a.order.status).toBe('PAID');
      expect(a.payUrl).toBeNull();
      expect(await fx.pointsOf()).toBe(500 - 300); // 30.000đ = 300 điểm

      const poor = await s.orders.create(fx.user.id, orderDto(fx.product.id, 1, 'POINTS'));
      const failed = await s.payments.pay(fx.user.id, randomUUID(), { orderId: poor.id, method: 'POINTS' }, IP);
      expect(failed.order.status).toBe('PAYMENT_FAILED');
      expect(await fx.pointsOf()).toBe(200);
    } finally {
      await fx.cleanup();
    }
  });
});

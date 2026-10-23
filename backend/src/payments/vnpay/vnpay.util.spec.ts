import { VnpayGateway } from './vnpay.gateway';
import { buildPaymentUrl, describeResponseCode, isPaidResult, parseVnpDate, signData, signQueryRequest, verifySignature, vnpDate } from './vnpay.util';

const SECRET = 'SECRETKEY123';
// Giá trị mong đợi tính độc lập bằng Python: hmac.new(b'SECRETKEY123', data.encode(), hashlib.sha512).hexdigest()
const DATA = 'vnp_Amount=3500000&vnp_Command=pay&vnp_OrderInfo=Thanh+toan+don+hang+BL000001&vnp_TxnRef=BL000001_123456';
const HASH = '097bc755c22c44abb768382b2e8e54ad1c5d8b00d3a0c7b97e3550bbf656b67eed03606777cb3e62daa58e52a68b0d9c86a2b7e812c098c5b14a0fcb024ee9a6';

describe('VNPay: ký và kiểm tra chữ ký', () => {
  const params = { vnp_TxnRef: 'BL000001_123456', vnp_OrderInfo: 'Thanh toan don hang BL000001', vnp_Command: 'pay', vnp_Amount: '3500000' };

  it('sắp tên tham số theo chữ cái, dấu cách thành "+"', () => {
    expect(signData(params)).toBe(DATA);
  });

  it('chữ ký HMAC-SHA512 khớp giá trị tính độc lập', () => {
    expect(buildPaymentUrl('https://vnpay.test/pay', params, SECRET)).toBe(`https://vnpay.test/pay?${DATA}&vnp_SecureHash=${HASH}`);
  });

  it('chấp nhận tham số đúng chữ ký (kể cả chữ ký viết hoa), bỏ qua tham số không bắt đầu bằng vnp_', () => {
    expect(verifySignature({ ...params, vnp_SecureHash: HASH, vnp_SecureHashType: 'HmacSHA512', foo: 'bar' }, SECRET).valid).toBe(true);
    expect(verifySignature({ ...params, vnp_SecureHash: HASH.toUpperCase() }, SECRET).valid).toBe(true);
  });

  it('từ chối khi bị sửa số tiền, sai khoá bí mật, thiếu chữ ký hoặc tham số bị lặp', () => {
    expect(verifySignature({ ...params, vnp_Amount: '100', vnp_SecureHash: HASH }, SECRET).valid).toBe(false);
    expect(verifySignature({ ...params, vnp_SecureHash: HASH }, 'KHOA_KHAC').valid).toBe(false);
    expect(verifySignature(params, SECRET).valid).toBe(false);
    expect(verifySignature({ ...params, vnp_TxnRef: ['a', 'b'], vnp_SecureHash: HASH }, SECRET).valid).toBe(false);
  });

  it('link tạo ra đọc ngược lại (như VNPay đọc) vẫn đúng chữ ký', () => {
    const gw = new VnpayGateway({ tmnCode: 'TESTCODE', hashSecret: SECRET, payUrl: 'https://vnpay.test/pay', apiUrl: '', returnUrl: 'http://localhost:3000/payment/vnpay-return' });
    const link = gw.createPaymentLink({ txnRef: 'BL1_1', amount: 45000, orderInfo: 'Thanh toan don hang BL1', ipAddr: '127.0.0.1', now: new Date('2026-10-23T07:00:00Z') });
    const query = Object.fromEntries(new URL(link.url).searchParams);
    expect(query.vnp_Amount).toBe('4500000');
    expect(query.vnp_CreateDate).toBe('20261023140000');
    expect(query.vnp_ExpireDate).toBe('20261023141500');
    expect(query.vnp_ReturnUrl).toBe('http://localhost:3000/payment/vnpay-return');
    expect(gw.verify(query).valid).toBe(true);
  });

  it('chữ ký truy vấn querydr nối các trường bằng "|" đúng thứ tự tài liệu', () => {
    const body = { vnp_RequestId: 'abc', vnp_Version: '2.1.0', vnp_Command: 'querydr', vnp_TmnCode: 'TESTCODE', vnp_TxnRef: 'BL000001_123456', vnp_TransactionDate: '20261023140000', vnp_CreateDate: '20261023141000', vnp_IpAddr: '127.0.0.1', vnp_OrderInfo: 'Truy van' };
    expect(signQueryRequest(body, SECRET)).toBe('d1f466e4d82356c9a0ff3ca11fbc123f05354c016e40f3f63ac17eaf9694fe788e8acb5aa51121557a1a350be9e9f16f74fbbd93cfcac2c4e6da0fb08d5f88f8');
  });
});

describe('VNPay: ngày giờ và mã kết quả', () => {
  it('ngày giờ luôn theo GMT+7, đọc ngược được', () => {
    expect(vnpDate(new Date('2026-12-31T17:30:05Z'))).toBe('20270101003005');
    expect(parseVnpDate('20270101003005')?.toISOString()).toBe('2026-12-31T17:30:05.000Z');
    expect(parseVnpDate('abc')).toBeNull();
  });

  it('chỉ thành công khi cả vnp_ResponseCode và vnp_TransactionStatus là 00', () => {
    expect(isPaidResult({ vnp_ResponseCode: '00', vnp_TransactionStatus: '00' })).toBe(true);
    expect(isPaidResult({ vnp_ResponseCode: '00', vnp_TransactionStatus: '02' })).toBe(false);
    expect(isPaidResult({ vnp_ResponseCode: '24', vnp_TransactionStatus: '02' })).toBe(false);
  });

  it('giải thích mã lỗi bằng tiếng Việt', () => {
    expect(describeResponseCode('24')).toBe('Khách hàng huỷ giao dịch');
    expect(describeResponseCode('51')).toBe('Tài khoản không đủ số dư');
    expect(describeResponseCode('42')).toBe('Lỗi khác (mã 42)');
  });
});

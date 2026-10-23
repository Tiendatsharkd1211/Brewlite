import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Các hàm thuần cho cổng VNPay (phiên bản API 2.1.0), viết theo tài liệu chính thức
 * https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 * Không gọi mạng, không đọc CSDL nên test được bằng unit test.
 */
export const VNP_VERSION = '2.1.0';
export const SANDBOX_PAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
export const SANDBOX_API_URL = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
/** Link thanh toán sống 15 phút (vnp_ExpireDate) */
export const PAY_LINK_TTL_MS = 15 * 60 * 1000;

export type VnpParams = Record<string, string>;

const pad = (n: number) => String(n).padStart(2, '0');

/** Thời điểm theo giờ Việt Nam (GMT+7) dạng yyyyMMddHHmmss, không phụ thuộc múi giờ của máy chạy backend */
export function vnpDate(date: Date): string {
  const vn = new Date(date.getTime() + 7 * 3_600_000);
  return `${vn.getUTCFullYear()}${pad(vn.getUTCMonth() + 1)}${pad(vn.getUTCDate())}${pad(vn.getUTCHours())}${pad(vn.getUTCMinutes())}${pad(vn.getUTCSeconds())}`;
}

/** Đọc ngược chuỗi yyyyMMddHHmmss (giờ Việt Nam) VNPay gửi về thành Date */
export function parseVnpDate(value: string | null | undefined): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - 7, mi, s));
}

/** Mã hoá giống code mẫu của VNPay: encodeURIComponent, dấu cách thành "+" */
const encode = (value: string) => encodeURIComponent(value).replace(/%20/g, '+');

/** Chuỗi đem đi ký: sắp tên tham số theo thứ tự chữ cái, nối "tên=giá_trị" bằng "&" */
export function signData(params: VnpParams): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key])}`)
    .join('&');
}

export function hmacSha512(secret: string, data: string): string {
  return createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex');
}

/** Link sang cổng thanh toán: chuỗi tham số + vnp_SecureHash = HMAC-SHA512(HashSecret, chuỗi tham số) */
export function buildPaymentUrl(baseUrl: string, params: VnpParams, secret: string): string {
  const data = signData(params);
  return `${baseUrl}?${data}&vnp_SecureHash=${hmacSha512(secret, data)}`;
}

/** So 2 chuỗi hex không để lộ thời gian so sánh */
function sameHex(a: string, b: string): boolean {
  const x = Buffer.from(a.toLowerCase());
  const y = Buffer.from(b.toLowerCase());
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Kiểm tra chữ ký tham số VNPay gửi về (Return URL và IPN).
 * Lấy mọi tham số bắt đầu bằng "vnp_" trừ vnp_SecureHash / vnp_SecureHashType, ký lại bằng HashSecret rồi so.
 * Ai sửa bất kỳ tham số nào (ví dụ đổi mã lỗi thành 00) thì chữ ký không khớp.
 */
export function verifySignature(query: Record<string, unknown>, secret: string): { valid: boolean; params: VnpParams } {
  const params: VnpParams = {};
  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith('vnp_') || key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') continue;
    if (typeof value !== 'string') return { valid: false, params }; // tham số bị lặp => không hợp lệ
    params[key] = value;
  }
  const received = typeof query.vnp_SecureHash === 'string' ? query.vnp_SecureHash : '';
  return { valid: received !== '' && sameHex(received, hmacSha512(secret, signData(params))), params };
}

/** Bảng vnp_ResponseCode (kết quả thanh toán) theo tài liệu VNPay */
export const RESPONSE_MESSAGES: Readonly<Record<string, string>> = {
  '00': 'Giao dịch thành công',
  '07': 'Trừ tiền thành công nhưng giao dịch bị nghi ngờ gian lận',
  '09': 'Thẻ/tài khoản chưa đăng ký Internet Banking',
  '10': 'Xác thực thông tin thẻ/tài khoản sai quá 3 lần',
  '11': 'Đã hết thời gian chờ thanh toán',
  '12': 'Thẻ/tài khoản bị khoá',
  '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP)',
  '24': 'Khách hàng huỷ giao dịch',
  '51': 'Tài khoản không đủ số dư',
  '65': 'Tài khoản đã vượt hạn mức giao dịch trong ngày',
  '75': 'Ngân hàng thanh toán đang bảo trì',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
  '99': 'Lỗi khác',
};

/** Bảng vnp_TransactionStatus */
export const TRANSACTION_STATUS_MESSAGES: Readonly<Record<string, string>> = {
  '00': 'Giao dịch thanh toán thành công',
  '01': 'Giao dịch chưa hoàn tất',
  '02': 'Giao dịch bị lỗi',
  '04': 'Giao dịch đảo (khách đã bị trừ tiền ở ngân hàng nhưng VNPay chưa ghi nhận thành công)',
  '05': 'VNPay đang xử lý hoàn tiền',
  '06': 'VNPay đã gửi yêu cầu hoàn tiền sang ngân hàng',
  '07': 'Giao dịch bị nghi ngờ gian lận',
  '09': 'Giao dịch hoàn trả bị từ chối',
};

/** Bảng vnp_ResponseCode của API truy vấn giao dịch (querydr) */
export const QUERY_MESSAGES: Readonly<Record<string, string>> = {
  '00': 'Truy vấn thành công',
  '02': 'Mã website (TmnCode) không hợp lệ',
  '03': 'Dữ liệu gửi sang không đúng định dạng',
  '91': 'VNPay không có giao dịch này (khách chưa thanh toán)',
  '94': 'Truy vấn trùng lặp, thử lại sau ít phút',
  '97': 'Chữ ký truy vấn không hợp lệ',
  '99': 'Lỗi khác',
};

export const describeResponseCode = (code: string | null | undefined) =>
  code ? (RESPONSE_MESSAGES[code] ?? `Lỗi khác (mã ${code})`) : 'Chưa có kết quả';

/** Thành công khi CẢ mã phản hồi và trạng thái giao dịch đều là 00 */
export const isPaidResult = (params: VnpParams) => params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';

/** Thứ tự trường ký cho yêu cầu querydr: nối bằng "|" */
const QUERY_REQUEST_FIELDS = ['vnp_RequestId', 'vnp_Version', 'vnp_Command', 'vnp_TmnCode', 'vnp_TxnRef', 'vnp_TransactionDate', 'vnp_CreateDate', 'vnp_IpAddr', 'vnp_OrderInfo'] as const;
/** Thứ tự trường ký cho phản hồi querydr */
const QUERY_RESPONSE_FIELDS = [
  'vnp_ResponseId', 'vnp_Command', 'vnp_ResponseCode', 'vnp_Message', 'vnp_TmnCode', 'vnp_TxnRef', 'vnp_Amount', 'vnp_BankCode',
  'vnp_PayDate', 'vnp_TransactionNo', 'vnp_TransactionType', 'vnp_TransactionStatus', 'vnp_OrderInfo', 'vnp_PromotionCode', 'vnp_PromotionAmount',
] as const;

const pipeJoin = (obj: Record<string, unknown>, fields: readonly string[]) => fields.map((f) => (obj[f] == null ? '' : String(obj[f]))).join('|');

export function signQueryRequest(body: Record<string, string>, secret: string): string {
  return hmacSha512(secret, pipeJoin(body, QUERY_REQUEST_FIELDS));
}

export function verifyQueryResponse(body: Record<string, unknown>, secret: string): boolean {
  return typeof body.vnp_SecureHash === 'string' && sameHex(body.vnp_SecureHash, hmacSha512(secret, pipeJoin(body, QUERY_RESPONSE_FIELDS)));
}

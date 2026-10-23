/**
 * Luật của TÀI KHOẢN ẢO (ví điện tử / thẻ liên kết), viết dạng hàm thuần để dễ unit test.
 * Mỗi khách liên kết được 1 tài khoản ảo cho mỗi loại ví/thẻ. Khi thanh toán, tiền bị trừ
 * thật vào số dư của tài khoản ảo đó (lưu trong CSDL), không còn cổng thanh toán giả lập.
 */
export const WALLET_PROVIDERS = ['MOMO', 'ZALOPAY', 'SHOPEEPAY', 'VNPAY', 'CARD'] as const;
export type WalletProvider = (typeof WALLET_PROVIDERS)[number];

export const PROVIDER_NAMES: Record<WalletProvider, string> = {
  MOMO: 'Ví MoMo',
  ZALOPAY: 'Ví ZaloPay',
  SHOPEEPAY: 'Ví ShopeePay',
  VNPAY: 'Ví VNPay',
  CARD: 'Thẻ ngân hàng',
};

/** Số dư ảo được cấp khi vừa liên kết, để khách đặt thử được ngay */
export const OPENING_BALANCE = 200_000;
/** Mỗi lần nạp từ 10.000đ đến 2.000.000đ, số dư tối đa 10.000.000đ */
export const TOPUP_MIN = 10_000;
export const TOPUP_MAX = 2_000_000;
export const BALANCE_MAX = 10_000_000;

export function isWalletProvider(method: string): method is WalletProvider {
  return (WALLET_PROVIDERS as readonly string[]).includes(method);
}

/** Bỏ dấu cách, gạch ngang trong số khách nhập */
export function normalizeAccountNumber(raw: string): string {
  return raw.replace(/[\s.-]/g, '');
}

/** Ví điện tử: số điện thoại 10 số bắt đầu bằng 0. Thẻ: 16 số và đúng thuật toán Luhn. */
export function validateAccountNumber(provider: WalletProvider, raw: string): string | null {
  const n = normalizeAccountNumber(raw);
  if (provider === 'CARD') {
    if (!/^\d{16}$/.test(n)) return 'Số thẻ gồm đúng 16 chữ số';
    if (!luhnOk(n)) return 'Số thẻ không hợp lệ, kiểm tra lại từng chữ số';
    return null;
  }
  if (!/^0\d{9}$/.test(n)) return 'Số điện thoại ví gồm 10 chữ số, bắt đầu bằng 0';
  return null;
}

/** Chỉ lưu số đã che: "0901234567" -> "090•••4567", thẻ -> "•••• 4242" */
export function maskAccountNumber(provider: WalletProvider, raw: string): string {
  const n = normalizeAccountNumber(raw);
  return provider === 'CARD' ? `•••• ${n.slice(-4)}` : `${n.slice(0, 3)}•••${n.slice(-4)}`;
}

/** Thuật toán Luhn: kiểm tra chữ số cuối của số thẻ */
export function luhnOk(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Kiểm tra số tiền nạp; trả câu lỗi hoặc null nếu hợp lệ */
export function validateTopup(balance: number, amount: number): string | null {
  if (!Number.isInteger(amount) || amount < TOPUP_MIN || amount > TOPUP_MAX) {
    return `Mỗi lần nạp từ ${TOPUP_MIN.toLocaleString('vi-VN')}đ đến ${TOPUP_MAX.toLocaleString('vi-VN')}đ`;
  }
  if (balance + amount > BALANCE_MAX) return `Số dư tài khoản ảo tối đa ${BALANCE_MAX.toLocaleString('vi-VN')}đ`;
  return null;
}

/** Câu báo khi số dư không đủ để thanh toán */
export function insufficientMessage(provider: WalletProvider, balance: number, amount: number): string {
  return `${PROVIDER_NAMES[provider]} không đủ số dư: còn ${balance.toLocaleString('vi-VN')}đ, đơn cần ${amount.toLocaleString('vi-VN')}đ. Nạp thêm tiền rồi thanh toán lại.`;
}

import { insufficientMessage, luhnOk, maskAccountNumber, validateAccountNumber, validateTopup } from './wallet-rules';

describe('Luật tài khoản ảo', () => {
  it('kiểm tra số điện thoại ví và số thẻ', () => {
    expect(validateAccountNumber('MOMO', '0901 234 567')).toBeNull();
    expect(validateAccountNumber('MOMO', '901234567')).not.toBeNull();
    expect(validateAccountNumber('CARD', '4242 4242 4242 4242')).toBeNull();
    expect(validateAccountNumber('CARD', '4242 4242 4242 4241')).toMatch('không hợp lệ');
    expect(validateAccountNumber('CARD', '4242')).toMatch('16 chữ số');
  });

  it('chỉ lưu số đã che', () => {
    expect(maskAccountNumber('ZALOPAY', '0901234567')).toBe('090•••4567');
    expect(maskAccountNumber('CARD', '4242-4242-4242-4242')).toBe('•••• 4242');
  });

  it('thuật toán Luhn', () => {
    expect(luhnOk('4111111111111111')).toBe(true);
    expect(luhnOk('4111111111111112')).toBe(false);
  });

  it('giới hạn số tiền nạp và số dư tối đa', () => {
    expect(validateTopup(0, 100_000)).toBeNull();
    expect(validateTopup(0, 5_000)).not.toBeNull();
    expect(validateTopup(0, 2_500_000)).not.toBeNull();
    expect(validateTopup(9_950_000, 100_000)).toMatch('tối đa');
  });

  it('câu báo không đủ số dư có số tiền cụ thể', () => {
    expect(insufficientMessage('CARD', 20_000, 35_000)).toBe('Thẻ ngân hàng không đủ số dư: còn 20.000đ, đơn cần 35.000đ. Nạp thêm tiền rồi thanh toán lại.');
  });
});

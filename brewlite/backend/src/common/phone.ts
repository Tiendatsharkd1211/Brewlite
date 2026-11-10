// Số điện thoại di động Việt Nam: 10 chữ số, bắt đầu bằng 0; chỉ lưu chữ số (0912345678).
export const PHONE_RE = /^0\d{9}$/;
export const PHONE_MESSAGE = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0';

/** Bỏ dấu cách, chấm, gạch người dùng hay gõ ("0912 345 678"); để trống thì coi như không nhập */
export const normalizePhone = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/[\s.-]/g, '') || undefined : value);

// Dữ liệu cố định phía giao diện. Menu, giá, tồn kho lấy từ API GET /products (PostgreSQL).
import type { Category, Level, PaymentMethodId, Reward, SizeId, Store, Topping } from './types';

export const CATEGORIES: Category[] = [
  { id: 'pha-may', name: 'Cà phê pha máy' },
  { id: 'truyen-thong', name: 'Cà phê truyền thống' },
  { id: 'tra-da-xay', name: 'Trà & Đá xay' },
  { id: 'banh-ngot', name: 'Bánh ngọt' },
];

export const SIZES: { id: SizeId; label: string; volume: string; extra: number }[] = [
  { id: 'S', label: 'Nhỏ', volume: '350 ml', extra: 0 },
  { id: 'M', label: 'Vừa', volume: '500 ml', extra: 6000 },
  { id: 'L', label: 'Lớn', volume: '700 ml', extra: 12000 },
];

export const LEVELS: Level[] = [0, 30, 50, 100];

/** Tên topping để hiển thị lại trong giỏ hàng, hoá đơn (giá thật lấy theo từng món từ API) */
export const TOPPINGS: Topping[] = [
  { id: 'espresso', name: 'Thêm shot espresso', price: 10000 },
  { id: 'cheese', name: 'Kem cheese', price: 12000 },
  { id: 'thach', name: 'Thạch cà phê', price: 8000 },
  { id: 'tranchau', name: 'Trân châu trắng', price: 8000 },
];

/** BrewLite chỉ có một chi nhánh nhận đơn */
export const STORE: Store = {
  name: 'BrewLite An Dương Vương',
  shortName: 'An Dương Vương',
  address: '273 An Dương Vương, Phường 3, Quận 5, TP.HCM',
  hours: '06:30 – 22:00',
};

/** VNPay: chuyển sang cổng VNPay (môi trường thử sandbox) để trả bằng thẻ ATM / thẻ quốc tế / QR. Điểm: trừ điểm BrewLite. */
export const PAYMENT_METHODS: { id: PaymentMethodId; name: string; hint: string; badge: string; badgeColor: string }[] = [
  { id: 'VNPAY', name: 'VNPay', hint: 'Thẻ ATM nội địa, thẻ quốc tế hoặc quét QR trên cổng VNPay', badge: 'VNPAY', badgeColor: '#005baa' },
  { id: 'POINTS', name: 'Điểm BrewLite', hint: '1 điểm = 100đ', badge: '★', badgeColor: '#a8650f' },
];

// Khớp với backend/src/auth/rewards.ts
export const REWARDS: Reward[] = [
  { id: 'topping', name: 'Thêm 1 topping miễn phí', cost: 200 },
  { id: 'upsize', name: 'Nâng size miễn phí 1 ly', cost: 300 },
  { id: 'croissant', name: 'Bánh croissant bơ', cost: 600 },
  { id: 'free-s', name: 'Ly cà phê size S bất kỳ', cost: 800 },
  { id: 'cake', name: 'Một bánh ngọt bất kỳ', cost: 1000 },
  { id: 'free-l', name: 'Ly đồ uống size L bất kỳ', cost: 1200 },
  { id: 'combo', name: 'Combo cà phê sữa đá và croissant', cost: 1300 },
  { id: 'beans', name: 'Túi cà phê phin rang mộc 250g', cost: 2500 },
];


// Dữ liệu cố định phía giao diện. Menu, giá, tồn kho lấy từ API GET /products (PostgreSQL).
import type { AppNotification, Category, Level, PaymentMethodId, Reward, SizeId, Store, Topping } from './types';

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

export const STORES: Store[] = [
  { id: 'adv', name: 'BrewLite An Dương Vương', shortName: 'An Dương Vương', address: '273 An Dương Vương, Phường 3, Quận 5, TP.HCM', hotline: '028 3835 0101', hours: '06:30 – 22:00', lat: 10.7598, lng: 106.6823 },
  { id: 'nh', name: 'BrewLite Nguyễn Huệ', shortName: 'Nguyễn Huệ', address: '42 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM', hotline: '028 3822 0202', hours: '07:00 – 23:00', lat: 10.7741, lng: 106.7037 },
  { id: 'vvn', name: 'BrewLite Võ Văn Ngân', shortName: 'Võ Văn Ngân', address: '1 Võ Văn Ngân, Linh Chiểu, TP. Thủ Đức', hotline: '028 3896 0303', hours: '06:30 – 21:30', lat: 10.8506, lng: 106.772 },
];

export const PAYMENT_METHODS: { id: PaymentMethodId; name: string; hint: string; group: string; badge: string; badgeColor: string }[] = [
  { id: 'MOMO', name: 'Ví MoMo', hint: 'Xác nhận trong ứng dụng MoMo', group: 'Ví điện tử', badge: 'Mo', badgeColor: '#a50064' },
  { id: 'ZALOPAY', name: 'ZaloPay', hint: 'Xác nhận trong ứng dụng ZaloPay', group: 'Ví điện tử', badge: 'Zp', badgeColor: '#0068ff' },
  { id: 'SHOPEEPAY', name: 'ShopeePay', hint: 'Xác nhận trong ứng dụng Shopee', group: 'Ví điện tử', badge: 'S', badgeColor: '#ee4d2d' },
  { id: 'VNPAY', name: 'VNPay', hint: 'Thanh toán qua cổng VNPay bằng app ngân hàng', group: 'Ví điện tử', badge: 'VN', badgeColor: '#005baa' },
  { id: 'VIETQR', name: 'Chuyển khoản VietQR', hint: 'Quét mã bằng app ngân hàng bất kỳ, nhận tiền qua Napas 247', group: 'Chuyển khoản', badge: 'QR', badgeColor: '#3b2a20' },
  { id: 'CARD', name: 'Thẻ ATM, Visa, Mastercard', hint: 'Nhập thẻ ở trang bảo mật của cổng thanh toán', group: 'Thẻ ngân hàng', badge: 'Thẻ', badgeColor: '#6f4e37' },
  { id: 'POINTS', name: 'Điểm BrewLite', hint: '1 điểm = 100đ', group: 'Điểm thưởng', badge: '★', badgeColor: '#a8650f' },
];

export const REWARDS: Reward[] = [
  { id: 'upsize', name: 'Nâng size miễn phí 1 ly', cost: 300 },
  { id: 'croissant', name: 'Bánh croissant bơ', cost: 600 },
  { id: 'free-s', name: 'Ly cà phê size S bất kỳ', cost: 800 },
];

export const NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', title: 'Ưu đãi MoMo tuần này', body: 'Nhập MOMO20 khi thanh toán bằng MoMo, giảm 20%, tối đa 25.000đ.', time: 'Hôm nay' },
  { id: 'n2', title: 'Món mới: Cà phê muối', body: 'Kem muối mặn nhẹ trên nền cà phê sữa đậm. Có ở mọi chi nhánh.', time: 'Hôm qua' },
  { id: 'n3', title: 'Bạn vừa nhận 1.250 điểm', body: 'Quà chào mừng thành viên mới. Dùng điểm để thanh toán hoặc đổi quà.', time: '3 ngày trước' },
];

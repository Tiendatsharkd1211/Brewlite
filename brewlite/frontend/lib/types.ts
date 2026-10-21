export type CategoryId = 'pha-may' | 'truyen-thong' | 'tra-da-xay' | 'banh-ngot';
export type SizeId = 'S' | 'M' | 'L';
export type Level = 0 | 30 | 50 | 100;
/** Hình thức nhận món trên giao diện (gửi lên API dạng PICKUP / DELIVERY) */
export type Fulfillment = 'pickup' | 'delivery';
export type PaymentMethodId = 'MOMO' | 'ZALOPAY' | 'SHOPEEPAY' | 'VNPAY' | 'VIETQR' | 'CARD' | 'POINTS';
export type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'PAYMENT_FAILED';

export interface Category {
  id: CategoryId;
  name: string;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
}

/** Sản phẩm trả về từ GET /products */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
  category: CategoryId;
  kind: 'drink' | 'food';
  tag: 'hot' | 'new' | null;
  rating: number;
  sold: number;
  hasIce: boolean;
  /** Màu đồ uống, dùng cho hình minh hoạ khi ảnh không tải được */
  color: string;
  /** Từ khoá phụ cho ô tìm kiếm, ví dụ tên gọi khác */
  keywords: string[];
  toppings: Topping[];
}

export interface Store {
  id: string;
  name: string;
  shortName: string;
  address: string;
  hotline: string;
  hours: string;
  lat: number;
  lng: number;
}

/** Một dòng trong giỏ hàng (lưu ở trình duyệt bằng Zustand) */
export interface CartItem {
  lineId: string;
  productId: string;
  name: string;
  size: SizeId | null;
  sugar: Level | null;
  ice: Level | null;
  toppingIds: string[];
  note: string;
  quantity: number;
  /** Giá hiển thị tạm tính; khi tạo đơn, backend tự tính lại từ CSDL */
  unitPrice: number;
}

export type NewCartItem = Omit<CartItem, 'lineId'>;

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  size: SizeId | null;
  sugar: number | null;
  ice: number | null;
  toppingIds: string[];
  note: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  subtotal: number;
  fee: number;
  discount: number;
  total: number;
  voucherCode: string | null;
  paymentMethod: PaymentMethodId;
  fulfillment: 'PICKUP' | 'DELIVERY';
  storeId: string;
  pickupTime: string;
  address: string;
  pickupCode: string;
  pointsEarned: number;
  pointsUsed: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface Payment {
  id: string;
  orderId: string;
  idempotencyKey: string;
  amount: number;
  method: PaymentMethodId;
  status: 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  failureReason: string | null;
}

/** Kết quả POST /payments */
export interface PaymentResult {
  payment: Payment;
  order: Order;
  /** true = backend trả lại kết quả cũ của cùng Idempotency-Key, không trừ tiền lần 2 */
  replayed: boolean;
}

export interface PointsEntry {
  id: string;
  at: string;
  label: string;
  delta: number;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
  points: number;
  pointsLog: PointsEntry[];
}

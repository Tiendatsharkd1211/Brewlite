export type CategoryId = 'pha-may' | 'truyen-thong' | 'tra-da-xay' | 'banh-ngot';
export type SizeId = 'S' | 'M' | 'L';
export type Level = 0 | 30 | 50 | 100;
/** Hình thức nhận món trên giao diện (gửi lên API dạng PICKUP / DELIVERY) */
export type Fulfillment = 'pickup' | 'delivery';
export type PaymentMethodId = 'MOMO' | 'ZALOPAY' | 'SHOPEEPAY' | 'VNPAY' | 'CARD' | 'POINTS';
/** Các phương thức trừ tiền vào tài khoản ảo liên kết (mọi phương thức trừ POINTS) */
export type WalletProvider = Exclude<PaymentMethodId, 'POINTS'>;
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

/** Chi nhánh duy nhất nhận đơn */
export interface Store {
  name: string;
  shortName: string;
  address: string;
  hours: string;
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
  pickupTime: string;
  address: string;
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
  walletId: string | null;
  status: 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  failureReason: string | null;
}

/** Một dòng biến động số dư của tài khoản ảo */
export interface WalletTransaction {
  id: string;
  type: 'OPENING' | 'TOPUP' | 'PAYMENT';
  amount: number;
  balanceAfter: number;
  orderId: string | null;
  note: string;
  createdAt: string;
}

/** Tài khoản ảo (ví / thẻ) đã liên kết, trả về từ GET /wallets */
export interface Wallet {
  id: string;
  provider: WalletProvider;
  holderName: string;
  maskedNumber: string;
  balance: number;
  createdAt: string;
  transactions?: WalletTransaction[];
}

/** Kết quả POST /payments */
export interface PaymentResult {
  payment: Payment;
  order: Order;
  /** Tài khoản ảo vừa bị trừ tiền (số dư sau giao dịch); null khi trả bằng điểm */
  wallet: Wallet | null;
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

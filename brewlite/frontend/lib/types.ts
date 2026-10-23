export type CategoryId = 'pha-may' | 'truyen-thong' | 'tra-da-xay' | 'banh-ngot';
export type SizeId = 'S' | 'M' | 'L';
export type Level = 0 | 30 | 50 | 100;
/** Hình thức nhận món trên giao diện (gửi lên API dạng PICKUP / DELIVERY) */
export type Fulfillment = 'pickup' | 'delivery';
/** VNPAY: trả qua cổng VNPay (sandbox). POINTS: trừ điểm BrewLite. */
export type PaymentMethodId = 'VNPAY' | 'POINTS';
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

/** PROCESSING: đã tạo link VNPay, chờ khách trả. NEEDS_REFUND: VNPay đã trừ tiền nhưng đơn đã trả bằng giao dịch khác / đã huỷ */
export type PaymentStatus = 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'NEEDS_REFUND';

/** Một giao dịch thanh toán (một lần bấm "Thanh toán") */
export interface Payment {
  id: string;
  orderId: string;
  idempotencyKey: string;
  amount: number;
  method: PaymentMethodId;
  status: PaymentStatus;
  failureReason: string | null;
  /** Mã giao dịch BrewLite gửi sang VNPay (vnp_TxnRef) */
  txnRef: string | null;
  payUrl: string | null;
  vnpCreateDate: string | null;
  expiresAt: string | null;
  /** Mã giao dịch tại VNPay */
  vnpTransactionNo: string | null;
  vnpBankCode: string | null;
  vnpBankTranNo: string | null;
  vnpCardType: string | null;
  /** Thời điểm trả tiền theo VNPay, dạng yyyyMMddHHmmss giờ Việt Nam */
  vnpPayDate: string | null;
  vnpResponseCode: string | null;
  vnpTransactionStatus: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Một lần trao đổi với VNPay: tạo link, VNPay chuyển khách về, IPN, đối soát */
export interface PaymentLog {
  id: string;
  source: 'CREATE' | 'RETURN' | 'IPN' | 'QUERY';
  message: string;
  data: Record<string, unknown> | null;
  createdAt: string;
}

/** Một dòng trong GET /payments/me */
export interface PaymentHistoryItem extends Payment {
  order: Pick<Order, 'id' | 'status' | 'total' | 'createdAt' | 'fulfillment'>;
}

/** GET /payments/:id */
export interface PaymentDetail extends Payment {
  order: Order;
  logs: PaymentLog[];
}

/** Kết quả POST /payments */
export interface PaymentResult {
  payment: Payment;
  order: Order;
  /** Link sang cổng VNPay: chuyển trình duyệt sang đây để khách trả tiền. null khi trả bằng điểm */
  payUrl: string | null;
  /** true = backend trả lại giao dịch cũ của cùng Idempotency-Key, không tạo giao dịch thứ 2 */
  replayed: boolean;
}

/** Kết quả GET /payments/vnpay/return */
export interface VnpayReturnResult {
  payment: Payment;
  order: Order;
  responseCode: string | null;
  message: string;
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

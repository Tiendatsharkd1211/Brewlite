import { statusLabel } from '@/lib/pricing';
import type { OrderStatus } from '@/lib/types';

// Trạng thái in như con dấu: đỏ là cần khách để ý, xanh là xong việc, xám là đã kết thúc
const STYLE: Record<OrderStatus, string> = {
  PENDING: 'text-gold-deep',
  PAYMENT_FAILED: 'text-chili',
  PAID: 'text-leaf',
  PREPARING: 'text-gold-deep',
  READY: 'bg-leaf text-foam border-leaf',
  COMPLETED: 'text-roast/60',
  CANCELLED: 'text-roast/45 line-through',
};

export default function OrderStatusPill({ status, fulfillment }: { status: OrderStatus; fulfillment: 'PICKUP' | 'DELIVERY' }) {
  return <span className={`stamp ${STYLE[status]}`}>{statusLabel(status, fulfillment)}</span>;
}

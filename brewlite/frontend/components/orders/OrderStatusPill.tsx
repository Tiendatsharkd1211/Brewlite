import { statusLabel } from '@/lib/pricing';
import type { OrderStatus } from '@/lib/types';

const STYLE: Record<OrderStatus, string> = {
  PENDING: 'bg-gold/20 text-gold-deep',
  PAYMENT_FAILED: 'bg-chili/10 text-chili',
  PAID: 'bg-leaf/15 text-leaf',
  PREPARING: 'bg-gold/25 text-gold-deep',
  READY: 'bg-leaf text-foam',
  COMPLETED: 'bg-roast/5 text-roast/60',
  CANCELLED: 'bg-roast/10 text-roast/50 line-through',
};

export default function OrderStatusPill({ status, fulfillment }: { status: OrderStatus; fulfillment: 'PICKUP' | 'DELIVERY' }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${STYLE[status]}`}>{statusLabel(status, fulfillment)}</span>;
}

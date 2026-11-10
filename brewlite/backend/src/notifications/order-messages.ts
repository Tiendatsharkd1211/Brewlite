import type { Fulfillment } from '@prisma/client';
import type { OrderStatus } from '../orders/order-state-machine';

/** Nội dung thông báo gửi khách mỗi khi đơn chuyển sang trạng thái mới. PENDING (thử thanh toán lại) không cần báo. */
export function orderMessage(orderId: string, to: OrderStatus, fulfillment: Fulfillment): { title: string; body: string } | null {
  switch (to) {
    case 'PAID':
      return { title: `Đã nhận thanh toán đơn ${orderId}`, body: 'Quầy đã nhận đơn và sẽ pha theo thứ tự. Bạn có thể theo dõi trạng thái ngay trên web.' };
    case 'PAYMENT_FAILED':
      return { title: `Thanh toán đơn ${orderId} chưa thành công`, body: 'Bạn chưa bị trừ tiền. Mở đơn để thanh toán lại hoặc huỷ đơn.' };
    case 'PREPARING':
      return { title: `Quầy đang pha đơn ${orderId}`, body: 'Món của bạn đang được pha, thường xong trong 5–10 phút.' };
    case 'READY':
      return fulfillment === 'DELIVERY'
        ? { title: `Đơn ${orderId} đang được giao`, body: 'Shipper đã nhận món và đang trên đường tới bạn.' }
        : { title: `Đơn ${orderId} đã sẵn sàng`, body: `Mời bạn tới quầy, đọc mã ${orderId} để nhận món.` };
    case 'COMPLETED':
      return { title: `Đơn ${orderId} đã hoàn tất`, body: 'Cảm ơn bạn đã ghé BrewLite. Điểm thưởng của đơn đã được cộng vào tài khoản.' };
    case 'CANCELLED':
      return { title: `Đơn ${orderId} đã huỷ`, body: 'Món trong đơn đã được trả lại kho. Nếu đã trả tiền, BrewLite sẽ hoàn lại cho bạn.' };
    default:
      return null;
  }
}

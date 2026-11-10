'use client';

// Quản lý mở trang khách để xem web đang hiển thị gì: ẩn các việc chỉ khách mới làm
// (giỏ hàng, đơn của tôi, yêu thích, đổi điểm, lưu mã) và thay bằng nút về trang quản lý.
import { useAuth } from '@/context/auth-context';

export function useManagerPreview(): boolean {
  const { user } = useAuth();
  return user?.role === 'MANAGER';
}

/** Trang chỉ có nghĩa với khách; quản lý mở vào thì đưa về trang nhất */
export const CUSTOMER_ONLY = /^\/(orders|account|payments|payment|checkout)(\/|$)/;

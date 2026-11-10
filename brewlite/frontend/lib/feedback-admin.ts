'use client';

// Góp ý khách gửi từ trang Liên hệ (GET /staff/feedback, chỉ quản lý). Trạng thái xử lý giữ ở lib/storefront.ts.
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';

export interface FeedbackRow {
  id: string;
  name: string;
  email: string;
  topic: string;
  orderCode: string | null;
  message: string;
  createdAt: string;
}

export const TOPIC_LABEL: Record<string, string> = {
  order: 'Đơn hàng, nhận món',
  payment: 'Thanh toán, hoàn tiền',
  points: 'Điểm, ưu đãi',
  drink: 'Đồ uống, món ăn',
  account: 'Tài khoản',
  other: 'Khác',
};

export function useFeedbackList() {
  const { status, user, request } = useAuth();
  return useQuery({
    queryKey: ['feedback', user?.id],
    queryFn: () => request<FeedbackRow[]>('/staff/feedback'),
    enabled: status === 'authed' && user?.role === 'MANAGER',
    staleTime: 30_000,
  });
}

'use client';

// Thông báo thật từ backend (GET /notifications/me): đơn đổi trạng thái, quà chào mừng. Hỏi lại mỗi 15 giây khi đã đăng nhập.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import type { AppNotification } from './types';

export interface NotificationFeed {
  items: AppNotification[];
  unread: number;
}

const KEY = ['notifications'] as const;

export function useNotifications() {
  const { status, request, user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    queryFn: () => request<NotificationFeed>('/notifications/me'),
    enabled: status === 'authed',
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

/** Đánh dấu đã đọc một thông báo (id) hoặc tất cả (không truyền id) */
export function useMarkRead() {
  const { request, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id?: string) => request<NotificationFeed>(id ? `/notifications/${id}/read` : '/notifications/read-all', { method: 'POST' }),
    onSuccess: (feed) => qc.setQueryData([...KEY, user?.id], feed),
  });
}

/** "vừa xong", "5 phút trước", "2 giờ trước", "3 ngày trước" */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

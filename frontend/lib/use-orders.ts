'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { ApiError } from './api';
import type { Order } from './types';

/** Lịch sử đơn của tài khoản đang đăng nhập (GET /orders/me) */
export function useMyOrders() {
  const { status, request } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setOrders(await request<Order[]>('/orders/me'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được danh sách đơn hàng.');
    }
  }, [request]);

  useEffect(() => {
    if (status === 'authed') reload();
  }, [status, reload]);

  return { orders, error, reload };
}

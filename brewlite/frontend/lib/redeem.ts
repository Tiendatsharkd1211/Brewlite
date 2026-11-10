'use client';

// Đổi điểm lấy quà (POST /auth/redeem): trừ điểm, backend gửi mã quà vào mục Thông báo
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { ApiError } from './api';
import type { User } from './types';

export function useRedeem() {
  const { request, setUser } = useAuth();
  const qc = useQueryClient();
  const [redeeming, setRedeeming] = useState<string | null>(null);

  /** Thành công thì chuông thông báo tự bật dòng báo kèm mã quà (trả về null); lỗi thì trả câu báo lỗi */
  async function redeem(rewardId: string): Promise<string | null> {
    setRedeeming(rewardId);
    try {
      setUser(await request<User>('/auth/redeem', { method: 'POST', body: { rewardId } }));
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      return null;
    } catch (err) {
      return err instanceof ApiError ? err.message : 'Chưa đổi được quà, thử lại sau.';
    } finally {
      setRedeeming(null);
    }
  }

  return { redeem, redeeming };
}

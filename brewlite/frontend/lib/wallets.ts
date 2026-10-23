'use client';

// TÀI KHOẢN ẢO LIÊN KẾT (ví điện tử / thẻ). Số dư lưu ở backend (bảng WalletAccount),
// thanh toán thành công thì backend trừ thẳng vào số dư này.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import type { Wallet, WalletProvider } from './types';

export const WALLETS_KEY = ['wallets'] as const;

/** Mức nạp nhanh gợi ý trên giao diện (backend cho phép 10.000đ – 2.000.000đ mỗi lần) */
export const TOPUP_PRESETS = [50_000, 100_000, 200_000, 500_000];
export const TOPUP_MIN = 10_000;
export const TOPUP_MAX = 2_000_000;

/** GET /wallets: tài khoản ảo của người đang đăng nhập */
export function useWallets() {
  const { status, user, request } = useAuth();
  return useQuery({
    queryKey: [...WALLETS_KEY, user?.id],
    queryFn: () => request<Wallet[]>('/wallets'),
    enabled: status === 'authed',
  });
}

export function useWalletActions() {
  const { request } = useAuth();
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: WALLETS_KEY });

  const link = useMutation({
    mutationFn: (body: { provider: WalletProvider; accountNumber: string; holderName?: string }) => request<Wallet>('/wallets', { method: 'POST', body }),
    onSuccess,
  });
  const topup = useMutation({
    mutationFn: ({ walletId, amount }: { walletId: string; amount: number }) =>
      request<Wallet>(`/wallets/${encodeURIComponent(walletId)}/topup`, { method: 'POST', body: { amount } }),
    onSuccess,
  });
  const unlink = useMutation({
    mutationFn: (walletId: string) => request<{ ok: true }>(`/wallets/${encodeURIComponent(walletId)}`, { method: 'DELETE' }),
    onSuccess,
  });
  return { link, topup, unlink, refresh: onSuccess };
}

/** Gợi ý định dạng số khi liên kết: ví dùng số điện thoại, thẻ dùng 16 số */
export function accountNumberHint(provider: WalletProvider): { label: string; placeholder: string; inputMode: 'tel' | 'numeric' } {
  return provider === 'CARD'
    ? { label: 'Số thẻ (16 số)', placeholder: '4242 4242 4242 4242', inputMode: 'numeric' }
    : { label: 'Số điện thoại đăng ký ví', placeholder: '0901 234 567', inputMode: 'tel' };
}

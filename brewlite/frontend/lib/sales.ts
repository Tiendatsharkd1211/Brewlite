'use client';

// SỐ LIỆU BÁN HÀNG cho trang Tổng quan của quản lý: tính từ đơn thật ở máy chủ (backend/src/manage/overview.ts).
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';

export type Range = 'today' | '7d' | '30d';
export const RANGE_LABEL: Record<Range, string> = { today: 'Hôm nay', '7d': '7 ngày', '30d': '30 ngày' };

export type OrderState = 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED';
export interface SaleOrder {
  code: string;
  at: Date;
  customer: string;
  items: { productId: string; qty: number; price: number }[];
  total: number;
  method: 'VNPAY' | 'POINTS';
  state: OrderState;
}

export interface Bucket {
  label: string;
  /** Nhãn đầy đủ cho chú thích khi rê chuột */
  title: string;
  revenue: number;
  orders: number;
}

export interface SalesSummary {
  revenue: number;
  orders: number;
  cups: number;
  aov: number;
  prev: { revenue: number; orders: number; cups: number; aov: number };
  prevLabel: string;
  buckets: Bucket[];
  top: { productId: string; qty: number; revenue: number }[];
  methods: { VNPAY: number; POINTS: number };
  recent: SaleOrder[];
}

/** Số liệu Tổng quan từ đơn thật (GET /staff/overview), tự làm mới mỗi 30 giây */
export function useSales(range: Range) {
  const { status, user, request } = useAuth();
  return useQuery({
    queryKey: ['overview', range],
    queryFn: async () => {
      const raw = await request<Omit<SalesSummary, 'recent'> & { recent: (Omit<SaleOrder, 'at'> & { at: string })[] }>(`/staff/overview?range=${range}`);
      return { ...raw, recent: raw.recent.map((o) => ({ ...o, at: new Date(o.at) })) } satisfies SalesSummary;
    },
    enabled: status === 'authed' && user?.role === 'MANAGER',
    refetchInterval: 30_000,
  });
}

/** Số tiền gọn cho trục và ô số liệu: 1,2 tr · 850 N */
export function compactVnd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (n >= 1000) return `${Math.round(n / 1000).toLocaleString('vi-VN')} N`;
  return String(n);
}

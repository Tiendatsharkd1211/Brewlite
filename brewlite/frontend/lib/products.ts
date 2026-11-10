'use client';

// Menu lấy từ backend bằng React Query: tự cache, tự thử lại, có trạng thái loading/lỗi.
// Khách: GET /products (máy chủ đã bỏ món ẩn). Quản lý: GET /staff/products (cả món ẩn, kèm cờ ẩn / báo hết).
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from './api';
import { applyEdit } from './storefront';
import type { Product } from './types';

export const PRODUCTS_KEY = ['products'] as const;

/** Tất cả món; với quản lý gồm cả món đang ẩn */
export function useAllProducts() {
  const { status, user, request } = useAuth();
  const manager = status === 'authed' && user?.role === 'MANAGER';
  const query = useQuery({
    queryKey: [...PRODUCTS_KEY, manager ? 'manager' : 'public'],
    queryFn: () => (manager ? request<Product[]>('/staff/products') : apiRequest<Product[]>('/products')),
    enabled: status !== 'loading',
    staleTime: 30_000,
    // Trang khách đang mở cũng tự cập nhật khi quản lý ẩn món, đổi giá, báo hết (cùng nhịp 20 giây với StorefrontSync)
    refetchInterval: manager ? false : 20_000,
  });
  const data = useMemo(() => query.data?.map((p) => applyEdit(p)), [query.data]);
  return { ...query, data };
}

/** Món khách thấy được */
export function useProducts() {
  const query = useAllProducts();
  const data = useMemo(() => query.data?.filter((p) => !p.hidden), [query.data]);
  return { ...query, data };
}

/** Tra cứu nhanh sản phẩm theo id (ảnh trong giỏ hàng, đơn hàng...), gồm cả món đang ẩn */
export function useProductMap(): Map<string, Product> {
  const { data } = useAllProducts();
  return useMemo(() => new Map((data ?? []).map((p) => [p.id, p])), [data]);
}

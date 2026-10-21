'use client';

// Menu lấy từ backend (GET /products) bằng React Query: tự cache, tự thử lại, có trạng thái loading/lỗi.
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiRequest } from './api';
import type { Product } from './types';

export const PRODUCTS_KEY = ['products'] as const;

export function useProducts() {
  return useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: () => apiRequest<Product[]>('/products'),
    staleTime: 30_000,
  });
}

/** Tra cứu nhanh sản phẩm theo id (ảnh trong giỏ hàng, đơn hàng...) */
export function useProductMap(): Map<string, Product> {
  const { data } = useProducts();
  return useMemo(() => new Map((data ?? []).map((p) => [p.id, p])), [data]);
}

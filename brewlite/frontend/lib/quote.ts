'use client';

// Báo giá giỏ hàng từ máy chủ (POST /orders/quote): giá từng dòng theo CSDL, mã giảm giá thật (kể cả mã quản lý
// vừa tạo, mã tạm dừng, hết hạn), món hết hàng / thiếu nguyên liệu. Trang thanh toán hiện đúng số máy chủ sẽ thu.
import { useEffect, useState } from 'react';
import { apiRequest } from './api';
import type { CartItem, Fulfillment, PaymentMethodId } from './types';

export interface Quote {
  lines: { productId: string; unitPrice: number; lineTotal: number; problem: string | null }[];
  subtotal: number;
  fee: number;
  discount: number;
  total: number;
  voucher: { code: string; ok: boolean; label?: string; message?: string } | null;
  /** Mọi món đều đặt được */
  ok: boolean;
}

export function fetchQuote(cart: CartItem[], fulfillment: Fulfillment, method: PaymentMethodId | null, code: string | null) {
  return apiRequest<Quote>('/orders/quote', {
    method: 'POST',
    body: {
      items: cart.map((i) => ({ productId: i.productId, size: i.size, sugar: i.sugar, ice: i.ice, toppingIds: i.toppingIds, note: i.note, qty: i.quantity })),
      fulfillment: fulfillment === 'pickup' ? 'PICKUP' : 'DELIVERY',
      ...(method ? { paymentMethod: method } : {}),
      ...(code ? { voucherCode: code } : {}),
    },
  });
}

/** Báo giá lại mỗi khi giỏ, cách nhận, phương thức, mã đổi (chờ 250ms để không gọi theo từng phím bấm) */
export function useQuote(cart: CartItem[], fulfillment: Fulfillment, method: PaymentMethodId | null, code: string | null, enabled: boolean) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const key = JSON.stringify([cart.map((i) => [i.productId, i.size, i.sugar, i.ice, i.toppingIds, i.quantity]), fulfillment, method, code]);
  useEffect(() => {
    if (!enabled) return setQuote(null);
    let live = true;
    const t = setTimeout(() => {
      fetchQuote(cart, fulfillment, method, code)
        .then((q) => live && setQuote(q))
        .catch(() => live && setQuote(null)); // mất mạng: giữ tạm tính ở trình duyệt, lúc đặt máy chủ vẫn tính lại
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [key, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return quote;
}

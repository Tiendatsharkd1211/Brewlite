'use client';

// Nạp mã giảm giá, nội dung trang, trạng thái góp ý từ máy chủ vào store (lib/storefront.ts);
// quản lý thì nạp bản đầy đủ. Gắn hàm tải lại thực đơn để store gọi sau khi sửa món.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { PRODUCTS_KEY } from '@/lib/products';
import { useInventory } from '@/lib/inventory';
import { onProductsChanged, useStorefront } from '@/lib/storefront';

export default function StorefrontSync() {
  const { status, user } = useAuth();
  const qc = useQueryClient();
  const manager = status === 'authed' && user?.role === 'MANAGER';

  useEffect(() => onProductsChanged(() => void qc.invalidateQueries({ queryKey: PRODUCTS_KEY })), [qc]);
  useEffect(() => {
    if (status === 'loading') return;
    void useStorefront.getState().load(manager);
  }, [status, manager]);

  // Kho chỉ quản lý xem; quầy pha đơn làm tồn đổi nên nạp lại định kỳ để thấy số mới
  useEffect(() => {
    if (!manager) return;
    const reload = () => void useInventory.getState().load();
    reload();
    const t = setInterval(reload, 20_000);
    window.addEventListener('focus', reload);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', reload);
    };
  }, [manager]);
  return null;
}

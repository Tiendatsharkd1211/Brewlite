import type { Metadata } from 'next';
import { Suspense } from 'react';
import VoucherManager from '@/components/manager/VoucherManager';

export const metadata: Metadata = { title: 'Mã giảm giá – Quản lý BrewLite' };

export default function Page() {
  // Suspense: component đọc tham số trên địa chỉ (useSearchParams)
  return (
    <Suspense>
      <VoucherManager />
    </Suspense>
  );
}

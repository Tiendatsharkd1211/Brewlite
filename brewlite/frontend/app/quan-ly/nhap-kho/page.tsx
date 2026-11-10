import type { Metadata } from 'next';
import { Suspense } from 'react';
import Receipts from '@/components/manager/Receipts';

export const metadata: Metadata = { title: 'Nhập kho – Quản lý BrewLite' };

export default function Page() {
  // Suspense: component đọc tham số trên địa chỉ (useSearchParams)
  return (
    <Suspense>
      <Receipts />
    </Suspense>
  );
}

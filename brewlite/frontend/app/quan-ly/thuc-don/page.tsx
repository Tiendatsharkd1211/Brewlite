import type { Metadata } from 'next';
import { Suspense } from 'react';
import MenuManager from '@/components/manager/MenuManager';

export const metadata: Metadata = { title: 'Thực đơn – Quản lý BrewLite' };

export default function Page() {
  // Suspense: component đọc tham số trên địa chỉ (useSearchParams)
  return (
    <Suspense>
      <MenuManager />
    </Suspense>
  );
}

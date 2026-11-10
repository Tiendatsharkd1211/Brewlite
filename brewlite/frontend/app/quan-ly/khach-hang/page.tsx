import type { Metadata } from 'next';
import { Suspense } from 'react';
import Customers from '@/components/manager/Customers';

export const metadata: Metadata = { title: 'Tài khoản khách – Quản lý BrewLite' };

export default function Page() {
  // Suspense: component đọc tham số trên địa chỉ (useSearchParams)
  return (
    <Suspense>
      <Customers />
    </Suspense>
  );
}

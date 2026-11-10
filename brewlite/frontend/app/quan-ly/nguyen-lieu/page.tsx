import type { Metadata } from 'next';
import { Suspense } from 'react';
import Ingredients from '@/components/manager/Ingredients';

export const metadata: Metadata = { title: 'Nguyên liệu – Quản lý BrewLite' };

export default function Page() {
  // Suspense: component đọc tham số trên địa chỉ (useSearchParams)
  return (
    <Suspense>
      <Ingredients />
    </Suspense>
  );
}

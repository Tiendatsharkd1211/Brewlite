import type { Metadata } from 'next';
import { Suspense } from 'react';
import ContentEditor from '@/components/manager/ContentEditor';

export const metadata: Metadata = { title: 'Nội dung trang – Quản lý BrewLite' };

export default function Page() {
  // Suspense: component đọc tham số trên địa chỉ (useSearchParams)
  return (
    <Suspense>
      <ContentEditor />
    </Suspense>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import FeedbackInbox from '@/components/manager/FeedbackInbox';

export const metadata: Metadata = { title: 'Phản hồi – Quản lý BrewLite' };

export default function Page() {
  // Suspense: component đọc tham số trên địa chỉ (useSearchParams)
  return (
    <Suspense>
      <FeedbackInbox />
    </Suspense>
  );
}

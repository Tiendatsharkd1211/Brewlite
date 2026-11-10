import type { Metadata } from 'next';
import InternalShell from '@/components/internal/InternalShell';
import StaffQueue from '@/components/staff/StaffQueue';

export const metadata: Metadata = { title: 'Quầy pha chế – BrewLite' };

export default function StaffPage() {
  return (
    <InternalShell>
      <main className="mx-auto max-w-[100rem] px-4 pb-16 pt-5 lg:px-6">
        <StaffQueue />
      </main>
    </InternalShell>
  );
}

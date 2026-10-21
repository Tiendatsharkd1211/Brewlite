import type { Metadata } from 'next';
import MenuBrowser from '@/components/menu/MenuBrowser';

export const metadata: Metadata = { title: 'Thực đơn – BrewLite' };

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-16">
      {/* key={q}: tìm từ khoá mới thì làm mới bộ lọc */}
      <MenuBrowser key={q} initialQuery={q} title="Thực đơn" />
    </main>
  );
}

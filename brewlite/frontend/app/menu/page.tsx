import type { Metadata } from 'next';
import MenuBrowser from '@/components/menu/MenuBrowser';
import { CATEGORIES } from '@/lib/mock-data';
import type { CategoryId } from '@/lib/types';

export const metadata: Metadata = { title: 'Thực đơn – BrewLite' };

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ q?: string; nhom?: string }> }) {
  const { q = '', nhom } = await searchParams;
  // Chỉ nhận đúng mã nhóm có thật; gõ bậy trên địa chỉ thì hiện tất cả
  const category = CATEGORIES.find((c) => c.id === nhom)?.id as CategoryId | undefined;
  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-16">
      {/* key: đổi từ khoá hoặc nhóm thì làm mới bộ lọc */}
      <MenuBrowser key={`${q}|${category ?? ''}`} initialQuery={q} initialCategory={category} title="Thực đơn" />
    </main>
  );
}

import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/safe-next';

// Đã gộp về một trang đăng nhập chung (/login); giữ đường dẫn cũ để link, dấu trang cũ không bị gãy
export default async function OldInternalLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
}

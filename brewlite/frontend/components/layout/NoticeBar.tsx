'use client';

// Dải thông báo trên cùng (khuyến mãi, nghỉ lễ...) do quản lý bật ở khu Quản lý > Nội dung trang
import Link from 'next/link';
import { useStorefront } from '@/lib/storefront';

export default function NoticeBar() {
  const notice = useStorefront((s) => s.content.notice);
  if (!notice.on || !notice.text.trim()) return null;
  const body = <span className="font-label text-xs font-semibold uppercase tracking-wider">{notice.text}</span>;
  return (
    <div className="bg-gold px-4 py-1.5 text-center text-foam">
      {notice.href ? (
        <Link href={notice.href} className="underline-offset-4 hover:underline">
          {body} <span aria-hidden="true">→</span>
        </Link>
      ) : (
        body
      )}
    </div>
  );
}

'use client';

// Khung khu Quản lý cửa hàng (quyền MANAGER do InternalShell kiểm tra); thanh mục chia nhóm bên trái (máy tính) hoặc hàng tab cuộn ngang (điện thoại)
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { stateOf, useInventory } from '@/lib/inventory';
import { MANAGER_GROUPS } from '@/lib/manager-nav';
import { useFeedbackList } from '@/lib/feedback-admin';
import { useStorefront } from '@/lib/storefront';
import InternalShell from '@/components/internal/InternalShell';
import Toast from '@/components/ui/Toast';
import QuickSearch from './QuickSearch';

export default function ManagerShell({ children }: { children: ReactNode }) {
  return (
    <InternalShell>
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6">
        <ManagerNav>{children}</ManagerNav>
      </main>
    </InternalShell>
  );
}

function ManagerNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const alerts = useInventory((s) => s.ingredients.filter((i) => stateOf(i) !== 'ok').length);
  const { data: feedback = [] } = useFeedbackList();
  const states = useStorefront((s) => s.feedback);
  const unread = feedback.filter((f) => (states[f.id]?.status ?? 'new') === 'new').length;
  // Số nhỏ cạnh mục: việc đang chờ quản lý
  const badges: Record<string, { n: number; tone: string } | undefined> = {
    '/quan-ly/nguyen-lieu': alerts ? { n: alerts, tone: 'bg-chili' } : undefined,
    '/quan-ly/phan-hoi': unread ? { n: unread, tone: 'bg-gold' } : undefined,
  };

  const active = (href: string) => (href === '/quan-ly' ? pathname === href : pathname.startsWith(href));

  return (
    <div className="lg:grid lg:grid-cols-[13rem_1fr] lg:gap-8">
      {/* Cột trái: ô tìm nhanh rồi các mục (một ô tìm duy nhất cho cả máy tính và điện thoại) */}
      <div className="lg:sticky lg:top-20 lg:self-start lg:border-r-2 lg:border-roast lg:pr-4">
        <div className="mb-4">
          <QuickSearch />
        </div>
        <nav aria-label="Mục quản lý" className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto border-b-2 border-roast px-4 lg:mx-0 lg:mb-0 lg:block lg:border-b-0 lg:px-0">
          {MANAGER_GROUPS.map((g) => (
            <div key={g.title || 'home'} className="contents lg:mb-4 lg:block">
              {g.title && <p className="kicker hidden px-3 pb-1 pt-2 lg:block">{g.title}</p>}
              {g.items.map((s) => {
                const badge = badges[s.href];
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    aria-current={active(s.href) ? 'page' : undefined}
                    className={`flex shrink-0 items-center justify-between gap-2 border-b-[3px] px-3 py-2 font-label text-sm font-semibold uppercase tracking-wider lg:border-b-0 lg:border-l-[3px] ${
                      active(s.href) ? 'border-gold text-roast lg:bg-roast/5' : 'border-transparent text-roast/60 hover:text-roast'
                    }`}
                  >
                    {s.label}
                    {badge ? <span className={`px-1.5 font-mono text-[10px] leading-4 text-foam ${badge.tone}`}>{badge.n}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="min-w-0">
        {children}
      </div>
      <SaveError />
    </div>
  );
}

/** Máy chủ từ chối một thao tác lưu (sai dữ liệu, mã đã có người dùng...): hiện lý do */
function SaveError() {
  const error = useStorefront((s) => s.error);
  const clearError = useStorefront((s) => s.clearError);
  return <Toast message={error ? `Chưa lưu được: ${error}` : null} onDone={clearError} />;
}

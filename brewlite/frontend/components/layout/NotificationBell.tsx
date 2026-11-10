'use client';

// CHUÔNG THÔNG BÁO: số chưa đọc, danh sách thông báo thật, và một dòng báo bật lên khi có thông báo mới (đơn đã sẵn sàng...)
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/auth-context';
import { timeAgo, useMarkRead, useNotifications } from '@/lib/notifications';
import type { AppNotification } from '@/lib/types';
import Toast from '@/components/ui/Toast';
import { BellIcon } from '@/components/ui/Icons';

export default function NotificationBell({ withLabel }: { withLabel?: boolean }) {
  const router = useRouter();
  const { status } = useAuth();
  const { data } = useNotifications();
  const markRead = useMarkRead();
  const [open, setOpen] = useState(false);
  const [popup, setPopup] = useState<AppNotification | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài khung hoặc nhấn Esc thì đóng, như các trang web thường làm
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Lần tải đầu chỉ ghi nhớ; các lần hỏi lại sau, thông báo nào mới xuất hiện thì bật dòng báo
  useEffect(() => {
    if (!data) return;
    if (!seen.current) {
      seen.current = new Set(data.items.map((n) => n.id));
      return;
    }
    const known = seen.current;
    const fresh = data.items.find((n) => !known.has(n.id) && !n.readAt);
    data.items.forEach((n) => known.add(n.id));
    if (fresh) setPopup(fresh);
  }, [data]);

  const unread = data?.unread ?? 0;

  function openItem(n: AppNotification) {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    if (n.orderId) router.push(`/orders/${n.orderId}`);
  }

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
        className="relative flex h-11 items-center gap-2 px-2 hover:bg-roast/5"
      >
        <BellIcon className="h-7 w-7" />
        {withLabel && <span className="hidden text-sm font-medium lg:inline">Thông báo</span>}
        {unread > 0 && (
          <span className="absolute left-5 top-0.5 h-5 min-w-5 bg-gold px-1 text-center font-mono text-[11px] font-semibold leading-5 text-foam">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
          <div className="fixed inset-x-3 top-16 z-40 max-h-[70dvh] overflow-y-auto border-2 border-roast bg-foam sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
            <div className="flex items-center justify-between border-b-[3px] border-double border-roast px-4 py-3">
              <p className="font-display text-xl font-black">Thông báo</p>
              {unread > 0 && (
                <button type="button" onClick={() => markRead.mutate(undefined)} className="text-xs font-semibold normal-case underline underline-offset-4 hover:text-gold">
                  Đánh dấu đã đọc hết
                </button>
              )}
            </div>
            {status !== 'authed' ? (
              <div className="px-4 py-6 text-center text-sm">
                <p>Đăng nhập để được báo khi ly của bạn đang pha và khi đã sẵn sàng.</p>
                <Link href="/login" onClick={() => setOpen(false)} className="mt-3 inline-flex h-10 items-center bg-gold px-5 font-label text-sm font-semibold uppercase tracking-wider text-foam">
                  Đăng nhập
                </Link>
              </div>
            ) : !data ? (
              <p className="px-4 py-6 text-center text-sm text-roast/60">Đang tải…</p>
            ) : data.items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-roast/60">Chưa có thông báo nào.</p>
            ) : (
              <ul>
                {data.items.map((n) => (
                  <li key={n.id} className="border-b border-dotted border-roast/50 last:border-b-0">
                    <button type="button" onClick={() => openItem(n)} className={`block w-full px-4 py-3 text-left normal-case tracking-normal hover:bg-cream ${n.readAt ? 'opacity-70' : ''}`}>
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="flex items-center gap-2 font-display text-[15px] font-bold leading-snug">
                          {!n.readAt && <span className="h-2 w-2 shrink-0 bg-gold" aria-label="chưa đọc" />}
                          {n.title}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-roast/55">{timeAgo(n.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 block font-serif text-sm leading-snug text-roast/75">{n.body}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
      )}

      {/* Phần đầu trang dính trên cùng nên dòng báo phải gắn thẳng vào body mới nằm đúng đáy màn hình */}
      {popup &&
        createPortal(
          <Toast
            message={`${popup.title}. ${popup.body}`}
            actionHref={popup.orderId ? `/orders/${popup.orderId}` : undefined}
            actionLabel={popup.orderId ? 'Xem đơn' : undefined}
            onDone={() => setPopup(null)}
          />,
          document.body,
        )}
    </div>
  );
}

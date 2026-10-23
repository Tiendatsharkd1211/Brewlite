'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

interface Props {
  message: string | null;
  actionHref?: string;
  actionLabel?: string;
  onDone: () => void;
  /** Đẩy toast lên cao khi trang có thanh nút cố định ở đáy */
  raised?: boolean;
}

/** Thông báo ngắn, tự ẩn sau 4 giây */
export default function Toast({ message, actionHref, actionLabel, onDone, raised }: Props) {
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => doneRef.current(), 4000);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div aria-live="polite" className={`pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 ${raised ? 'bottom-32' : 'bottom-24'} md:bottom-8`}>
      {message && (
        <div key={message} className="pointer-events-auto flex max-w-md animate-toast-in items-center gap-4 rounded-2xl bg-roast px-5 py-3 text-sm text-foam shadow-[0_18px_40px_-12px_rgba(59,42,32,.6)]">
          <span>{message}</span>
          {actionHref && actionLabel && (
            <Link href={actionHref} className="shrink-0 font-semibold text-gold underline-offset-4 hover:underline">
              {actionLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

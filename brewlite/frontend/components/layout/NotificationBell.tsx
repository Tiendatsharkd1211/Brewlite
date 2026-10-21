'use client';

import { useState } from 'react';
import { NOTIFICATIONS } from '@/lib/mock-data';
import { BellIcon } from '@/components/ui/Icons';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [readAll, setReadAll] = useState(false);
  const unread = readAll ? 0 : NOTIFICATIONS.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setReadAll(true);
        }}
        aria-expanded={open}
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
        className="relative grid h-10 w-10 place-items-center rounded-full text-roast hover:bg-roast/5"
      >
        <BellIcon className="h-6 w-6" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-chili ring-2 ring-cream" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-roast/10 bg-foam p-2 shadow-xl">
            <p className="px-3 pb-1 pt-2 font-bold">Thông báo</p>
            <ul>
              {NOTIFICATIONS.map((n) => (
                <li key={n.id} className="rounded-xl px-3 py-2.5 hover:bg-cream">
                  <p className="flex items-baseline justify-between gap-3 text-sm font-semibold">
                    {n.title}
                    <span className="shrink-0 text-xs font-normal text-roast/50">{n.time}</span>
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-roast/70">{n.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

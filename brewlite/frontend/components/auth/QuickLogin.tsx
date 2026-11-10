'use client';

// Đăng nhập một chạm bằng tài khoản mẫu (chỉ hiện khi bật chế độ trình bày)
import { useState } from 'react';
import type { DemoAccount } from '@/lib/demo';

export default function QuickLogin({ title, accounts, onPick }: { title: string; accounts: DemoAccount[]; onPick: (a: DemoAccount) => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <section aria-label={title} className="border-2 border-dashed border-roast/40 p-4">
      <p className="kicker">{title}</p>
      <ul className="mt-3 space-y-2">
        {accounts.map((a) => (
          <li key={a.email}>
            <button
              type="button"
              disabled={busy !== null}
              onClick={async () => {
                setBusy(a.email);
                try {
                  await onPick(a);
                } finally {
                  setBusy(null);
                }
              }}
              className="plain-btn group flex w-full items-center gap-3 border-2 border-roast bg-foam px-3 py-2.5 text-left transition-colors hover:bg-roast hover:text-cream disabled:opacity-60"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center bg-roast font-label text-sm font-semibold text-cream group-hover:bg-gold">{a.initials}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="font-semibold">{a.name}</span>
                  <span className="font-label text-[10px] uppercase tracking-wider opacity-60">{a.role}</span>
                </span>
                <span className="block truncate text-xs opacity-70">{a.note}</span>
              </span>
              <span className="shrink-0 font-label text-xs font-semibold uppercase tracking-wider">{busy === a.email ? 'Đang vào…' : 'Vào →'}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 font-mono text-[11px] text-roast/55">{accounts.length > 1 ? 'Các tài khoản mẫu' : 'Tài khoản mẫu'} dùng chung mật khẩu Brewlite123</p>
    </section>
  );
}

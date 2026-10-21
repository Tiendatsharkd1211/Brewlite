'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Gọi GET /health của backend NestJS để biết hai phần đã nối được chưa */
export default function BackendStatus() {
  const [state, setState] = useState<'checking' | 'ok' | 'down'>('checking');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!cancelled) setState('ok');
      })
      .catch(() => {
        if (!cancelled) setState('down');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const text = {
    checking: 'Đang kiểm tra kết nối máy chủ…',
    ok: `Đã kết nối máy chủ tại ${API_URL}`,
    down: `Chưa gọi được máy chủ tại ${API_URL}. Kiểm tra cửa sổ BrewLite Backend.`,
  }[state];
  const dot = { checking: 'bg-roast/30', ok: 'bg-leaf', down: 'bg-chili' }[state];

  return (
    <p className="flex items-center gap-2 text-sm text-roast/70" role="status">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {text}
    </p>
  );
}

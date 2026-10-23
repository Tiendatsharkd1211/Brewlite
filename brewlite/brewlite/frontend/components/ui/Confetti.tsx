'use client';

import { useMemo, type CSSProperties } from 'react';

const COLORS = ['#e09a2b', '#6f4e37', '#3d7a4f', '#c99a6b', '#fffaf2', '#b23a2a'];

/** Pháo giấy rơi một lần khi thanh toán thành công (tự tắt nếu máy bật giảm chuyển động) */
export default function Confetti({ pieces = 70 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.8 + Math.random() * 1.4,
        dx: `${(Math.random() - 0.5) * 240}px`,
        rot: `${(Math.random() - 0.5) * 1080}deg`,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
      })),
    [pieces],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden motion-reduce:hidden" aria-hidden="true">
      {items.map((p) => (
        <span
          key={p.id}
          className="absolute -top-6 rounded-[2px]"
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.h,
              background: p.color,
              '--dx': p.dx,
              '--rot': p.rot,
              animation: `confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(.2,.6,.4,1) forwards`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

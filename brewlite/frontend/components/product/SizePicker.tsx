'use client';

import { SIZES } from '@/lib/mock-data';
import { formatVnd } from '@/lib/format';
import type { SizeId } from '@/lib/types';

// Chiều cao hình cốc trên nút, tăng dần theo size
const CUP_HEIGHT: Record<SizeId, number> = { S: 30, M: 40, L: 50 };

export default function SizePicker({ value, onChange }: { value: SizeId; onChange: (size: SizeId) => void }) {
  return (
    <div role="radiogroup" aria-label="Chọn size" className="grid grid-cols-3 gap-3">
      {SIZES.map((s) => {
        const active = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s.id)}
            className={`flex flex-col items-center rounded-2xl border-2 px-2 pb-3 pt-4 transition-colors ${active ? 'border-espresso bg-espresso text-foam' : 'border-roast/15 bg-foam text-roast hover:border-espresso/50'}`}
          >
            <span className="flex h-[52px] items-end" aria-hidden="true">
              <svg width={CUP_HEIGHT[s.id] * 0.78} height={CUP_HEIGHT[s.id]} viewBox="0 0 39 50" preserveAspectRatio="none">
                <path d="M4 7 H35 L31.5 46.5 Q31 49 28 49 H11 Q8 49 7.5 46.5 Z" fill="currentColor" opacity={active ? 1 : 0.8} />
                <rect x="1" y="1" width="37" height="6" rx="3" fill="currentColor" />
              </svg>
            </span>
            <span className="mt-2 text-lg font-extrabold leading-none">{s.id}</span>
            <span className={`mt-1 text-xs ${active ? 'text-foam/75' : 'text-roast/55'}`}>{s.volume}</span>
            <span className="mt-1 text-xs font-semibold tabular-nums">{s.extra ? `+${formatVnd(s.extra)}` : 'Giá gốc'}</span>
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { LEVELS } from '@/lib/mock-data';
import type { Level } from '@/lib/types';

export const SUGAR_HINT: Record<Level, string> = { 0: 'Không đường', 30: 'Ít ngọt', 50: 'Ngọt vừa', 100: 'Ngọt chuẩn' };
export const ICE_HINT: Record<Level, string> = { 0: 'Không đá', 30: 'Ít đá', 50: 'Đá vừa', 100: 'Đá chuẩn' };

interface Props {
  label: string;
  value: Level;
  onChange: (level: Level) => void;
}

/** Thanh chọn mức 0% / 30% / 50% / 100% */
export default function LevelPicker({ label, value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-4 overflow-hidden rounded-xl border-2 border-roast/15 bg-foam">
      {LEVELS.map((lv, i) => {
        const active = lv === value;
        return (
          <button
            key={lv}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(lv)}
            className={`py-2.5 text-sm font-semibold tabular-nums transition-colors ${i > 0 ? 'border-l border-roast/10' : ''} ${active ? 'bg-espresso text-foam' : 'hover:bg-cream'}`}
          >
            {lv}%
          </button>
        );
      })}
    </div>
  );
}

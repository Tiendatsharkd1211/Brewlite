'use client';

import { MinusIcon, PlusIcon } from './Icons';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Tên món, để nút đọc là "Giảm số lượng Bạc xỉu" */
  label: string;
  compact?: boolean;
}

export default function QuantityStepper({ value, onChange, min = 1, max = 20, label, compact }: Props) {
  const btn = `grid place-items-center rounded-full border-2 border-roast/15 bg-foam text-espresso transition-colors hover:border-espresso disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-roast/15 ${compact ? 'h-8 w-8' : 'h-11 w-11'}`;
  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Giảm số lượng ${label}`}>
        <MinusIcon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </button>
      <output className={`min-w-7 text-center font-bold tabular-nums ${compact ? 'text-sm' : 'text-lg'}`} aria-live="polite">
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Tăng số lượng ${label}`}>
        <PlusIcon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </button>
    </div>
  );
}

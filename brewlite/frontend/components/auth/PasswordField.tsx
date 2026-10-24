'use client';

import { useState, type ReactNode } from 'react';
import { EyeIcon, EyeOffIcon } from '@/components/ui/Icons';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string;
  hint?: ReactNode;
}

/** Trường nhập mật khẩu: hỗ trợ bật/tắt hiển thị mật khẩu, thông báo lỗi validation và gợi ý */
export default function PasswordField({ id, label, value, onChange, onBlur, error, autoComplete, placeholder, hint }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-12 w-full rounded-xl border-2 bg-foam pl-4 pr-12 placeholder:text-roast/40 focus:outline-none ${error ? 'border-chili/60 focus:border-chili' : 'border-roast/10 focus:border-espresso'}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-roast/55 hover:bg-roast/5 hover:text-roast"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {hint}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-chili">
          {error}
        </p>
      )}
    </div>
  );
}

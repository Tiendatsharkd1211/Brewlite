'use client';

// Số điện thoại trên thẻ hội viên: xem, thêm, sửa, xoá (PATCH /auth/me). Không bắt buộc, không nhắc khách.
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import type { User } from '@/lib/types';

const pretty = (p: string) => p.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');

export default function PhoneField() {
  const { user, request, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (!user) return null;

  async function save(phone: string | null) {
    setError(null);
    setSaving(true);
    try {
      setUser(await request<User>('/auth/me', { method: 'PATCH', body: { phone } }));
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chưa lưu được, thử lại sau.');
    } finally {
      setSaving(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const digits = value.replace(/[\s.-]/g, '');
    if (!/^0\d{9}$/.test(digits)) return setError('Số điện thoại gồm 10 chữ số, bắt đầu bằng 0');
    void save(digits);
  }

  if (!editing) {
    return (
      <p className="text-sm text-roast/70">
        SĐT {user.phone ? pretty(user.phone) : 'chưa có'} ·{' '}
        <button type="button" onClick={() => (setValue(user.phone ?? ''), setEditing(true))} className="underline underline-offset-4 hover:text-gold">
          {user.phone ? 'Sửa' : 'Thêm'}
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-1 flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="acc-phone">
        Số điện thoại
      </label>
      <input
        id="acc-phone"
        type="tel"
        inputMode="numeric"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0912 345 678"
        className="h-9 w-40 border-2 border-roast/30 bg-cream px-2 text-sm focus:border-roast focus:outline-none"
      />
      <button type="submit" disabled={saving} className="h-9 bg-roast px-3 text-xs font-semibold uppercase tracking-wider text-cream disabled:opacity-50">
        Lưu
      </button>
      {user.phone && (
        <button type="button" disabled={saving} onClick={() => void save(null)} className="h-9 px-2 text-xs font-semibold text-roast/60 hover:text-chili">
          Xoá số
        </button>
      )}
      <button type="button" onClick={() => setEditing(false)} className="h-9 px-2 text-xs font-semibold text-roast/60 hover:text-roast">
        Huỷ
      </button>
      {error && <p className="w-full text-sm text-chili">{error}</p>}
    </form>
  );
}

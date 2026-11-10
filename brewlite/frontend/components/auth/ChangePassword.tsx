'use client';

// Đổi mật khẩu (mọi vai trò). Đổi xong máy chủ đăng xuất mọi máy khác đang dùng tài khoản này;
// máy đang đổi nhận token mới nên vẫn đăng nhập. Tài khoản dùng chung ở quầy: có người nghỉ thì đổi mật khẩu.
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import PasswordField from './PasswordField';

export default function ChangePassword({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { changePassword } = useAuth();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  function close() {
    setF({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError(null);
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.currentPassword) return setError('Nhập mật khẩu hiện tại.');
    if (f.newPassword.length < 8 || !/[A-Za-z]/.test(f.newPassword) || !/\d/.test(f.newPassword)) return setError('Mật khẩu mới cần ít nhất 8 ký tự, có cả chữ và số.');
    if (f.newPassword !== f.confirmPassword) return setError('Mật khẩu xác nhận không khớp.');
    setSaving(true);
    setError(null);
    try {
      await changePassword(f);
      close();
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chưa đổi được mật khẩu, thử lại sau.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} titleId="change-password-title" onClose={close}>
      <h2 id="change-password-title" className="font-display text-2xl font-black">
        Đổi mật khẩu
      </h2>
      <p className="mt-1 text-sm text-roast/65">Đổi xong, các máy khác đang đăng nhập tài khoản này sẽ bị đăng xuất.</p>
      <form onSubmit={submit} noValidate className="mt-4 space-y-3">
        {error && (
          <p role="alert" className="border border-chili px-3 py-2 text-sm text-chili">
            {error}
          </p>
        )}
        <PasswordField id="cp-current" label="Mật khẩu hiện tại" autoComplete="current-password" value={f.currentPassword} onChange={set('currentPassword')} />
        <PasswordField id="cp-new" label="Mật khẩu mới" autoComplete="new-password" placeholder="Ít nhất 8 ký tự, có chữ và số" value={f.newPassword} onChange={set('newPassword')} />
        <PasswordField id="cp-confirm" label="Nhập lại mật khẩu mới" autoComplete="new-password" value={f.confirmPassword} onChange={set('confirmPassword')} />
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center bg-roast px-5 font-semibold text-cream disabled:opacity-50">
            {saving ? 'Đang đổi…' : 'Đổi mật khẩu'}
          </button>
          <button type="button" onClick={close} className="inline-flex h-11 items-center border-2 border-roast px-5 font-semibold">
            Huỷ
          </button>
        </div>
      </form>
    </Modal>
  );
}

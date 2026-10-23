'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import { AlertIcon, CheckIcon } from '@/components/ui/Icons';
import PasswordField from './PasswordField';
import TextField from './TextField';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Độ mạnh mật khẩu 0–4: đủ 8 ký tự, có chữ và số, có hoa và thường, có ký tự đặc biệt */
function strengthOf(pw: string) {
  const checks = [pw.length >= 8, /[A-Za-z]/.test(pw) && /\d/.test(pw), /[a-z]/.test(pw) && /[A-Z]/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  const score = checks.filter(Boolean).length;
  const labels = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
  const colors = ['bg-chili', 'bg-chili', 'bg-gold', 'bg-leaf', 'bg-leaf'];
  return { score, label: labels[score], color: colors[score] };
}

type Field = 'fullName' | 'email' | 'password' | 'confirmPassword' | 'agree';

export default function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState<Record<Field, boolean>>({ fullName: false, email: false, password: false, confirmPassword: false, agree: false });
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = strengthOf(form.password);
  const errors: Record<Field, string | null> = {
    fullName: form.fullName.trim().length < 2 ? 'Nhập họ tên, ít nhất 2 ký tự' : null,
    email: !form.email.trim() ? 'Nhập email' : !EMAIL_RE.test(form.email.trim()) ? 'Email chưa đúng định dạng, ví dụ ten@gmail.com' : null,
    password:
      form.password.length < 8 ? 'Mật khẩu cần ít nhất 8 ký tự' : !(/[A-Za-z]/.test(form.password) && /\d/.test(form.password)) ? 'Mật khẩu cần có cả chữ và số' : null,
    confirmPassword: !form.confirmPassword ? 'Nhập lại mật khẩu' : form.confirmPassword !== form.password ? 'Mật khẩu nhập lại chưa khớp' : null,
    agree: agree ? null : 'Bạn cần đồng ý với điều khoản để tạo tài khoản',
  };
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const touch = (key: Field) => () => setTouched((t) => ({ ...t, [key]: true }));
  const show = (key: Field) => (touched[key] ? errors[key] : null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true, agree: true });
    if (Object.values(errors).some(Boolean)) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await register({ ...form, fullName: form.fullName.trim(), email: form.email.trim() });
      router.replace(next);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Chưa tạo được tài khoản, thử lại sau ít phút.');
      setSubmitting(false);
    }
  }

  const matches = form.confirmPassword.length > 0 && form.confirmPassword === form.password;

  return (
    <div className="rounded-[2rem] bg-foam p-6 shadow-[0_30px_60px_-40px_rgba(59,42,32,.6)] sm:p-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Tạo tài khoản</h1>
      <p className="mt-2 text-roast/65">Tặng ngay 1.250 điểm, tương đương 125.000đ cho đơn đầu tiên.</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        {serverError && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-chili/10 px-4 py-3 text-sm text-chili">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}
          </p>
        )}
        <TextField id="reg-name" label="Họ và tên" autoComplete="name" placeholder="Nguyễn Văn A" value={form.fullName} onChange={set('fullName')} onBlur={touch('fullName')} error={show('fullName')} />
        <TextField id="reg-email" label="Email" type="email" autoComplete="email" placeholder="ten@gmail.com" value={form.email} onChange={set('email')} onBlur={touch('email')} error={show('email')} />
        <PasswordField
          id="reg-password"
          label="Mật khẩu"
          autoComplete="new-password"
          placeholder="Ít nhất 8 ký tự, có chữ và số"
          value={form.password}
          onChange={set('password')}
          onBlur={touch('password')}
          error={show('password')}
          hint={
            form.password && (
              <div className="mt-2" aria-live="polite">
                <div className="flex gap-1.5" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < strength.score ? strength.color : 'bg-roast/10'}`} />
                  ))}
                </div>
                <p className="mt-1 text-xs text-roast/60">Độ mạnh: {strength.label}</p>
              </div>
            )
          }
        />
        <PasswordField
          id="reg-confirm"
          label="Xác nhận mật khẩu"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          onBlur={touch('confirmPassword')}
          error={show('confirmPassword')}
          hint={
            matches && (
              <p className="mt-1.5 flex items-center gap-1 text-sm text-leaf">
                <CheckIcon className="h-4 w-4" /> Mật khẩu khớp
              </p>
            )
          }
        />
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} onBlur={touch('agree')} className="mt-0.5 h-5 w-5 rounded accent-espresso" />
            <span>Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật của BrewLite.</span>
          </label>
          {show('agree') && <p className="mt-1.5 text-sm text-chili">{errors.agree}</p>}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gold font-bold text-roast shadow-[0_12px_28px_-12px_rgba(168,101,15,.9)] transition-[background-color,color,transform] hover:bg-gold-deep hover:text-foam active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-roast/30 border-t-roast" aria-hidden="true" />}
          {submitting ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-roast/70">
        Đã có tài khoản?{' '}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-espresso underline underline-offset-4">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}

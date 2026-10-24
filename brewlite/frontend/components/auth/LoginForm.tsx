'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import { AlertIcon } from '@/components/ui/Icons';
import PasswordField from './PasswordField';
import TextField from './TextField';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Form đăng nhập: kiểm tra tính hợp lệ dữ liệu nhập, gọi API đăng nhập và chuyển hướng sang URL `next` */
export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Kiểm tra lỗi hợp lệ ở phía client trước khi gửi request
  const errors = {
    email: !email.trim() ? 'Nhập email' : !EMAIL_RE.test(email.trim()) ? 'Email chưa đúng định dạng, ví dụ ten@gmail.com' : null,
    password: !password ? 'Nhập mật khẩu' : null,
  };

  /** Xử lý submit form đăng nhập và điều hướng sau khi thành công */
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (errors.email || errors.password) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await login(email.trim(), password);
      router.replace(next);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Đăng nhập chưa được, thử lại sau ít phút.');
      setSubmitting(false);
    }
  }


  return (
    <div className="rounded-[2rem] bg-foam p-6 shadow-[0_30px_60px_-40px_rgba(59,42,32,.6)] sm:p-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Chào mừng trở lại</h1>
      <p className="mt-2 text-roast/65">Đăng nhập để thanh toán, theo dõi đơn và tích điểm.</p>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-gold/50 bg-gold/10 px-4 py-3 text-sm">
        <span>
          Tài khoản demo: <b>demo@brewlite.vn</b> / <b>Brewlite123</b>
        </span>
        <button
          type="button"
          onClick={() => {
            setEmail('demo@brewlite.vn');
            setPassword('Brewlite123');
            setServerError(null);
          }}
          className="shrink-0 font-semibold text-gold-deep underline underline-offset-4"
        >
          Điền sẵn
        </button>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        {serverError && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-chili/10 px-4 py-3 text-sm text-chili">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}
          </p>
        )}
        <TextField
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ten@gmail.com"
          value={email}
          onChange={setEmail}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={touched.email ? errors.email : null}
        />
        <PasswordField
          id="login-password"
          label="Mật khẩu"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={touched.password ? errors.password : null}
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gold font-bold text-roast shadow-[0_12px_28px_-12px_rgba(168,101,15,.9)] transition-[background-color,color,transform] hover:bg-gold-deep hover:text-foam active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-roast/30 border-t-roast" aria-hidden="true" />}
          {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-roast/70">
        Chưa có tài khoản?{' '}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-bold text-espresso underline underline-offset-4">
          Tạo tài khoản mới
        </Link>
      </p>
    </div>
  );
}

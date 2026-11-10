'use client';

// Form góp ý (POST /feedback): khách chưa đăng nhập vẫn gửi được; đã đăng nhập thì điền sẵn tên và email
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { ApiError, apiRequest } from '@/lib/api';
import { CheckIcon } from '@/components/ui/Icons';

// Khớp với backend/src/feedback/topics.ts
const TOPICS = [
  { id: 'order', label: 'Đơn hàng, nhận món' },
  { id: 'payment', label: 'Thanh toán, hoàn tiền' },
  { id: 'points', label: 'Điểm, ưu đãi, đổi quà' },
  { id: 'drink', label: 'Đồ uống, món ăn' },
  { id: 'account', label: 'Tài khoản, đăng nhập' },
  { id: 'other', label: 'Khác' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const field = 'h-11 w-full border-2 border-roast/40 bg-cream px-3 focus:border-roast focus:outline-none';

export default function FeedbackForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', topic: 'order', orderCode: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Đăng nhập rồi thì điền sẵn, khách vẫn sửa được
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.fullName, email: f.email || user.email }));
  }, [user]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const needsOrder = form.topic === 'order' || form.topic === 'payment';

  function validate() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Nhập họ tên của bạn';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Email chưa đúng, ví dụ ten@gmail.com';
    if (form.orderCode.trim() && !/^BL\d{6}$/i.test(form.orderCode.trim())) e.orderCode = 'Mã đơn có dạng BL và 6 chữ số, ví dụ BL123456';
    if (form.message.trim().length < 10) e.message = 'Viết thêm chút nữa (ít nhất 10 ký tự) để quán hiểu rõ';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setSending(true);
    try {
      const res = await apiRequest<{ ref: string }>('/feedback', {
        method: 'POST',
        body: { ...form, orderCode: form.orderCode.trim() || undefined },
      });
      setSent(res.ref);
      setForm((f) => ({ ...f, orderCode: '', message: '' }));
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Chưa gửi được, bạn thử lại sau ít phút nhé.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="border-2 border-roast p-6 text-center" role="status">
        <span className="keep-round mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-leaf text-leaf">
          <CheckIcon className="h-6 w-6" />
        </span>
        <p className="mt-3 font-display text-2xl font-black">Quán đã nhận thư của bạn</p>
        <p className="mt-1 text-roast/75">
          Mã góp ý <b className="font-mono">{sent}</b>. Quán trả lời qua email trong giờ mở cửa, thường dưới 1 ngày.
        </p>
        <button type="button" onClick={() => setSent(null)} className="mt-4 font-label text-xs font-semibold uppercase tracking-wider underline underline-offset-4 hover:text-gold">
          Gửi thêm góp ý khác
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {serverError && (
        <p role="alert" className="border-2 border-chili px-4 py-3 text-sm text-chili sm:col-span-2">
          {serverError}
        </p>
      )}
      <Field label="Họ tên" error={errors.name}>
        <input value={form.name} onChange={set('name')} autoComplete="name" className={field} />
      </Field>
      <Field label="Email để quán trả lời" error={errors.email}>
        <input type="email" value={form.email} onChange={set('email')} autoComplete="email" className={field} />
      </Field>
      <Field label="Chủ đề">
        <select value={form.topic} onChange={set('topic')} className={field}>
          {TOPICS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={needsOrder ? 'Mã đơn (nên có để quán tra nhanh)' : 'Mã đơn (nếu có)'} error={errors.orderCode}>
        <input value={form.orderCode} onChange={set('orderCode')} placeholder="BL123456" className={`${field} font-mono uppercase`} />
      </Field>
      <Field label="Nội dung" error={errors.message} wide>
        <textarea
          value={form.message}
          onChange={set('message')}
          rows={5}
          maxLength={2000}
          placeholder="Ví dụ: Mình đặt bạc xỉu size M ít đá lúc 7 giờ sáng nhưng nhận ly nhiều đá…"
          className="w-full border-2 border-roast/40 bg-cream px-3 py-2 focus:border-roast focus:outline-none"
        />
        <span className="mt-1 block text-right font-mono text-[11px] text-roast/50">{form.message.length}/2000</span>
      </Field>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={sending} className="inline-flex h-12 items-center bg-gold px-8 font-label text-sm font-semibold uppercase tracking-wider text-foam hover:bg-gold-deep disabled:opacity-60">
          {sending ? 'Đang gửi…' : 'Gửi góp ý'}
        </button>
        <p className="text-xs text-roast/60">Thông tin chỉ dùng để trả lời bạn, xem thêm ở Chính sách bảo mật.</p>
      </div>
    </form>
  );
}

function Field({ label, error, wide, children }: { label: string; error?: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="font-label text-xs uppercase tracking-wider text-roast/70">{label}</span>
      <span className="mt-1 block">{children}</span>
      {error && <span className="mt-1 block text-sm text-chili">{error}</span>}
    </label>
  );
}

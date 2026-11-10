'use client';

// TÀI KHOẢN KHÁCH: ô số liệu bấm để lọc, bảng có chia trang; bấm một dòng mở hộp thoại chi tiết (thông tin, lịch sử khoá). Quản lý chỉ thêm, xem, khoá, mở khoá; không có xoá. Khoá / mở khoá bắt buộc chọn lý do,
// lý do được gửi cho khách (khoá: hiện khi khách đăng nhập; mở khoá: vào mục Thông báo của khách).
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { LOCK_REASONS, UNLOCK_REASONS, formatPhone, useCustomer, useCustomerActions, useCustomers, type CustomerStatus } from '@/lib/customers-admin';
import { formatDate, formatDateTime } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import { SearchIcon } from '@/components/ui/Icons';
import { FieldLabel, FilterTile, PageHead, Pager, Panel, DetailDialog, btnInk, btnLine, btnSolid, input, num, searchInput, td, textarea, th, toolSelect, tr } from './ui';

type Sort = 'new' | 'name';
const PAGE = 10;
const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Chưa lưu được, thử lại sau ít phút.');

function LockBadge({ locked }: { locked: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-0.5 text-xs font-semibold ${locked ? 'bg-chili/10 text-chili' : 'bg-leaf/10 text-leaf'}`}>
      <span className={`keep-round h-1.5 w-1.5 rounded-full ${locked ? 'bg-chili' : 'bg-leaf'}`} aria-hidden="true" />
      {locked ? 'Đang khoá' : 'Hoạt động'}
    </span>
  );
}

export default function Customers() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState<CustomerStatus>('all');
  const [sort, setSort] = useState<Sort>('new');
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, isFetching, refetch } = useCustomers({ q: term, status: filter, sort, page: page + 1, size: PAGE });
  const [openId, setOpenId] = useState<string | null>(params.get('xem'));
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const id = params.get('xem');
    if (id) setOpenId(id);
  }, [params]);
  // Gõ xong 0,3 giây mới hỏi máy chủ, không gọi API theo từng phím
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setPage(0), [term, filter, sort]);
  // Khoá / mở khoá làm trang hiện tại vượt quá số trang còn lại: lùi về trang cuối
  useEffect(() => {
    if (data && page > 0 && page * PAGE >= data.total) setPage(Math.max(0, Math.ceil(data.total / PAGE) - 1));
  }, [data, page]);

  const counts = data?.counts ?? { all: 0, active: 0, locked: 0, fresh: 0 };
  const rows = data?.items ?? [];

  return (
    <>
      <PageHead
        kicker="Khách hàng"
        title="Tài khoản khách"
        actions={
          <button type="button" onClick={() => setAdding(true)} className={btnSolid}>
            + Thêm khách
          </button>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FilterTile label="Tất cả" value={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterTile label="Đang hoạt động" value={counts.active} active={filter === 'active'} onClick={() => setFilter('active')} />
        <FilterTile label="Đang khoá" value={counts.locked} tone={counts.locked ? 'text-chili' : ''} active={filter === 'locked'} onClick={() => setFilter('locked')} />
        <FilterTile label="Mới trong 30 ngày" value={counts.fresh} />
      </div>

      <Panel
        className="mt-4"
        toolbar={
          <>
            <label className="relative min-w-[12rem] flex-1">
              <span className="sr-only">Tìm khách</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roast/45" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên, email hoặc số điện thoại" className={searchInput} />
            </label>
            <select value={filter} onChange={(e) => setFilter(e.target.value as CustomerStatus)} className={toolSelect} aria-label="Trạng thái tài khoản">
              <option value="all">Mọi trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đang khoá</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={toolSelect} aria-label="Sắp xếp">
              <option value="new">Mới tạo trước</option>
              <option value="name">Theo tên A–Z</option>
            </select>
          </>
        }
        footer={<Pager page={page} size={PAGE} total={data?.total ?? 0} onPage={setPage} />}
      >
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-roast/60">Đang tải danh sách khách…</p>
        ) : isError ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-roast/70">Chưa tải được danh sách khách.</p>
            <button type="button" onClick={() => refetch()} className={`${btnLine} mt-3`}>
              Thử lại
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-roast/60">{counts.all ? 'Không có khách nào khớp bộ lọc.' : 'Chưa có tài khoản khách nào.'}</p>
        ) : (
          <div className={`relative overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr>
                  <th className={th}>Khách</th>
                  <th className={th}>Số điện thoại</th>
                  <th className={th}>Trạng thái</th>
                  <th className={`${th} text-right`}>Điểm</th>
                  <th className={th}>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} onClick={() => setOpenId(c.id)} className={`${tr} cursor-pointer`}>
                    <td className={td}>
                      <span className="block font-semibold">{c.fullName}</span>
                      <span className="block text-xs text-roast/55">{c.email}</span>
                    </td>
                    <td className={`${td} text-roast/75 ${num}`}>{c.phone ? formatPhone(c.phone) : <span className="text-roast/35">—</span>}</td>
                    <td className={td}>
                      <LockBadge locked={!!c.lockedAt} />
                    </td>
                    <td className={`${td} text-right text-roast/75 ${num}`}>{c.loyaltyPoints.toLocaleString('vi-VN')}</td>
                    <td className={`${td} text-roast/75 ${num}`}>{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <CustomerPanel
        id={openId}
        onClose={() => {
          setOpenId(null);
          if (params.get('xem')) router.replace('/quan-ly/khach-hang');
        }}
        onToast={setToast}
      />
      <CustomerForm
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(id, name) => {
          setToast(`Đã tạo tài khoản cho ${name}.`);
          setOpenId(id);
        }}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

/** Khung chi tiết một khách, kèm khoá / mở khoá có chọn lý do */
function CustomerPanel({ id, onClose, onToast }: { id: string | null; onClose: () => void; onToast: (m: string) => void }) {
  const { data: c, isLoading, isError } = useCustomer(id);
  const { setLock } = useCustomerActions();
  const [mode, setMode] = useState<'view' | 'lock'>('view');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode('view');
    setReason('');
    setNote('');
    setError(null);
  }, [id]);

  if (!id) return null;
  const locked = !!c?.lockedAt;
  const reasons = locked ? UNLOCK_REASONS : LOCK_REASONS;
  const needNote = reason === 'other';
  const valid = reason !== '' && (!needNote || note.trim().length >= 5) && note.trim().length <= 300;
  const preview = reason === '' ? '' : reason === 'other' ? note.trim() : note.trim() ? `${reasons[reason]}. ${note.trim()}` : reasons[reason];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!c || !valid) return;
    setError(null);
    try {
      await setLock.mutateAsync({ id: c.id, lock: !locked, reason, note });
      onToast(locked ? `Đã mở khoá tài khoản ${c.fullName}.` : `Đã khoá tài khoản ${c.fullName}.`);
      setMode('view');
      setReason('');
      setNote('');
    } catch (err) {
      setError(errText(err));
    }
  }

  const facts = c
    ? [
        { k: 'Số điện thoại', v: c.phone ? formatPhone(c.phone) : 'Chưa có' },
        { k: 'Điểm hiện có', v: c.loyaltyPoints.toLocaleString('vi-VN') },
        { k: 'Ngày tạo', v: formatDate(c.createdAt) },
      ]
    : [];

  return (
    <DetailDialog
      open
      title={c?.fullName ?? 'Tài khoản khách'}
      onClose={onClose}
      footer={
        c && mode === 'lock' ? (
          // Nút xác nhận nằm ở chân hộp thoại nên luôn nhìn thấy, kể cả màn hình thấp
          <div className="flex gap-2">
            <button type="submit" form="lock-form" disabled={!valid || setLock.isPending} className={locked ? btnInk : `${btnInk} bg-chili hover:bg-chili/85`}>
              {setLock.isPending ? 'Đang lưu…' : locked ? 'Xác nhận mở khoá' : 'Xác nhận khoá'}
            </button>
            <button type="button" onClick={() => setMode('view')} className={btnLine}>
              Huỷ
            </button>
            {!valid && <span className="self-center text-xs text-roast/60">{reason === '' ? 'Chọn một lý do để tiếp tục' : 'Ghi rõ lý do, ít nhất 5 ký tự'}</span>}
          </div>
        ) : c && mode === 'view' ? (
          locked ? (
            <button type="button" onClick={() => setMode('lock')} className={btnSolid}>
              Mở khoá tài khoản
            </button>
          ) : (
            <button type="button" onClick={() => setMode('lock')} className={`${btnLine} border-chili text-chili hover:bg-chili hover:text-cream`}>
              Khoá tài khoản
            </button>
          )
        ) : null
      }
    >
      {isLoading ? (
        <p className="py-10 text-center text-sm text-roast/60">Đang tải…</p>
      ) : isError || !c ? (
        <p className="py-10 text-center text-sm text-roast/60">Không tải được tài khoản này.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <a href={`mailto:${c.email}`} className="truncate text-sm text-roast/70 underline underline-offset-4 hover:text-gold">
              {c.email}
            </a>
            <LockBadge locked={locked} />
          </div>

          {locked && (
            <div className="mt-3 border-l-4 border-chili bg-chili/5 px-3 py-2 text-sm">
              <p className="font-semibold text-chili">Khoá từ {formatDateTime(c.lockedAt!)}</p>
              <p className="mt-0.5 text-roast/80">Lý do khách thấy khi đăng nhập: {c.lockReason}</p>
            </div>
          )}

          {mode === 'view' && (
            <dl className="mt-3 grid grid-cols-3 border border-roast/20">
              {facts.map((f, k) => (
                <div key={f.k} className={`px-3 py-2.5 ${k ? 'border-l border-roast/20' : ''}`}>
                  <dt className="font-label text-[11px] uppercase tracking-wider text-roast/55">{f.k}</dt>
                  <dd className={`mt-0.5 font-semibold ${num}`}>{f.v}</dd>
                </div>
              ))}
            </dl>
          )}

          {mode === 'lock' && (
            <form
              id="lock-form"
              ref={(el) => el?.scrollIntoView({ block: 'nearest' })}
              onSubmit={submit}
              className={`mt-3 space-y-3 border bg-foam p-4 ${locked ? 'border-roast/30' : 'border-chili/50'}`}
            >
              <p className="font-semibold">{locked ? 'Mở khoá tài khoản' : 'Khoá tài khoản'}</p>
              <p className="text-xs text-roast/65">
                {locked
                  ? 'Khách đăng nhập lại được ngay và nhận thông báo kèm lý do dưới đây.'
                  : 'Khách bị đăng xuất ngay, không đăng nhập và đặt món được. Lý do dưới đây hiện cho khách khi họ thử đăng nhập. Đơn và điểm của khách vẫn giữ nguyên.'}
              </p>
              {error && (
                <p role="alert" className="border border-chili px-3 py-2 text-sm text-chili">
                  {error}
                </p>
              )}
              <fieldset>
                <legend className="font-label text-xs uppercase tracking-wider text-roast/70">Lý do</legend>
                <div className="mt-1 space-y-1">
                  {Object.entries(reasons).map(([code, label]) => (
                    <label key={code} className={`flex cursor-pointer items-start gap-2 border px-3 py-2 text-sm ${reason === code ? 'border-roast bg-cream' : 'border-roast/20 hover:border-roast/50'}`}>
                      <input type="radio" name="reason" value={code} checked={reason === code} onChange={() => setReason(code)} className="mt-0.5 accent-roast" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <FieldLabel label={needNote ? 'Ghi rõ lý do (bắt buộc)' : 'Ghi chú thêm cho khách (không bắt buộc)'} hint={`${note.trim().length}/300`}>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder={locked ? 'Ví dụ: đã đối soát xong giao dịch ngày 02/11' : 'Ví dụ: 4 đơn giao tận nơi trong tuần không nhận'}
                  className={textarea}
                />
              </FieldLabel>
              {preview && (
                <p className="border-l-4 border-gold bg-cream px-3 py-2 text-sm">
                  <span className="block font-label text-[10px] uppercase tracking-wider text-roast/55">Khách sẽ thấy</span>
                  Lý do: {preview}
                </p>
              )}
            </form>
          )}

          {mode === 'view' && (
            <>
          <h3 className="mt-6 font-label text-xs font-semibold uppercase tracking-wider text-roast/60">Lịch sử khoá, mở khoá</h3>
          {c.accountLogs.length === 0 ? (
            <p className="mt-1 text-sm text-roast/60">Tài khoản chưa từng bị khoá.</p>
          ) : (
            <ol className="mt-1 text-sm">
              {c.accountLogs.map((l) => (
                <li key={l.id} className="border-b border-roast/10 py-2">
                  <span className={`block font-semibold ${l.action === 'LOCK' ? 'text-chili' : 'text-leaf'}`}>{l.action === 'LOCK' ? 'Khoá' : 'Mở khoá'}</span>
                  <span className="block text-roast/80">{l.reason}</span>
                  <span className="block text-xs text-roast/55">
                    {formatDateTime(l.createdAt)} · {l.byName}
                  </span>
                </li>
              ))}
            </ol>
          )}
            </>
          )}
        </>
      )}
    </DetailDialog>
  );
}

/** Mật khẩu ban đầu tạo sẵn: 8 ký tự dễ đọc cho khách (bỏ 0/O, 1/l), luôn có chữ và số */
function makePassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const pick = (from: string) => from[crypto.getRandomValues(new Uint32Array(1))[0] % from.length];
  return Array.from({ length: 5 }, () => pick(letters)).join('') + Array.from({ length: 3 }, () => pick(digits)).join('');
}

/** Thêm tài khoản khách: họ tên, email, SĐT, mật khẩu ban đầu tạo sẵn (quản lý báo cho khách, khách tự đổi sau) */
function CustomerForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (id: string, name: string) => void }) {
  const { create } = useCustomerActions();
  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setF({ fullName: '', email: '', phone: '', password: makePassword() });
    setError(null);
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fullName = f.fullName.trim();
    const email = f.email.trim().toLowerCase();
    if (fullName.length < 2) return setError('Họ tên cần ít nhất 2 ký tự.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Email chưa đúng định dạng.');
    const phone = f.phone.replace(/[\s.-]/g, '');
    if (phone && !/^0\d{9}$/.test(phone)) return setError('Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.');
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) return setError('Mật khẩu cần ít nhất 8 ký tự, có cả chữ và số.');
    setError(null);
    try {
      const c = await create.mutateAsync({ fullName, email, ...(phone ? { phone } : {}), password: f.password });
      onSaved(c.id, c.fullName);
      onClose();
    } catch (err) {
      setError(errText(err));
    }
  }

  return (
    <Modal open={open} titleId="customer-form-title" onClose={onClose}>
      <h2 id="customer-form-title" className="font-display text-2xl font-black">
        Thêm tài khoản khách
      </h2>
      <p className="mt-1 text-sm text-roast/65">Khách được tặng điểm chào mừng như khi tự đăng ký. Báo mật khẩu ban đầu cho khách để họ đăng nhập và tự đổi.</p>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        {error && (
          <p role="alert" className="border border-chili px-3 py-2 text-sm text-chili">
            {error}
          </p>
        )}
        <FieldLabel label="Họ tên">
          <input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} autoComplete="off" className={input} />
        </FieldLabel>
        <FieldLabel label="Email">
          <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="off" className={input} />
        </FieldLabel>
        <FieldLabel label="Số điện thoại (không bắt buộc)">
          <input type="tel" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="0912 345 678" autoComplete="off" className={input} />
        </FieldLabel>
        <FieldLabel label="Mật khẩu ban đầu" hint="Đã tạo sẵn; báo cho khách để đăng nhập lần đầu">
          <span className="flex gap-2">
            <input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" className={`${input} font-mono`} />
            <button type="button" onClick={() => setF({ ...f, password: makePassword() })} className={`${btnLine} shrink-0`}>
              Tạo lại
            </button>
          </span>
        </FieldLabel>
        <div className="mt-2 flex gap-2">
          <button type="submit" disabled={create.isPending} className={btnSolid}>
            {create.isPending ? 'Đang tạo…' : 'Tạo tài khoản'}
          </button>
          <button type="button" onClick={onClose} className={btnLine}>
            Huỷ
          </button>
        </div>
      </form>
    </Modal>
  );
}

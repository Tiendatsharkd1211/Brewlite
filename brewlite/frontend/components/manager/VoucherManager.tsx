'use client';

// MÃ GIẢM GIÁ: tạo, sửa, tạm dừng mã; theo dõi lượt dùng; chọn mã nào hiện trên trang Ưu đãi của khách.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { formatDate, formatVnd } from '@/lib/format';
import { VOUCHER_STATE_LABEL, useStorefront, voucherBadge, voucherState, type Voucher, type VoucherState } from '@/lib/storefront';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import { CloseIcon, CopyIcon } from '@/components/ui/Icons';
import { Chip, FieldLabel, PageHead, Stat, Toggle, btnLine, btnSolid, input, select } from './ui';

type Tab = 'all' | VoucherState;
const TONE: Record<VoucherState, 'ok' | 'mute' | 'bad' | 'warn'> = { running: 'ok', paused: 'mute', 'used-up': 'bad', expired: 'bad', scheduled: 'warn' };

const BLANK: Voucher = {
  code: '',
  type: 'PERCENT',
  title: '',
  terms: '',
  percent: 10,
  maxDiscount: 20000,
  minOrder: 0,
  requiredMethod: null,
  requiresDelivery: false,
  usageLimit: 200,
  usedCount: 0,
  active: true,
  showOnSite: true,
  startsAt: '',
  endsAt: '',
};

/** Điều kiện tự viết từ các ô đã điền, để quản lý khỏi phải gõ tay */
function autoTerms(v: Voucher): string {
  const parts: string[] = [];
  if (v.type === 'PERCENT' && v.maxDiscount) parts.push(`Tối đa ${formatVnd(v.maxDiscount)}`);
  if (v.minOrder) parts.push(`đơn từ ${formatVnd(v.minOrder)}`);
  if (v.requiredMethod) parts.push(`chỉ khi trả bằng ${v.requiredMethod === 'VNPAY' ? 'VNPay' : 'điểm'}`);
  if (v.requiresDelivery) parts.push('chỉ đơn giao tận nơi');
  if (v.endsAt) parts.push(`hạn tới ${formatDate(v.endsAt)}`);
  const s = parts.join(', ');
  return s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}.` : 'Áp dụng mọi đơn.';
}

export default function VoucherManager() {
  const { vouchers, setVoucherActive, saveVoucher, removeVoucher } = useStorefront();
  const [tab, setTab] = useState<Tab>('all');
  const [editing, setEditing] = useState<{ v: Voucher; original?: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const params = useSearchParams();
  const router = useRouter();

  // Mở từ ô tìm nhanh: ?tao=1 (tạo mã) hoặc ?sua=<MÃ>
  useEffect(() => {
    const code = params.get('sua');
    const found = code && useStorefront.getState().vouchers.find((v) => v.code === code);
    if (found) setEditing({ v: found, original: found.code });
    else if (params.get('tao')) setEditing({ v: BLANK });
    if (code || params.get('tao')) router.replace('/quan-ly/ma-giam-gia');
  }, [params, router]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: vouchers.length, running: 0, paused: 0, 'used-up': 0, expired: 0, scheduled: 0 };
    for (const v of vouchers) c[voucherState(v)]++;
    return c;
  }, [vouchers]);
  const list = vouchers.filter((v) => tab === 'all' || voucherState(v) === tab);
  const used = vouchers.reduce((n, v) => n + v.usedCount, 0);
  const nearlyOut = vouchers.filter((v) => voucherState(v) === 'running' && v.usageLimit && v.usedCount / v.usageLimit >= 0.8);
  const onSite = vouchers.filter((v) => v.showOnSite && voucherState(v) === 'running').length;

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setToast(`Đã chép mã ${code}`);
    } catch {
      setToast(code);
    }
  }

  return (
    <>
      <PageHead
        kicker="Cửa hàng"
        title="Mã giảm giá"
        lead="Tạo mã, đặt điều kiện và giới hạn lượt dùng. Mã đang chạy và được bật “Hiện trên trang Ưu đãi” sẽ hiện cho khách."
        actions={
          <>
            <Link href="/uu-dai" className={btnLine}>
              Xem trang Ưu đãi ↗
            </Link>
            <button type="button" onClick={() => setEditing({ v: BLANK })} className={btnSolid}>
              + Tạo mã mới
            </button>
          </>
        }
      />

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Số liệu mã">
        <Stat label="Đang chạy" value={counts.running} hint={`${onSite} mã đang hiện cho khách`} />
        <Stat label="Lượt đã dùng" value={used.toLocaleString('vi-VN')} hint="Cộng dồn mọi mã" />
        <Stat label="Sắp hết lượt" value={nearlyOut.length} tone={nearlyOut.length ? 'text-amber-700' : ''} hint={nearlyOut.length ? nearlyOut.map((v) => v.code).join(', ') : 'Dùng dưới 80% lượt'} />
        <Stat label="Tạm dừng, hết hạn" value={counts.paused + counts.expired + counts['used-up']} hint="Khách không dùng được" />
      </section>

      <div role="tablist" aria-label="Trạng thái mã" className="mt-6 flex gap-1 overflow-x-auto border-b-2 border-roast">
        {(['all', 'running', 'scheduled', 'paused', 'used-up', 'expired'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-0.5 shrink-0 border-b-[3px] px-3 py-2 text-xs font-semibold tracking-wider ${tab === t ? 'border-gold text-roast' : 'border-transparent text-roast/55 hover:text-roast'}`}
          >
            {t === 'all' ? 'Tất cả' : VOUCHER_STATE_LABEL[t]} <span className="ml-1 font-mono text-[11px] opacity-70">{counts[t]}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-10 text-center text-roast/60">Không có mã nào ở mục này.</p>
      ) : (
        <ul className="mt-5 grid gap-4 lg:grid-cols-2">
          {list.map((v) => {
            const st = voucherState(v);
            const pct = v.usageLimit ? Math.min(100, (v.usedCount / v.usageLimit) * 100) : 0;
            return (
              <li key={v.code} className={`flex border-2 border-roast ${st === 'running' ? '' : 'bg-roast/[0.03]'}`}>
                {/* Cuống vé: mức giảm */}
                <div
                  className={`flex w-28 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-roast px-2 py-4 text-center ${st === 'running' ? 'bg-gold text-foam' : 'bg-roast/10 text-roast/60'}`}
                >
                  <p className="font-display text-3xl font-black leading-none">{voucherBadge(v)}</p>
                  {v.type === 'PERCENT' && v.maxDiscount > 0 && <p className="mt-1 font-mono text-[10px]">tối đa {formatVnd(v.maxDiscount)}</p>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copy(v.code)}
                      className="plain-btn inline-flex items-center gap-1.5 font-mono text-lg font-bold tracking-widest hover:text-gold"
                      title="Chép mã"
                    >
                      {v.code} <CopyIcon className="h-3.5 w-3.5 opacity-60" />
                    </button>
                    <Chip tone={TONE[st]}>{VOUCHER_STATE_LABEL[st]}</Chip>
                    {!v.showOnSite && <Chip tone="mute">Không hiện trên web</Chip>}
                  </div>
                  <p className="mt-1 font-semibold leading-snug">{v.title}</p>
                  <p className="text-xs text-roast/65">{v.terms}</p>

                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-roast/60">Đã dùng</span>
                      <span className="font-mono">
                        {v.usedCount.toLocaleString('vi-VN')}
                        {v.usageLimit ? ` / ${v.usageLimit.toLocaleString('vi-VN')}` : ' · không giới hạn'}
                      </span>
                    </div>
                    {v.usageLimit !== null && (
                      <span className="mt-1 block h-1.5 bg-roast/10">
                        <span className={`block h-full ${pct >= 100 ? 'bg-chili' : pct >= 80 ? 'bg-amber-600' : 'bg-leaf'}`} style={{ width: `${pct}%` }} />
                      </span>
                    )}
                    <p className="mt-1.5 text-xs text-roast/55">
                      {v.startsAt || v.endsAt ? `${v.startsAt ? formatDate(v.startsAt) : 'Từ nay'} → ${v.endsAt ? formatDate(v.endsAt) : 'không hạn'}` : 'Không giới hạn thời gian'}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center gap-3 border-t border-dotted border-roast/50 pt-3">
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <Toggle
                        size="sm"
                        on={v.active}
                        label={`Chạy mã ${v.code}`}
                        onChange={(on) => {
                          void setVoucherActive(v.code, on).then((ok) => ok && setToast(on ? `Mã ${v.code} chạy lại` : `Đã tạm dừng mã ${v.code}, khách không dùng được nữa`));
                        }}
                      />
                      {v.active ? 'Đang bật' : 'Đang tắt'}
                    </label>
                    <button type="button" onClick={() => setEditing({ v, original: v.code })} className="ml-auto text-xs font-semibold tracking-wider underline underline-offset-4 hover:text-gold">
                      Sửa
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <VoucherEditor
          initial={editing.v}
          original={editing.original}
          taken={vouchers.map((v) => v.code).filter((c) => c !== editing.original)}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            // Chờ máy chủ: sai điều kiện (trùng mã, ngày sai...) thì giữ form mở để sửa
            if (!(await saveVoucher(v, editing.original))) return;
            setToast(editing.original ? `Đã lưu mã ${v.code}` : `Đã tạo mã ${v.code}`);
            setEditing(null);
          }}
          onDelete={
            editing.original && editing.v.usedCount === 0
              ? async () => {
                  if (!(await removeVoucher(editing.original!))) return;
                  setToast(`Đã xoá mã ${editing.original}`);
                  setEditing(null);
                }
              : undefined
          }
        />
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

function VoucherEditor({
  initial,
  original,
  taken,
  onClose,
  onSave,
  onDelete,
}: {
  initial: Voucher;
  original?: string;
  taken: string[];
  onClose: () => void;
  onSave: (v: Voucher) => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState<Voucher>(initial);
  const [autoT, setAutoT] = useState(!original);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Voucher>(k: K, val: Voucher[K]) => setV((s) => ({ ...s, [k]: val }));
  const num = (s: string) => Number(s.replace(/\D/g, '')) || 0;
  const terms = autoT ? autoTerms(v) : v.terms;
  const title = v.title || (v.type === 'FREESHIP' ? 'Miễn phí giao hàng' : `Giảm ${v.percent}%${v.minOrder ? ` cho đơn từ ${formatVnd(v.minOrder)}` : ''}`);

  function save() {
    if (!/^[A-Z0-9]{4,12}$/.test(v.code)) return setError('Mã gồm 4–12 chữ in hoa hoặc số, không dấu, không khoảng trắng.');
    if (taken.includes(v.code)) return setError(`Mã ${v.code} đã có.`);
    if (v.type === 'PERCENT' && (v.percent < 1 || v.percent > 100)) return setError('Phần trăm giảm từ 1 đến 100.');
    if (v.startsAt && v.endsAt && v.endsAt < v.startsAt) return setError('Ngày kết thúc phải sau ngày bắt đầu.');
    onSave({ ...v, title, terms });
  }

  return (
    <Modal open xl titleId="voucher-title" onClose={onClose}>
      <div className="flex items-center justify-between gap-3 border-b-2 border-roast px-5 py-4">
        <h2 id="voucher-title" className="font-display text-2xl font-black">
          {original ? `Sửa mã ${original}` : 'Tạo mã giảm giá'}
        </h2>
        <button type="button" onClick={onClose} aria-label="Đóng" className="grid h-10 w-10 place-items-center hover:bg-roast/5">
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-6 px-5 py-5 md:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="Mã khách nhập" hint="Ví dụ: SANGTHU, BREW30">
              <input value={v.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={12} className={`${input} font-mono font-bold tracking-widest`} />
            </FieldLabel>
            <FieldLabel label="Loại ưu đãi">
              <select value={v.type} onChange={(e) => set('type', e.target.value as Voucher['type'])} className={`${select} w-full`}>
                <option value="PERCENT">Giảm theo %</option>
                <option value="FREESHIP">Miễn phí giao hàng</option>
              </select>
            </FieldLabel>
          </div>
          {v.type === 'PERCENT' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldLabel label="Giảm (%)">
                <input value={v.percent || ''} onChange={(e) => set('percent', Math.min(100, num(e.target.value)))} inputMode="numeric" className={`${input} font-mono`} />
              </FieldLabel>
              <FieldLabel label="Giảm tối đa (đ)" hint={v.maxDiscount ? formatVnd(v.maxDiscount) : 'Để 0 là không giới hạn'}>
                <input value={v.maxDiscount || ''} onChange={(e) => set('maxDiscount', num(e.target.value))} inputMode="numeric" className={`${input} font-mono`} />
              </FieldLabel>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="Đơn tối thiểu (đ)" hint={v.minOrder ? formatVnd(v.minOrder) : 'Mọi đơn'}>
              <input value={v.minOrder || ''} onChange={(e) => set('minOrder', num(e.target.value))} inputMode="numeric" className={`${input} font-mono`} />
            </FieldLabel>
            <FieldLabel label="Giới hạn lượt dùng" hint="Để trống là không giới hạn">
              <input value={v.usageLimit ?? ''} onChange={(e) => set('usageLimit', e.target.value.trim() ? num(e.target.value) : null)} inputMode="numeric" className={`${input} font-mono`} />
            </FieldLabel>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="Phương thức thanh toán">
              <select value={v.requiredMethod ?? ''} onChange={(e) => set('requiredMethod', (e.target.value || null) as Voucher['requiredMethod'])} className={`${select} w-full`}>
                <option value="">Mọi phương thức</option>
                <option value="VNPAY">Chỉ VNPay</option>
                <option value="POINTS">Chỉ điểm thưởng</option>
              </select>
            </FieldLabel>
            <label className="flex items-center justify-between gap-3 self-end border-2 border-roast/30 px-3 py-2">
              <span className="text-sm">Chỉ đơn giao tận nơi</span>
              <Toggle size="sm" on={v.requiresDelivery} label="Chỉ đơn giao tận nơi" onChange={(x) => set('requiresDelivery', x)} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="Bắt đầu">
              <input type="date" value={v.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={input} />
            </FieldLabel>
            <FieldLabel label="Kết thúc">
              <input type="date" value={v.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={input} />
            </FieldLabel>
          </div>
          <FieldLabel label="Tiêu đề hiện cho khách" hint="Để trống thì tự đặt theo mức giảm.">
            <input value={v.title} onChange={(e) => set('title', e.target.value)} maxLength={60} placeholder={title} className={input} />
          </FieldLabel>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="font-label text-xs uppercase tracking-wider text-roast/70">Điều kiện hiện cho khách</span>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={autoT} onChange={(e) => setAutoT(e.target.checked)} className="h-3.5 w-3.5 accent-roast" /> Tự viết theo các ô trên
              </label>
            </div>
            <input value={terms} disabled={autoT} onChange={(e) => set('terms', e.target.value)} className={`${input} mt-1 disabled:opacity-70`} />
          </div>
          <div className="flex flex-wrap gap-4 border-t border-dotted border-roast/50 pt-4">
            <label className="flex items-center gap-2 text-sm">
              <Toggle size="sm" on={v.active} label="Bật mã" onChange={(x) => set('active', x)} /> Bật mã
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Toggle size="sm" on={v.showOnSite} label="Hiện trên trang Ưu đãi" onChange={(x) => set('showOnSite', x)} /> Hiện trên trang Ưu đãi
            </label>
          </div>
        </div>

        {/* Xem trước thẻ mã trên trang Ưu đãi */}
        <div className="md:sticky md:top-0 md:self-start">
          <p className="kicker">Khách sẽ thấy</p>
          <div className={`mt-2 flex flex-col border-2 border-dashed border-roast p-4 ${v.showOnSite ? '' : 'opacity-50'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="stamp text-gold">{v.code || 'MAMOI'}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold">
                <CopyIcon className="h-4 w-4" /> Chép
              </span>
            </div>
            <h3 className="mt-3 text-xl font-bold leading-tight">{title}</h3>
            <p className="mt-2 text-sm text-roast/75">{terms}</p>
            <span className="mt-4 inline-flex h-10 items-center justify-center border-2 border-roast font-label text-xs font-semibold uppercase tracking-wider">Dùng mã này</span>
          </div>
          {!v.showOnSite && <p className="mt-2 text-xs text-roast/60">Không hiện trên trang Ưu đãi. Khách biết mã vẫn nhập được.</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t-2 border-roast px-5 py-4">
        {error && <p className="w-full text-sm text-chili">{error}</p>}
        <button type="button" onClick={save} className={btnSolid}>
          {original ? 'Lưu mã' : 'Tạo mã'}
        </button>
        <button type="button" onClick={onClose} className={btnLine}>
          Huỷ
        </button>
        {onDelete && (
          <button type="button" onClick={onDelete} className="ml-auto text-xs font-semibold tracking-wider text-chili underline underline-offset-4">
            Xoá mã (chưa ai dùng)
          </button>
        )}
      </div>
    </Modal>
  );
}

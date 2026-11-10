'use client';

// NỘI DUNG TRANG: chữ và ảnh trên trang nhất, ô ưu đãi ở cột phải, dải thông báo trên cùng.
// Mỗi phần có bản xem trước ngay bên cạnh, bấm Lưu là trang khách đổi theo.
import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import { heroSrc } from '@/components/home/HomeHero';
import { DEFAULT_CONTENT, useStorefront, voucherBadge, voucherState, type SiteContent } from '@/lib/storefront';
import Toast from '@/components/ui/Toast';
import { FieldLabel, PageHead, Toggle, btnInk, btnLine, btnSolid, input, select, textarea } from './ui';

// Ảnh quán có sẵn (Unsplash) để chọn nhanh cho bài chính
const HERO_CHOICES = [
  '1571851534298-1ffa72eab79e',
  '1541437971345-e3a6af6cb491',
  '1514066558159-fc8c737ef259',
  '1495474472287-4d71bcdd2085',
  '1501339847302-ac426a4a7cbb',
  '1453614512568-c4024d13c247',
];
const LINKS = [
  { v: '', l: 'Không gắn liên kết' },
  { v: '/menu', l: 'Thực đơn' },
  { v: '/uu-dai', l: 'Ưu đãi' },
  { v: '/lien-he', l: 'Liên hệ' },
  { v: '/cau-chuyen', l: 'Câu chuyện' },
];

export default function ContentEditor() {
  const [toast, setToast] = useState<string | null>(null);
  return (
    <>
      <PageHead
        kicker="Cửa hàng"
        title="Nội dung trang"
        lead="Đổi tiêu đề, ảnh và lời chào trên trang nhất, chọn mã quảng bá và bật dải thông báo khi có tin mới."
        actions={
          <Link href="/" className={btnLine}>
            Xem trang nhất ↗
          </Link>
        }
      />
      <div className="mt-6 space-y-8">
        <HeroSection onSaved={setToast} />
        <PromoSection onSaved={setToast} />
        <NoticeSection onSaved={setToast} />
      </div>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

/** Khung một phần: biểu mẫu bên trái, xem trước bên phải, nút lưu ở đáy */
function Section({
  n,
  title,
  desc,
  form,
  preview,
  dirty,
  onSave,
  onReset,
}: {
  n: string;
  title: string;
  desc: string;
  form: ReactNode;
  preview: ReactNode;
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <section className="border-2 border-roast">
      <header className="flex flex-wrap items-baseline gap-x-3 border-b border-roast bg-roast/5 px-4 py-3">
        <span className="font-display text-2xl font-black text-gold">{n}</span>
        <h2 className="text-xl font-black">{title}</h2>
        <p className="w-full text-sm text-roast/65 sm:w-auto">{desc}</p>
      </header>
      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">{form}</div>
        <div>
          <p className="kicker">Khách sẽ thấy</p>
          <div className="mt-2 border-2 border-dashed border-roast/40 bg-cream p-4">{preview}</div>
        </div>
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t border-roast px-4 py-3">
        <button type="button" onClick={onSave} disabled={!dirty} className={btnSolid}>
          Lưu lên trang
        </button>
        {dirty && <span className="text-xs font-semibold text-amber-700">Có thay đổi chưa lưu</span>}
        <button type="button" onClick={onReset} className="ml-auto text-xs font-semibold tracking-wider text-roast/60 underline underline-offset-4 hover:text-roast">
          Về nội dung mặc định
        </button>
      </footer>
    </section>
  );
}

function useDraft<K extends keyof SiteContent>(keys: K[]) {
  const content = useStorefront((s) => s.content);
  const pick = (c: SiteContent) => Object.fromEntries(keys.map((k) => [k, c[k]])) as Pick<SiteContent, K>;
  const [draft, setDraft] = useState(() => pick(content));
  const dirty = JSON.stringify(draft) !== JSON.stringify(pick(content));
  return { draft, setDraft, dirty, reset: () => setDraft(pick(DEFAULT_CONTENT)) };
}

function HeroSection({ onSaved }: { onSaved: (m: string) => void }) {
  const setContent = useStorefront((s) => s.setContent);
  const { draft: d, setDraft, dirty, reset } = useDraft(['heroKicker', 'heroTitle', 'heroImage', 'heroCaption', 'heroLead']);
  const set = (k: keyof typeof d, v: string) => setDraft((s) => ({ ...s, [k]: v }));
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Section
      n="I"
      title="Bài chính trang nhất"
      desc="Phần khách thấy đầu tiên khi vào web."
      dirty={dirty}
      onReset={reset}
      onSave={async () => {
        if (await setContent(d, 'Sửa bài chính trang nhất')) onSaved('Đã lưu bài chính trang nhất');
      }}
      form={
        <>
          <FieldLabel label="Dòng nhỏ phía trên">
            <input value={d.heroKicker} onChange={(e) => set('heroKicker', e.target.value)} maxLength={40} className={input} />
          </FieldLabel>
          <FieldLabel label={`Tiêu đề lớn · ${d.heroTitle.length}/70`}>
            <textarea value={d.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} maxLength={70} rows={2} className={`${textarea} font-display text-lg font-bold`} />
          </FieldLabel>
          <div>
            <p className="font-label text-xs uppercase tracking-wider text-roast/70">Ảnh</p>
            <div className="mt-1 grid grid-cols-6 gap-1.5">
              {HERO_CHOICES.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => set('heroImage', id)}
                  aria-label="Dùng ảnh này"
                  className={`aspect-[4/3] overflow-hidden border-2 ${d.heroImage === id ? 'border-gold' : 'border-transparent hover:border-roast'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroSrc(id, 200)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={d.heroImage.startsWith('data:') ? 'Ảnh tải lên từ máy' : d.heroImage}
                onChange={(e) => set('heroImage', e.target.value)}
                placeholder="Hoặc dán đường dẫn ảnh"
                className={`${input} font-mono text-xs`}
              />
              <button type="button" onClick={() => fileRef.current?.click()} className={`${btnInk} shrink-0`}>
                Tải ảnh lên
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file || !file.type.startsWith('image/')) return;
                  const r = new FileReader();
                  r.onload = () => set('heroImage', String(r.result));
                  r.readAsDataURL(file);
                }}
              />
            </div>
          </div>
          <FieldLabel label="Chú thích dưới ảnh">
            <input value={d.heroCaption} onChange={(e) => set('heroCaption', e.target.value)} maxLength={140} className={input} />
          </FieldLabel>
          <FieldLabel label={`Đoạn mở đầu · ${d.heroLead.length}/260`}>
            <textarea value={d.heroLead} onChange={(e) => set('heroLead', e.target.value)} maxLength={260} rows={3} className={textarea} />
          </FieldLabel>
        </>
      }
      preview={
        <div>
          <p className="kicker">{d.heroKicker}</p>
          <p className="mt-1 font-display text-3xl font-black leading-[1.05]">{d.heroTitle}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroSrc(d.heroImage, 800)} alt="" className="newsprint mt-3 aspect-[16/9] w-full object-cover" />
          {d.heroCaption && <p className="mt-1.5 border-b border-roast pb-2 font-serif text-sm italic text-roast/80">{d.heroCaption}</p>}
          <p className="mt-2 text-sm leading-relaxed first-letter:float-left first-letter:mr-1.5 first-letter:font-display first-letter:text-4xl first-letter:font-black first-letter:leading-[0.8]">
            {d.heroLead}
          </p>
        </div>
      }
    />
  );
}

function PromoSection({ onSaved }: { onSaved: (m: string) => void }) {
  const setContent = useStorefront((s) => s.setContent);
  const vouchers = useStorefront((s) => s.vouchers).filter((v) => voucherState(v) === 'running');
  const { draft, setDraft, dirty, reset } = useDraft(['promo']);
  const p = draft.promo;
  const set = (k: keyof typeof p, v: string) => setDraft({ promo: { ...p, [k]: v } });
  const live = vouchers.some((v) => v.code === p.code);

  return (
    <Section
      n="II"
      title="Ô ưu đãi ở cột phải"
      desc="Con tem đỏ quảng bá một mã giảm giá."
      dirty={dirty}
      onReset={reset}
      onSave={async () => {
        if (await setContent(draft, `Đổi mã quảng bá sang ${p.code}`)) onSaved(`Trang nhất đang quảng bá mã ${p.code}`);
      }}
      form={
        <>
          <FieldLabel label="Mã quảng bá" hint="Chọn mã là các ô dưới tự điền theo mã, sửa lại tuỳ ý.">
            <select
              value={p.code}
              onChange={(e) => {
                const v = vouchers.find((x) => x.code === e.target.value);
                if (v) setDraft({ promo: { code: v.code, badge: voucherBadge(v), title: v.title, text: v.terms } });
              }}
              className={`${select} w-full font-mono`}
            >
              {!live && <option value={p.code}>{p.code} (đang tắt)</option>}
              {vouchers.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.code} · {v.title}
                </option>
              ))}
            </select>
          </FieldLabel>
          {!live && <p className="text-sm font-semibold text-chili">Mã {p.code} không còn chạy, khách sẽ không dùng được. Chọn mã khác.</p>}
          <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
            <FieldLabel label="Mệnh giá tem">
              <input value={p.badge} onChange={(e) => set('badge', e.target.value)} maxLength={8} className={`${input} font-display font-black`} />
            </FieldLabel>
            <FieldLabel label="Tiêu đề">
              <input value={p.title} onChange={(e) => set('title', e.target.value)} maxLength={60} className={input} />
            </FieldLabel>
          </div>
          <FieldLabel label="Lời giới thiệu">
            <textarea value={p.text} onChange={(e) => set('text', e.target.value)} maxLength={140} rows={2} className={textarea} />
          </FieldLabel>
        </>
      }
      preview={
        <div className="mx-auto max-w-xs">
          <div className="postage">
            <div className="postage-inner relative p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="kicker">Ưu đãi đang chạy</p>
                <p className="-mt-1 font-display text-3xl font-black leading-none text-gold">{p.badge}</p>
              </div>
              <p className="mt-1 font-display text-2xl font-black leading-tight">{p.title}</p>
              <p className="mt-2 text-sm text-roast/75">{p.text}</p>
              <div className="mt-3 flex items-stretch border-2 border-dashed border-gold bg-cream">
                <span className="flex flex-1 items-center px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-gold">{p.code}</span>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}

function NoticeSection({ onSaved }: { onSaved: (m: string) => void }) {
  const setContent = useStorefront((s) => s.setContent);
  const { draft, setDraft, dirty, reset } = useDraft(['notice']);
  const n = draft.notice;
  const set = <K extends keyof typeof n>(k: K, v: (typeof n)[K]) => setDraft({ notice: { ...n, [k]: v } });

  return (
    <Section
      n="III"
      title="Dải thông báo trên cùng"
      desc="Báo khuyến mãi, giờ nghỉ lễ, món mới… hiện trên đầu mọi trang."
      dirty={dirty}
      onReset={reset}
      onSave={async () => {
        if (await setContent(draft, n.on ? 'Bật dải thông báo' : 'Tắt dải thông báo')) onSaved(n.on ? 'Dải thông báo đang hiện trên web' : 'Đã tắt dải thông báo');
      }}
      form={
        <>
          <label className="flex items-center justify-between gap-3 border-2 border-roast/30 px-3 py-2.5">
            <span>
              <span className="block font-semibold">Hiện dải thông báo</span>
              <span className="block text-xs text-roast/60">Tắt khi hết khuyến mãi để trang gọn lại.</span>
            </span>
            <Toggle on={n.on} label="Hiện dải thông báo" onChange={(v) => set('on', v)} />
          </label>
          <FieldLabel label={`Nội dung · ${n.text.length}/90`}>
            <input value={n.text} onChange={(e) => set('text', e.target.value)} maxLength={90} className={input} />
          </FieldLabel>
          <FieldLabel label="Bấm vào thì mở">
            <select value={n.href} onChange={(e) => set('href', e.target.value)} className={`${select} w-full`}>
              {LINKS.map((l) => (
                <option key={l.v} value={l.v}>
                  {l.l}
                </option>
              ))}
            </select>
          </FieldLabel>
        </>
      }
      preview={
        n.on && n.text.trim() ? (
          <div className="bg-gold px-4 py-1.5 text-center text-foam">
            <span className="font-label text-xs font-semibold uppercase tracking-wider">{n.text}</span> {n.href && <span aria-hidden="true">→</span>}
          </div>
        ) : (
          <p className="text-center text-sm text-roast/55">Dải thông báo đang tắt.</p>
        )
      }
    />
  );
}

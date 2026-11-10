'use client';

// TÌM NHANH TOÀN KHU QUẢN LÝ (Ctrl+K hoặc /): món, mã giảm giá, nguyên liệu, phản hồi, các mục và thao tác.
// Dùng cùng bộ tìm của trang khách: gõ không dấu, chữ cái đầu ("cpsd"), tên gọi khác ("cf").
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { TOPIC_LABEL, useFeedbackList } from '@/lib/feedback-admin';
import { formatVnd } from '@/lib/format';
import { qtyText, stateOf, STATE_LABEL, useInventory } from '@/lib/inventory';
import { MANAGER_SECTIONS } from '@/lib/manager-nav';
import { useAllProducts } from '@/lib/products';
import { matchText, type Range } from '@/lib/search';
import { useStorefront, voucherState, VOUCHER_STATE_LABEL } from '@/lib/storefront';
import Highlight from '@/components/ui/Highlight';
import { SearchIcon } from '@/components/ui/Icons';

interface Hit {
  group: string;
  title: string;
  ranges: Range[];
  meta: string;
  href: string;
  score: number;
}

const ACTIONS = [
  { title: 'Nhập kho', href: '/quan-ly/nhap-kho', keywords: ['nhap hang', 'mua', 'phieu nhap'] },
  { title: 'Tạo mã giảm giá mới', href: '/quan-ly/ma-giam-gia?tao=1', keywords: ['voucher', 'khuyen mai'] },
  { title: 'Bật dải thông báo trên web', href: '/quan-ly/noi-dung', keywords: ['banner', 'thong bao'] },
  { title: 'Ẩn món khỏi thực đơn', href: '/quan-ly/thuc-don', keywords: ['tat mon', 'het hang'] },
];
const GROUP_ORDER = ['Thao tác', 'Mục', 'Món', 'Mã giảm giá', 'Nguyên liệu', 'Phản hồi'];

export default function QuickSearch() {
  const [open, setOpen] = useState(false);

  // Ctrl+K / Cmd+K ở bất kỳ đâu; "/" khi không đang gõ trong ô nào
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName));
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="plain-btn flex h-10 w-full items-center gap-2 border-2 border-roast/30 bg-cream px-3 text-sm text-roast/55 hover:border-roast hover:text-roast"
        aria-label="Tìm nhanh"
      >
        <SearchIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">Tìm kiếm</span>
      </button>
      {open && <Palette onClose={() => setOpen(false)} />}
    </>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const { data: products = [] } = useAllProducts();
  const vouchers = useStorefront((s) => s.vouchers);
  const { ingredients } = useInventory();
  const { data: feedback = [] } = useFeedbackList();

  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim();
    const out: Hit[] = [];
    const add = (group: string, title: string, meta: string, href: string, extra: string[] = []) => {
      if (!t) return;
      const m = matchText(title, t);
      if (m) out.push({ group, title, ranges: m.ranges, meta, href, score: m.score });
      else if (extra.some((x) => x && matchText(x, t))) out.push({ group, title, ranges: [], meta, href, score: 20 });
    };
    if (!t) {
      // Chưa gõ gì: gợi ý thao tác hay dùng và các mục
      ACTIONS.slice(0, 3).forEach((a) => out.push({ group: 'Thao tác', title: a.title, ranges: [], meta: '', href: a.href, score: 0 }));
      MANAGER_SECTIONS.forEach((s) => out.push({ group: 'Mục', title: s.label, ranges: [], meta: '', href: s.href, score: 0 }));
      return out;
    }
    ACTIONS.forEach((a) => add('Thao tác', a.title, '', a.href, a.keywords));
    MANAGER_SECTIONS.forEach((s) => add('Mục', s.label, '', s.href, s.keywords));
    products.forEach((p) =>
      add('Món', p.name, `${formatVnd(p.price)}${p.hidden ? ' · đang ẩn' : p.stock <= 0 ? ' · hết hàng' : ''}`, `/quan-ly/thuc-don?sua=${p.id}`, [...p.keywords, p.tagline ?? '']),
    );
    vouchers.forEach((v) => add('Mã giảm giá', v.code, `${v.title} · ${VOUCHER_STATE_LABEL[voucherState(v)]}`, `/quan-ly/ma-giam-gia?sua=${v.code}`, [v.title]));
    ingredients.forEach((i) => add('Nguyên liệu', i.name, `${qtyText(i.stock, i.unit)} · ${STATE_LABEL[stateOf(i)]}`, `/quan-ly/nguyen-lieu?xem=${i.id}`));
    feedback.forEach((f) => add('Phản hồi', f.name, `${TOPIC_LABEL[f.topic] ?? f.topic} · ${f.message.slice(0, 50)}`, `/quan-ly/phan-hoi?xem=${f.id}`, [f.message, f.orderCode ?? '']));
    // Mỗi nhóm tối đa 5 kết quả, nhóm có kết quả khớp tốt nhất lên trước
    const byGroup = new Map<string, Hit[]>();
    for (const h of out.sort((a, b) => b.score - a.score)) {
      const g = byGroup.get(h.group) ?? [];
      if (g.length < 5) g.push(h);
      byGroup.set(h.group, g);
    }
    return [...byGroup.entries()].sort((a, b) => b[1][0].score - a[1][0].score || GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0])).flatMap(([, g]) => g);
  }, [q, products, vouchers, ingredients, feedback]);

  useEffect(() => setActive(0), [q]);

  function go(h: Hit | undefined) {
    if (!h) return;
    onClose();
    router.push(h.href);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(hits.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') go(hits[active]);
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] animate-fade-in bg-roast/50 px-4 pt-[12vh]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Tìm nhanh" onClick={(e) => e.stopPropagation()} className="mx-auto max-w-2xl animate-rise border-2 border-roast bg-cream">
        <div className="flex items-center gap-3 border-b-2 border-roast px-4">
          <SearchIcon className="h-5 w-5 shrink-0 text-roast/60" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Tìm món, mã giảm giá, nguyên liệu, thư góp ý"
            className="h-14 flex-1 bg-transparent font-serif text-lg focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="qs-list"
          />
        </div>
        <ul id="qs-list" role="listbox" className="max-h-[60vh] overflow-y-auto py-2">
          {hits.length === 0 && <li className="px-4 py-8 text-center text-roast/60">Không tìm thấy “{q}”.</li>}
          {hits.map((h, i) => (
            <li key={`${h.group}-${h.href}-${h.title}`} role="option" aria-selected={i === active}>
              {(i === 0 || hits[i - 1].group !== h.group) && <p className="kicker px-4 pb-1 pt-3 first:pt-1">{h.group}</p>}
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h)}
                className={`plain-btn flex w-full items-baseline justify-between gap-4 px-4 py-2 text-left ${i === active ? 'bg-roast text-cream' : ''}`}
              >
                <span className="truncate font-semibold">
                  <Highlight text={h.title} ranges={h.ranges} />
                </span>
                {h.meta && <span className={`shrink-0 truncate text-xs ${i === active ? 'text-cream/70' : 'text-roast/55'}`}>{h.meta}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

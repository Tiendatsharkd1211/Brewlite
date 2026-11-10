'use client';

// PHẢN HỒI CỦA KHÁCH: thư góp ý gửi từ trang Liên hệ. Danh sách bên trái, nội dung bên phải;
// đánh dấu đang xử lý / đã xong, ghi chú nội bộ, trả lời qua email.
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { TOPIC_LABEL, useFeedbackList, type FeedbackRow } from '@/lib/feedback-admin';
import { formatDateTime } from '@/lib/format';
import { matchText } from '@/lib/search';
import { FEEDBACK_STATUS_LABEL, useStorefront, type FeedbackStatus } from '@/lib/storefront';
import { SearchIcon } from '@/components/ui/Icons';
import { Chip, PageHead, btnInk, btnLine, btnSolid, input, select, textarea } from './ui';

type Tab = 'open' | FeedbackStatus | 'all';
const TABS: { id: Tab; label: string }[] = [
  { id: 'open', label: 'Cần xử lý' },
  { id: 'new', label: 'Mới' },
  { id: 'doing', label: 'Đang xử lý' },
  { id: 'done', label: 'Đã xong' },
  { id: 'all', label: 'Tất cả' },
];
const TONE: Record<FeedbackStatus, 'bad' | 'warn' | 'ok'> = { new: 'bad', doing: 'warn', done: 'ok' };

export default function FeedbackInbox() {
  const params = useSearchParams();
  const { data = [], isLoading, isError, refetch } = useFeedbackList();
  const states = useStorefront((s) => s.feedback);
  const [tab, setTab] = useState<Tab>('open');
  const [topic, setTopic] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(params.get('xem'));

  useEffect(() => {
    const id = params.get('xem');
    if (id) {
      setOpenId(id);
      setTab('all');
    }
  }, [params]);

  const statusOf = (f: FeedbackRow): FeedbackStatus => states[f.id]?.status ?? 'new';
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { open: 0, new: 0, doing: 0, done: 0, all: data.length };
    for (const f of data) {
      const s = states[f.id]?.status ?? 'new';
      c[s]++;
      if (s !== 'done') c.open++;
    }
    return c;
  }, [data, states]);

  const list = data.filter((f) => {
    const s = statusOf(f);
    if (tab === 'open' ? s === 'done' : tab !== 'all' && s !== tab) return false;
    if (topic !== 'all' && f.topic !== topic) return false;
    const t = q.trim();
    return !t || matchText(f.name, t) || matchText(f.message, t) || f.email.includes(t.toLowerCase()) || (f.orderCode ?? '').includes(t.toUpperCase());
  });
  const current = data.find((f) => f.id === openId) ?? list[0] ?? null;

  return (
    <>
      <PageHead kicker="Khách hàng" title="Phản hồi của khách" lead="Thư góp ý khách gửi từ trang Liên hệ. Trả lời trong ngày, xong việc thì đánh dấu Đã xong." />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">Tìm phản hồi</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roast/50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm thư góp ý" className={`${input} pl-9`} />
        </label>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className={select} aria-label="Chủ đề">
          <option value="all">Mọi chủ đề</option>
          {Object.entries(TOPIC_LABEL).map(([id, l]) => (
            <option key={id} value={id}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div role="tablist" aria-label="Trạng thái" className="mt-4 flex gap-1 overflow-x-auto border-b-2 border-roast">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-0.5 shrink-0 border-b-[3px] px-3 py-2 text-xs font-semibold tracking-wider ${tab === t.id ? 'border-gold text-roast' : 'border-transparent text-roast/55 hover:text-roast'}`}
          >
            {t.label} <span className="ml-1 font-mono text-[11px] opacity-70">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-roast/60">Đang tải phản hồi…</p>
      ) : isError ? (
        <div className="py-10 text-center">
          <p className="text-roast/70">Chưa tải được phản hồi.</p>
          <button type="button" onClick={() => refetch()} className={`${btnLine} mt-3`}>
            Thử lại
          </button>
        </div>
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-roast/60">{data.length ? 'Không có thư nào ở mục này.' : 'Chưa có khách nào gửi góp ý.'}</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[22rem_1fr]">
          <ul className="max-h-[70vh] divide-y divide-dotted divide-roast/40 overflow-y-auto border-2 border-roast">
            {list.map((f) => {
              const s = statusOf(f);
              const on = current?.id === f.id;
              return (
                <li key={f.id}>
                  <button type="button" onClick={() => setOpenId(f.id)} className={`plain-btn block w-full px-3 py-3 text-left ${on ? 'bg-roast text-cream' : 'hover:bg-roast/5'}`}>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${s === 'new' ? 'font-bold' : 'font-semibold'}`}>
                        {s === 'new' && <span className={`mr-1.5 inline-block h-2 w-2 ${on ? 'bg-cream' : 'bg-chili'}`} aria-label="Mới" />}
                        {f.name}
                      </span>
                      <span className={`shrink-0 font-mono text-[11px] ${on ? 'text-cream/70' : 'text-roast/55'}`}>{formatDateTime(f.createdAt)}</span>
                    </span>
                    <span className={`block font-label text-[10px] uppercase tracking-wider ${on ? 'text-cream/70' : 'text-roast/55'}`}>
                      {TOPIC_LABEL[f.topic] ?? f.topic}
                      {f.orderCode && ` · ${f.orderCode}`}
                    </span>
                    <span className={`mt-0.5 line-clamp-2 block text-sm ${on ? 'text-cream/85' : 'text-roast/75'}`}>{f.message}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {current && <Detail key={current.id} f={current} />}
        </div>
      )}
    </>
  );
}

function Detail({ f }: { f: FeedbackRow }) {
  const state = useStorefront((s) => s.feedback[f.id]);
  const setFeedback = useStorefront((s) => s.setFeedback);
  const status = state?.status ?? 'new';
  const [note, setNote] = useState(state?.note ?? '');
  const subject = encodeURIComponent(`BrewLite trả lời góp ý${f.orderCode ? ` về đơn ${f.orderCode}` : ''}`);
  const body = encodeURIComponent(`Chào ${f.name},\n\nCảm ơn bạn đã góp ý cho BrewLite.\n\n\n---\nBạn đã viết: ${f.message}`);

  return (
    <article className="border-2 border-roast">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-roast px-5 py-4">
        <div>
          <p className="font-display text-2xl font-black leading-tight">{f.name}</p>
          <p className="text-sm text-roast/65">
            <a href={`mailto:${f.email}`} className="underline underline-offset-4 hover:text-gold">
              {f.email}
            </a>{' '}
            · {formatDateTime(f.createdAt)}
          </p>
        </div>
        <Chip tone={TONE[status]}>{FEEDBACK_STATUS_LABEL[status]}</Chip>
      </header>
      <div className="px-5 py-4">
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="font-label text-[10px] uppercase tracking-wider text-roast/55">Chủ đề</dt>
            <dd className="font-semibold">{TOPIC_LABEL[f.topic] ?? f.topic}</dd>
          </div>
          {f.orderCode && (
            <div>
              <dt className="font-label text-[10px] uppercase tracking-wider text-roast/55">Mã đơn</dt>
              <dd className="font-mono font-semibold">{f.orderCode}</dd>
            </div>
          )}
          <div>
            <dt className="font-label text-[10px] uppercase tracking-wider text-roast/55">Mã thư</dt>
            <dd className="font-mono">{f.id.slice(0, 8).toUpperCase()}</dd>
          </div>
        </dl>
        <blockquote className="mt-4 whitespace-pre-line border-l-4 border-gold bg-foam px-4 py-3 font-serif text-[15px] leading-relaxed">{f.message}</blockquote>

        <label className="mt-5 block">
          <span className="font-label text-xs uppercase tracking-wider text-roast/70">Ghi chú nội bộ (khách không thấy)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (state?.note ?? '') && setFeedback(f.id, { note })}
            rows={3}
            placeholder="Ví dụ: đã gọi khách, hẹn pha lại ly mới vào sáng mai"
            className={`${textarea} mt-1`}
          />
        </label>
        {state?.updatedAt && <p className="mt-1 text-xs text-roast/50">Cập nhật {formatDateTime(state.updatedAt)}</p>}
      </div>
      <footer className="flex flex-wrap gap-2 border-t border-roast px-5 py-4">
        <a href={`mailto:${f.email}?subject=${subject}&body=${body}`} onClick={() => status === 'new' && setFeedback(f.id, { status: 'doing', note })} className={btnInk}>
          Trả lời qua email
        </a>
        {status !== 'doing' && status !== 'done' && (
          <button type="button" onClick={() => setFeedback(f.id, { status: 'doing', note })} className={btnLine}>
            Nhận xử lý
          </button>
        )}
        {status !== 'done' ? (
          <button type="button" onClick={() => setFeedback(f.id, { status: 'done', note })} className={btnSolid}>
            Đánh dấu đã xong
          </button>
        ) : (
          <button type="button" onClick={() => setFeedback(f.id, { status: 'doing', note })} className={btnLine}>
            Mở lại
          </button>
        )}
      </footer>
    </article>
  );
}

'use client';

// NHẬP KHO: quản lý tự nhập số lượng và giá mua cho từng nguyên liệu, bấm Nhập kho là tồn tăng ngay
// (giá vốn tính lại theo bình quân). Bên dưới là lịch sử các phiếu đã nhập.
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { formatDateTime, formatVnd } from '@/lib/format';
import { GROUPS, qtyText, receiptTotal, stateOf, suggestQty, useInventory, type Receipt } from '@/lib/inventory';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import { CloseIcon, TrashIcon } from '@/components/ui/Icons';
import { PageHead, Pager, Panel, StockBadge, btnLine, btnSolid, num, td, th, toolSelect, tr } from './ui';

interface Line {
  key: number;
  ingredientId: string;
  qty: string;
  price: string;
}

let lineKey = 0;
const toNum = (s: string) => Number(s.replace(',', '.'));
const cell = 'h-9 w-full border border-roast/25 bg-cream px-2.5 text-sm focus:border-roast focus:outline-none';
const PAGE = 8;

export default function Receipts() {
  const params = useSearchParams();
  const { user } = useAuth();
  const { ingredients, receipts, saveReceipt } = useInventory();
  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [viewing, setViewing] = useState<Receipt | null>(null);

  const lineFor = (id: string, qty?: number): Line => {
    const ing = byId.get(id);
    return { key: ++lineKey, ingredientId: id, qty: qty ? String(qty) : '', price: ing ? String(ing.cost) : '' };
  };

  // Mở từ trang Nguyên liệu: ?nl=<id> thêm sẵn một dòng
  useEffect(() => {
    const id = params.get('nl');
    const ing = id ? byId.get(id) : undefined;
    if (ing) setLines((ls) => (ls.some((l) => l.ingredientId === ing.id) ? ls : [...ls.filter((l) => l.ingredientId), lineFor(ing.id, suggestQty(ing) || undefined)]));
    else setLines((ls) => (ls.length ? ls : [lineFor('')]));
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const needs = ingredients.filter((i) => stateOf(i) !== 'ok' && !lines.some((l) => l.ingredientId === i.id));
  const valid = lines.filter((l) => l.ingredientId && toNum(l.qty) > 0);
  const total = valid.reduce((n, l) => n + toNum(l.qty) * (toNum(l.price) || 0), 0);
  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function addNeeds() {
    setLines((ls) => [...ls.filter((l) => l.ingredientId), ...needs.map((i) => lineFor(i.id, suggestQty(i)))]);
  }

  async function submit() {
    if (!valid.length) return setError('Chọn nguyên liệu và nhập số lượng.');
    const id = await saveReceipt({ note: note.trim(), lines: valid.map((l) => ({ ingredientId: l.ingredientId, qty: toNum(l.qty), price: Math.round(toNum(l.price)) || 0 })) });
    if (!id) return setError(useInventory.getState().error ?? 'Chưa lưu được phiếu nhập.');
    setToast(`Đã nhập kho phiếu ${id}, tồn đã tăng.`);
    setLines([lineFor('')]);
    setNote('');
    setError(null);
    setPage(0);
  }

  const history = receipts.slice(page * PAGE, page * PAGE + PAGE);
  const monthTotal = receipts.filter((r) => new Date(r.at).getMonth() === new Date().getMonth()).reduce((n, r) => n + receiptTotal(r), 0);

  return (
    <>
      <PageHead title="Nhập kho" lead={`Tháng này đã nhập ${formatVnd(monthTotal)}.`} />

      {/* Phiếu nhập mới */}
      <Panel
        className="mt-5"
        toolbar={
          <>
            <h2 className="mr-auto font-semibold">Phiếu nhập mới</h2>
            {needs.length > 0 && (
              <button type="button" onClick={addNeeds} className="h-9 border border-roast/30 px-3 text-xs font-semibold tracking-wider hover:border-roast">
                + Thêm {needs.length} món cần nhập
              </button>
            )}
          </>
        }
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className={`${cell} max-w-sm flex-1`} />
            <span className="ml-auto text-sm text-roast/60">
              Tổng tiền <b className={`ml-1 text-lg text-roast ${num}`}>{formatVnd(total)}</b>
            </span>
            <button type="button" onClick={submit} disabled={!valid.length} className={btnSolid}>
              Nhập kho
            </button>
            {error && <p className="w-full text-sm text-chili">{error}</p>}
          </div>
        }
      >
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr>
                <th className={th}>Nguyên liệu</th>
                <th className={`${th} w-40`}>Số lượng</th>
                <th className={`${th} w-44`}>Đơn giá</th>
                <th className={`${th} w-32 text-right`}>Thành tiền</th>
                <th className={`${th} w-12`}>
                  <span className="sr-only">Xoá</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const ing = byId.get(l.ingredientId);
                const amount = toNum(l.qty) * (toNum(l.price) || 0);
                return (
                  <tr key={l.key} className="border-t border-roast/10">
                    <td className="px-4 py-2 align-top">
                      <select
                        value={l.ingredientId}
                        onChange={(e) => {
                          const next = byId.get(e.target.value);
                          update(l.key, { ingredientId: e.target.value, price: next ? String(next.cost) : '' });
                        }}
                        className={`${toolSelect} w-full`}
                        aria-label="Nguyên liệu"
                      >
                        <option value="">Chọn nguyên liệu…</option>
                        {GROUPS.map((g) => (
                          <optgroup key={g.id} label={g.name}>
                            {ingredients
                              .filter((i) => i.group === g.id)
                              .map((i) => (
                                <option key={i.id} value={i.id} disabled={i.id !== l.ingredientId && lines.some((x) => x.ingredientId === i.id)}>
                                  {i.name}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                      {ing && (
                        <span className="mt-1.5 flex items-center gap-2 text-xs text-roast/55">
                          Đang có {qtyText(ing.stock, ing.unit)} <StockBadge state={stateOf(ing)} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <span className="relative block">
                        <input inputMode="decimal" value={l.qty} onChange={(e) => update(l.key, { qty: e.target.value })} placeholder="0" className={`${cell} pr-12 text-right ${num}`} aria-label="Số lượng" />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-roast/50">{ing?.unit ?? ''}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 align-top">
                      <span className="relative block">
                        <input inputMode="numeric" value={l.price} onChange={(e) => update(l.key, { price: e.target.value.replace(/[^\d]/g, '') })} placeholder="0" className={`${cell} pr-14 text-right ${num}`} aria-label="Đơn giá" />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-roast/50">đ{ing ? `/${ing.unit}` : ''}</span>
                      </span>
                    </td>
                    <td className={`px-4 py-2 pt-4 text-right align-top font-semibold ${num}`}>{amount ? formatVnd(amount) : '—'}</td>
                    <td className="px-2 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [lineFor('')]))}
                        aria-label="Xoá dòng"
                        className="grid h-9 w-9 place-items-center text-roast/45 hover:text-chili"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-roast/10 px-4 py-2">
          <button type="button" onClick={() => setLines((ls) => [...ls, lineFor('')])} className="h-8 text-xs font-semibold tracking-wider text-roast/70 hover:text-roast">
            + Thêm dòng
          </button>
        </div>
      </Panel>

      {/* Lịch sử */}
      <Panel className="mt-6" toolbar={<h2 className="font-semibold">Lịch sử nhập kho</h2>} footer={<Pager page={page} size={PAGE} total={receipts.length} onPage={setPage} />}>
        {receipts.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-roast/60">Chưa có phiếu nhập nào.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr>
                  <th className={`${th} w-28`}>Mã phiếu</th>
                  <th className={`${th} w-44`}>Thời gian</th>
                  <th className={th}>Mặt hàng</th>
                  <th className={`${th} w-36 text-right`}>Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} onClick={() => setViewing(r)} className={`${tr} cursor-pointer`}>
                    <td className={`${td} font-semibold`}>{r.id}</td>
                    <td className={`${td} text-roast/70 ${num}`}>{formatDateTime(r.at)}</td>
                    <td className={td}>
                      <span className="line-clamp-1">{r.lines.map((l) => byId.get(l.ingredientId)?.name ?? l.ingredientId).join(', ')}</span>
                      {r.note && <span className="block truncate text-xs text-roast/55">{r.note}</span>}
                    </td>
                    <td className={`${td} text-right font-semibold ${num}`}>{formatVnd(receiptTotal(r))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {viewing && (
        <Modal open titleId="receipt-title" onClose={() => setViewing(null)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="receipt-title" className="font-display text-2xl font-black">
                Phiếu {viewing.id}
              </h2>
              <p className="text-sm text-roast/60">
                {formatDateTime(viewing.at)} · {viewing.by}
              </p>
            </div>
            <button type="button" onClick={() => setViewing(null)} aria-label="Đóng" className="grid h-9 w-9 place-items-center hover:bg-roast/5">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Nguyên liệu</th>
                <th className={`${th} text-right`}>Số lượng</th>
                <th className={`${th} text-right`}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {viewing.lines.map((l) => {
                const ing = byId.get(l.ingredientId);
                return (
                  <tr key={l.ingredientId} className="border-t border-roast/10">
                    <td className={td}>
                      {ing?.name ?? l.ingredientId}
                      <span className={`block text-xs text-roast/55 ${num}`}>
                        {formatVnd(l.price)}/{ing?.unit}
                      </span>
                    </td>
                    <td className={`${td} text-right ${num}`}>{qtyText(l.qty, ing?.unit ?? '')}</td>
                    <td className={`${td} text-right ${num}`}>{formatVnd(l.qty * l.price)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 flex justify-between border-t border-roast pt-3 font-semibold">
            Tổng tiền <span className={num}>{formatVnd(receiptTotal(viewing))}</span>
          </p>
          {viewing.note && <p className="mt-2 text-sm text-roast/65">Ghi chú: {viewing.note}</p>}
          <button type="button" onClick={() => setViewing(null)} className={`${btnLine} mt-4`}>
            Đóng
          </button>
        </Modal>
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

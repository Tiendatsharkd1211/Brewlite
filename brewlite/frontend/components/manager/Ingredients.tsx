'use client';

// NGUYÊN LIỆU: ô số liệu bấm để lọc, bảng có chia trang. Bấm một dòng mở form sửa bình thường
// (tên, nhóm, đơn vị, tồn kho, mức tối thiểu, giá vốn); bên dưới là lịch sử nhập kho, xuất pha chế.
// Sửa số tồn trong form không ghi lịch sử: lịch sử chỉ giữ việc quan trọng (nhập, xuất).
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { formatDateTime, formatVnd } from '@/lib/format';
import { GROUPS, MOVE_LABEL, qtyText, stateOf, useInventory, type GroupId, type Ingredient, type StockState } from '@/lib/inventory';
import { useProductMap } from '@/lib/products';
import { matchText } from '@/lib/search';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import { SearchIcon } from '@/components/ui/Icons';
import { FieldLabel, FilterTile, PageHead, Pager, Panel, StockBadge, btnLine, btnSolid, input, num, searchInput, td, th, toolSelect, tr } from './ui';

type Filter = 'all' | 'need' | 'out';
const PAGE = 10;
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
const groupName = (id: GroupId) => GROUPS.find((g) => g.id === id)?.name ?? id;
const RANK: Record<StockState, number> = { out: 0, low: 1, ok: 2 };

export default function Ingredients() {
  const params = useSearchParams();
  const router = useRouter();
  const { ingredients } = useInventory();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<GroupId | 'all'>('all');
  const [filter, setFilter] = useState<Filter>(params.get('loc') === 'can-nhap' ? 'need' : 'all');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Ingredient | 'new' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Mở từ ô tìm nhanh hoặc từ trang Công thức (?xem=id)
  useEffect(() => {
    const id = params.get('xem');
    const ing = id ? ingredients.find((i) => i.id === id) : null;
    if (ing) setEditing(ing);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setPage(0), [q, group, filter]);

  const counts = useMemo(() => {
    let need = 0;
    let out = 0;
    for (const i of ingredients) {
      const st = stateOf(i);
      if (st !== 'ok') need++;
      if (st === 'out') out++;
    }
    return { all: ingredients.length, need, out, value: ingredients.reduce((n, i) => n + i.stock * i.cost, 0) };
  }, [ingredients]);

  const list = useMemo(() => {
    const term = q.trim();
    return ingredients
      .filter((i) => group === 'all' || i.group === group)
      .filter((i) => filter === 'all' || (filter === 'need' ? stateOf(i) !== 'ok' : stateOf(i) === 'out'))
      .filter((i) => !term || matchText(i.name, term) !== null || fold(i.name).includes(fold(term)))
      .sort((a, b) => RANK[stateOf(a)] - RANK[stateOf(b)] || a.name.localeCompare(b.name, 'vi'));
  }, [ingredients, q, group, filter]);
  const rows = list.slice(page * PAGE, page * PAGE + PAGE);

  function close() {
    setEditing(null);
    if (params.get('xem')) router.replace('/quan-ly/nguyen-lieu');
  }

  return (
    <>
      <PageHead
        title="Nguyên liệu"
        actions={
          <>
            <Link href="/quan-ly/nhap-kho" className={btnLine}>
              Nhập kho
            </Link>
            <button type="button" onClick={() => setEditing('new')} className={btnSolid}>
              + Thêm nguyên liệu
            </button>
          </>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FilterTile label="Tất cả" value={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterTile label="Cần nhập" value={counts.need} tone={counts.need ? 'text-amber-700' : ''} active={filter === 'need'} onClick={() => setFilter('need')} />
        <FilterTile label="Hết hàng" value={counts.out} tone={counts.out ? 'text-chili' : ''} active={filter === 'out'} onClick={() => setFilter('out')} />
        <FilterTile label="Giá trị tồn kho" value={formatVnd(counts.value)} />
      </div>

      <Panel
        className="mt-4"
        toolbar={
          <>
            <label className="relative min-w-[12rem] flex-1">
              <span className="sr-only">Tìm nguyên liệu</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roast/45" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm nguyên liệu" className={searchInput} />
            </label>
            <select value={group} onChange={(e) => setGroup(e.target.value as GroupId | 'all')} className={toolSelect} aria-label="Nhóm">
              <option value="all">Tất cả nhóm</option>
              {GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </>
        }
        footer={<Pager page={page} size={PAGE} total={list.length} onPage={setPage} />}
      >
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-roast/60">Không có nguyên liệu nào khớp bộ lọc.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr>
                  <th className={th}>Nguyên liệu</th>
                  <th className={th}>Nhóm</th>
                  <th className={`${th} text-right`}>Tồn kho</th>
                  <th className={`${th} text-right`}>Tối thiểu</th>
                  <th className={th}>Trạng thái</th>
                  <th className={`${th} text-right`}>Giá vốn</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id} onClick={() => setEditing(i)} className={`${tr} cursor-pointer`}>
                    <td className={`${td} font-semibold`}>{i.name}</td>
                    <td className={`${td} text-roast/70`}>{groupName(i.group)}</td>
                    <td className={`${td} text-right font-semibold ${num}`}>{qtyText(i.stock, i.unit)}</td>
                    <td className={`${td} text-right text-roast/60 ${num}`}>{qtyText(i.min, i.unit)}</td>
                    <td className={td}>
                      <StockBadge state={stateOf(i)} />
                    </td>
                    <td className={`${td} text-right text-roast/75 ${num}`}>
                      {formatVnd(i.cost)}/{i.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <IngredientForm value={editing} onClose={close} onSaved={(name) => setToast(`Đã lưu ${name}.`)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

/** Thêm / sửa nguyên liệu, gồm cả số tồn. Khi sửa: bên dưới có món đang dùng và lịch sử nhập, xuất gần đây. */
function IngredientForm({ value, onClose, onSaved }: { value: Ingredient | 'new' | null; onClose: () => void; onSaved: (name: string) => void }) {
  const { saveIngredient, ingredients, movements, recipes } = useInventory();
  const products = useProductMap();
  const empty: Ingredient = { id: '', name: '', group: 'ca-phe', unit: 'kg', sub: 'g', per: 1000, stock: 0, min: 1, cost: 0 };
  const [f, setF] = useState<Ingredient>(empty);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setF(value && value !== 'new' ? value : empty);
    setError(null);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const isNew = value === 'new';
  const set = <K extends keyof Ingredient>(k: K, v: Ingredient[K]) => setF((x) => ({ ...x, [k]: v }));
  const history = isNew ? [] : movements.filter((m) => m.ingredientId === f.id).slice(0, 5);
  const usedIn = isNew ? [] : recipes.filter((r) => r.lines.some((l) => l.ingredientId === f.id)).map((r) => products.get(r.productId)?.name ?? r.productId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const name = f.name.trim();
    if (name.length < 2) return setError('Nhập tên nguyên liệu.');
    if (!f.unit.trim() || !f.sub.trim() || !(f.per > 0)) return setError('Đơn vị và hệ số đổi phải hợp lệ.');
    if (!(f.stock >= 0) || !(f.min >= 0) || !(f.cost >= 0)) return setError('Tồn kho, mức tối thiểu và giá vốn không được âm.');
    const id = isNew
      ? fold(name)
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      : f.id;
    if (isNew && ingredients.some((i) => i.id === id)) return setError('Đã có nguyên liệu trùng tên.');
    if (!(await saveIngredient({ ...f, id, name }, isNew))) return setError(useInventory.getState().error ?? 'Chưa lưu được.');
    onSaved(name);
    onClose();
  }

  return (
    <Modal open={value !== null} titleId="ingredient-form-title" onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <h2 id="ingredient-form-title" className="font-display text-2xl font-black">
          {isNew ? 'Thêm nguyên liệu' : f.name || 'Sửa nguyên liệu'}
        </h2>
        {!isNew && <StockBadge state={stateOf(f)} />}
      </div>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        {error && (
          <p role="alert" className="border border-chili px-3 py-2 text-sm text-chili sm:col-span-2">
            {error}
          </p>
        )}
        <FieldLabel label="Tên nguyên liệu">
          <input value={f.name} onChange={(e) => set('name', e.target.value)} className={input} />
        </FieldLabel>
        <FieldLabel label="Nhóm">
          <select value={f.group} onChange={(e) => set('group', e.target.value as GroupId)} className={input}>
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label={`Tồn kho (${f.unit || 'đơn vị'})`}>
          <input type="number" min={0} step="any" value={f.stock} onChange={(e) => set('stock', Number(e.target.value))} className={input} />
        </FieldLabel>
        <FieldLabel label={`Mức tối thiểu (${f.unit || 'đơn vị'})`}>
          <input type="number" min={0} step="any" value={f.min} onChange={(e) => set('min', Number(e.target.value))} className={input} />
        </FieldLabel>
        <FieldLabel label={`Giá vốn (đ/${f.unit || 'đơn vị'})`}>
          <input type="number" min={0} step={100} value={f.cost} onChange={(e) => set('cost', Number(e.target.value))} className={input} />
        </FieldLabel>
        <FieldLabel label="Đơn vị nhập" hint="kg, lít, hộp, chai, cái...">
          <input value={f.unit} onChange={(e) => set('unit', e.target.value)} className={input} />
        </FieldLabel>
        <FieldLabel label="Đổi ra đơn vị pha chế" hint={`1 ${f.unit || '...'} = ${f.per || '...'} ${f.sub || '...'}`}>
          <span className="flex gap-2">
            <input type="number" min={0} step="any" value={f.per} onChange={(e) => set('per', Number(e.target.value))} className={`${input} w-24`} aria-label="Hệ số đổi" />
            <input value={f.sub} onChange={(e) => set('sub', e.target.value)} className={input} aria-label="Đơn vị pha chế" />
          </span>
        </FieldLabel>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" className={btnSolid}>
            {isNew ? 'Thêm nguyên liệu' : 'Lưu thay đổi'}
          </button>
          {!isNew && (
            <Link href={`/quan-ly/nhap-kho?nl=${f.id}`} className={btnLine}>
              Nhập kho
            </Link>
          )}
          <button type="button" onClick={onClose} className={`${btnLine} border-roast/30`}>
            Huỷ
          </button>
        </div>
      </form>

      {!isNew && (
        <div className="mt-5 border-t border-roast/20 pt-4 text-sm">
          <p className="text-roast/70">
            <span className="font-semibold text-roast">Dùng trong: </span>
            {usedIn.length ? usedIn.join(', ') : 'chưa có món nào'}
          </p>
          <p className="mt-3 font-semibold">Nhập, xuất gần đây</p>
          {history.length === 0 ? (
            <p className="mt-1 text-roast/60">Chưa có ghi nhận nào.</p>
          ) : (
            <ul className="mt-1">
              {history.map((m) => (
                <li key={m.id} className="flex justify-between gap-3 border-b border-roast/10 py-1.5">
                  <span>
                    {MOVE_LABEL[m.kind]}
                    {m.ref && <span className="text-roast/55"> · {m.ref}</span>}
                    <span className="text-roast/55"> · {formatDateTime(m.at)}</span>
                  </span>
                  <span className={`shrink-0 font-semibold ${num} ${m.qty >= 0 ? 'text-leaf' : 'text-chili'}`}>
                    {m.qty >= 0 ? '+' : '−'}
                    {qtyText(Math.abs(m.qty), f.unit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

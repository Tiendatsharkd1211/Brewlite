'use client';

// SỬA CÔNG THỨC một món, thao tác chủ yếu bằng bấm: nút − / + đổi định lượng, bấm thẻ nguyên liệu để thêm
// (điền sẵn lượng gợi ý), bấm thùng rác để bỏ. Giá vốn mỗi ly và lãi gộp tính lại ngay.
// Dùng chung ở khung sửa món (Thực đơn) và trang Công thức.
import { useMemo, useState } from 'react';
import { formatVnd } from '@/lib/format';
import { GROUPS, recipeCost, stateOf, useInventory, type GroupId, type Ingredient, type Recipe } from '@/lib/inventory';
import { MinusIcon, PlusIcon, TrashIcon } from '@/components/ui/Icons';
import { StockBadge, btnLine, btnSolid, num } from './ui';

interface Row {
  ingredientId: string;
  amount: number;
}

/** Bước của nút − / +: gam, ml đổi 5; đơn vị đếm (cái, quả) đổi 1 */
const stepOf = (i?: Ingredient) => (i && (i.sub === 'g' || i.sub === 'ml') ? 5 : 1);
/** Lượng điền sẵn khi bấm thêm một nguyên liệu */
const startOf = (i: Ingredient) => (i.sub === 'g' || i.sub === 'ml' ? 20 : 1);
const round = (n: number) => Math.round(n * 100) / 100;
const stepBtn = 'grid h-8 w-8 shrink-0 place-items-center border border-roast/25 hover:border-roast hover:bg-roast hover:text-cream disabled:opacity-35';

export default function RecipeEditor({ productId, price, isFood, onSaved, onCancel }: { productId: string; price: number; isFood: boolean; onSaved: (msg: string) => void; onCancel?: () => void }) {
  const { ingredients, recipes, saveRecipe } = useInventory();
  const map = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const current = recipes.find((r) => r.productId === productId);
  const [rows, setRows] = useState<Row[]>(() => current?.lines.map((l) => ({ ...l })) ?? []);
  const [group, setGroup] = useState<GroupId>(isFood ? 'banh' : 'ca-phe');
  const [error, setError] = useState<string | null>(null);

  const lines = rows.filter((r) => r.amount > 0);
  const draft: Recipe = { productId, size: isFood ? '1 cái' : 'M', lines };
  const cost = recipeCost(draft, map);
  const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
  const dirty = JSON.stringify(lines) !== JSON.stringify(current?.lines ?? []);
  const setAmount = (id: string, amount: number) => setRows((rs) => rs.map((r) => (r.ingredientId === id ? { ...r, amount: Math.max(0, round(amount)) } : r)));
  const add = (i: Ingredient) => setRows((rs) => [...rs, { ingredientId: i.id, amount: startOf(i) }]);
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.ingredientId !== id));
  const choices = ingredients.filter((i) => i.group === group && !rows.some((r) => r.ingredientId === i.id));

  async function save() {
    if (!lines.length) return setError('Công thức cần ít nhất một nguyên liệu có định lượng.');
    if (!(await saveRecipe(draft))) return setError(useInventory.getState().error ?? 'Chưa lưu được công thức.');
    setError(null);
    onSaved(`Đã lưu công thức, giá vốn mới ${formatVnd(cost)}/${isFood ? 'cái' : 'ly'}`);
  }

  return (
    <div>
      <dl className="grid grid-cols-3 border border-roast/20">
        {[
          { k: `Giá vốn/${isFood ? 'cái' : 'ly'}`, v: formatVnd(cost) },
          { k: 'Giá bán', v: formatVnd(price) },
          { k: 'Lãi gộp', v: `${margin}%`, tone: margin < 60 ? 'text-amber-700' : 'text-leaf' },
        ].map((f, i) => (
          <div key={f.k} className={`px-3 py-2 ${i ? 'border-l border-roast/20' : ''}`}>
            <dt className="font-label text-[11px] uppercase tracking-wider text-roast/55">{f.k}</dt>
            <dd className={`font-semibold ${num} ${f.tone ?? ''}`}>{f.v}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <p className="mt-3 border border-dashed border-roast/30 px-3 py-4 text-center text-sm text-roast/60">Chưa có nguyên liệu.</p>
      ) : (
        <ul className="mt-3 divide-y divide-roast/10 border border-roast/20">
          {rows.map((r) => {
            const ing = map.get(r.ingredientId);
            if (!ing) return null;
            const step = stepOf(ing);
            const st = stateOf(ing);
            return (
              <li key={r.ingredientId} className={`flex items-center gap-2 px-3 py-1.5 text-sm ${r.amount === 0 ? 'opacity-50' : ''}`}>
                <span className="min-w-0 flex-1 truncate">
                  {ing.name}
                  {st !== 'ok' && (
                    <span className="ml-2 align-middle">
                      <StockBadge state={st} />
                    </span>
                  )}
                </span>
                <button type="button" onClick={() => setAmount(r.ingredientId, r.amount - step)} disabled={r.amount <= 0} aria-label={`Bớt ${ing.name}`} className={stepBtn}>
                  <MinusIcon className="h-3.5 w-3.5" />
                </button>
                <label className="relative">
                  <span className="sr-only">Định lượng {ing.name}</span>
                  <input
                    inputMode="decimal"
                    value={r.amount}
                    onChange={(e) => setAmount(r.ingredientId, Number(e.target.value.replace(',', '.')) || 0)}
                    onFocus={(e) => e.target.select()}
                    className={`h-8 w-20 border border-roast/25 bg-cream pr-8 text-right text-sm focus:border-roast focus:outline-none ${num}`}
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-roast/50">{ing.sub}</span>
                </label>
                <button type="button" onClick={() => setAmount(r.ingredientId, r.amount + step)} aria-label={`Thêm ${ing.name}`} className={stepBtn}>
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
                <span className={`w-20 shrink-0 text-right text-roast/65 ${num}`}>{formatVnd((r.amount / ing.per) * ing.cost)}</span>
                <button type="button" onClick={() => remove(r.ingredientId)} aria-label={`Bỏ ${ing.name}`} className="grid h-8 w-8 shrink-0 place-items-center text-roast/45 hover:text-chili">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 border border-roast/20 bg-foam p-3">
        <p className="font-label text-[11px] font-semibold uppercase tracking-wider text-roast/60">Bấm để thêm nguyên liệu</p>
        <div className="mt-2 flex flex-wrap gap-1" role="tablist" aria-label="Nhóm nguyên liệu">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={group === g.id}
              onClick={() => setGroup(g.id)}
              className={`h-7 px-2.5 text-xs font-semibold ${group === g.id ? 'bg-roast text-cream' : 'text-roast/65 hover:bg-roast/10'}`}
            >
              {g.name}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {choices.length === 0 ? (
            <span className="text-xs text-roast/55">Đã dùng hết nguyên liệu nhóm này.</span>
          ) : (
            choices.map((i) => (
              <button key={i.id} type="button" onClick={() => add(i)} className="inline-flex h-8 items-center gap-1 border border-roast/25 bg-cream px-2.5 text-xs hover:border-roast hover:bg-roast hover:text-cream">
                <PlusIcon className="h-3 w-3" />
                {i.name}
              </button>
            ))
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-chili">{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={save} disabled={!dirty} className={btnSolid}>
          Lưu công thức
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={btnLine}>
            {dirty ? 'Huỷ' : 'Đóng'}
          </button>
        )}
      </div>
    </div>
  );
}

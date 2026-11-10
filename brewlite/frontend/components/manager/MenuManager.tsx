'use client';

// THỰC ĐƠN (phần quản lý): bảng món gọn có chia trang, lọc theo trạng thái; thêm món mới.
// Cột "Còn pha được" tính từ công thức và tồn nguyên liệu (thay cho trang Công thức riêng trước đây).
// Khung sửa món có hai thẻ: Thông tin (tên, giá, ảnh, câu giới thiệu, nhãn, ẩn/hết hàng, kèm xem trước)
// và Công thức (định lượng nguyên liệu, giá vốn, lãi gộp).
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatVnd } from '@/lib/format';
import { cupsLeft, recipeCost, useInventory } from '@/lib/inventory';
import { CATEGORIES } from '@/lib/mock-data';
import { useAllProducts } from '@/lib/products';
import { matchText, type Range } from '@/lib/search';
import { useStorefront, type ProductEdit } from '@/lib/storefront';
import type { CategoryId, Product } from '@/lib/types';
import ProductImage from '@/components/menu/ProductImage';
import Highlight from '@/components/ui/Highlight';
import Toast from '@/components/ui/Toast';
import { SearchIcon } from '@/components/ui/Icons';
import RecipeEditor from './RecipeEditor';
import { FieldLabel, FilterTile, PageHead, Pager, Panel, DetailDialog, Toggle, btnInk, btnLine, btnSolid, input, num, searchInput, select, td, textarea, th, toolSelect, tr } from './ui';

type Item = Product & { hidden: boolean };
type Status = 'all' | 'selling' | 'soldout' | 'hidden';
const PAGE = 10;
const catName = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.name ?? id;
const statusOf = (p: Item): Exclude<Status, 'all'> => (p.hidden ? 'hidden' : p.stock <= 0 ? 'soldout' : 'selling');
const STATUS_BADGE: Record<Exclude<Status, 'all'>, { label: string; cls: string }> = {
  selling: { label: 'Đang bán', cls: 'bg-leaf/10 text-leaf' },
  soldout: { label: 'Hết hàng', cls: 'bg-amber-600/10 text-amber-700' },
  hidden: { label: 'Đang ẩn', cls: 'bg-roast/10 text-roast/60' },
};
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

export default function MenuManager() {
  const params = useSearchParams();
  const router = useRouter();
  const { data = [], isLoading } = useAllProducts();
  const { ingredients, recipes } = useInventory();
  const ingMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const { editProduct, editProducts } = useStorefront();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const [status, setStatus] = useState<Status>('all');
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(params.get('sua'));
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Mở từ ô tìm nhanh hoặc trang khác: ?sua=<id>
  useEffect(() => {
    const id = params.get('sua');
    if (id) setEditId(id);
  }, [params]);
  useEffect(() => setPage(0), [q, cat, status]);

  const list = useMemo(() => {
    const term = q.trim();
    const out: { p: Item; ranges: Range[]; score: number }[] = [];
    for (const p of data) {
      if (cat !== 'all' && p.category !== cat) continue;
      if (status !== 'all' && statusOf(p) !== status) continue;
      if (!term) {
        out.push({ p, ranges: [], score: 0 });
        continue;
      }
      const m = matchText(p.name, term);
      if (m) out.push({ p, ranges: m.ranges, score: m.score });
      else if (p.keywords.some((k) => matchText(k, term))) out.push({ p, ranges: [], score: 20 });
    }
    return out.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name, 'vi'));
  }, [data, q, cat, status]);
  const rows = list.slice(page * PAGE, page * PAGE + PAGE);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { all: data.length, selling: 0, soldout: 0, hidden: 0 };
    for (const p of data) c[statusOf(p)]++;
    return c;
  }, [data]);

  const editing = data.find((p) => p.id === editId) ?? null;
  const pageIds = rows.map((r) => r.p.id);
  const allPicked = pageIds.length > 0 && pageIds.every((id) => picked.has(id));

  function close() {
    setEditId(null);
    if (params.get('sua')) router.replace('/quan-ly/thuc-don');
  }

  function togglePick(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function bulk(patch: ProductEdit, verb: string) {
    const ids = [...picked];
    void editProducts(ids, patch, `${verb} ${ids.length} món`).then((ok) => {
      if (!ok) return;
      setToast(`Đã ${verb.toLowerCase()} ${ids.length} món`);
      setPicked(new Set());
    });
  }

  const bulkBtn = 'h-9 border border-roast/30 bg-cream px-3 text-xs font-semibold tracking-wider hover:border-roast';

  return (
    <>
      <PageHead
        title="Thực đơn"
        actions={
          <>
            <Link href="/menu" className={btnLine}>
              Xem thực đơn khách ↗
            </Link>
            <button type="button" onClick={() => setCreating(true)} className={btnSolid}>
              + Thêm món
            </button>
          </>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FilterTile label="Tất cả món" value={counts.all} active={status === 'all'} onClick={() => setStatus('all')} />
        <FilterTile label="Đang bán" value={counts.selling} active={status === 'selling'} onClick={() => setStatus('selling')} />
        <FilterTile label="Hết hàng" value={counts.soldout} tone={counts.soldout ? 'text-amber-700' : ''} active={status === 'soldout'} onClick={() => setStatus('soldout')} />
        <FilterTile label="Đang ẩn" value={counts.hidden} active={status === 'hidden'} onClick={() => setStatus('hidden')} />
      </div>

      <Panel
        className="mt-4"
        toolbar={
          picked.size > 0 ? (
            <>
              <span className="mr-auto text-sm font-semibold">Đã chọn {picked.size} món</span>
              <button type="button" onClick={() => bulk({ hidden: true }, 'Ẩn')} className={bulkBtn}>
                Ẩn khỏi web
              </button>
              <button type="button" onClick={() => bulk({ hidden: false }, 'Hiện lại')} className={bulkBtn}>
                Hiện lại
              </button>
              <button type="button" onClick={() => bulk({ soldOut: true }, 'Báo hết hàng')} className={bulkBtn}>
                Báo hết hàng
              </button>
              <button type="button" onClick={() => bulk({ soldOut: false }, 'Mở bán lại')} className={bulkBtn}>
                Mở bán lại
              </button>
              <button type="button" onClick={() => setPicked(new Set())} className="h-9 px-2 text-xs font-semibold tracking-wider text-roast/60 hover:text-roast">
                Bỏ chọn
              </button>
            </>
          ) : (
            <>
              <label className="relative min-w-[12rem] flex-1">
                <span className="sr-only">Tìm món</span>
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roast/45" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm món" className={searchInput} />
              </label>
              <select value={cat} onChange={(e) => setCat(e.target.value as CategoryId | 'all')} className={toolSelect} aria-label="Nhóm món">
                <option value="all">Tất cả nhóm</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )
        }
        footer={<Pager page={page} size={PAGE} total={list.length} onPage={setPage} />}
      >
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-roast/60">Đang tải thực đơn…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-roast/60">Không có món nào khớp bộ lọc.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr>
                  <th className={`${th} w-10 pr-0`}>
                    <input
                      type="checkbox"
                      checked={allPicked}
                      onChange={() => setPicked((s) => (allPicked ? new Set([...s].filter((id) => !pageIds.includes(id))) : new Set([...s, ...pageIds])))}
                      aria-label="Chọn cả trang"
                      className="h-4 w-4 accent-roast"
                    />
                  </th>
                  <th className={th}>Món</th>
                  <th className={`${th} text-right`}>Giá bán</th>
                  <th className={`${th} text-right`}>Giá vốn</th>
                  <th className={`${th} text-right`}>Còn pha được</th>
                  <th className={th}>Trạng thái</th>
                  <th className={`${th} text-center`}>Hiện trên web</th>
                  <th className={th}>
                    <span className="sr-only">Sửa</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, ranges }) => {
                  const st = statusOf(p);
                  const recipe = recipes.find((r) => r.productId === p.id);
                  const cost = recipe ? recipeCost(recipe, ingMap) : null;
                  const margin = cost !== null && p.price ? Math.round(((p.price - cost) / p.price) * 100) : null;
                  const cups = recipe ? cupsLeft(recipe, ingMap).cups : null;
                  return (
                    <tr key={p.id} onClick={() => setEditId(p.id)} className={`${tr} cursor-pointer ${picked.has(p.id) ? 'bg-roast/[0.05]' : ''}`}>
                      <td className={`${td} pr-0`} onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={picked.has(p.id)} onChange={() => togglePick(p.id)} aria-label={`Chọn ${p.name}`} className="h-4 w-4 accent-roast" />
                      </td>
                      <td className={td}>
                        <span className="flex items-center gap-3">
                          <span className={`h-11 w-11 shrink-0 overflow-hidden border border-roast/20 bg-cream ${p.hidden ? 'opacity-50' : ''}`}>
                            <ProductImage product={p} width={120} className="h-full w-full object-cover" />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-semibold">
                                <Highlight text={p.name} ranges={ranges} />
                              </span>
                              {p.tag === 'hot' && <span className="shrink-0 font-label text-[10px] font-semibold uppercase tracking-wider text-gold">Bán chạy</span>}
                              {p.tag === 'new' && <span className="shrink-0 font-label text-[10px] font-semibold uppercase tracking-wider text-leaf">Món mới</span>}
                            </span>
                            <span className="block truncate text-xs text-roast/55">{catName(p.category)}</span>
                          </span>
                        </span>
                      </td>
                      <td className={`${td} text-right font-semibold ${num}`}>{formatVnd(p.price)}</td>
                      <td className={`${td} text-right ${num}`}>
                        {cost === null ? (
                          <span className="text-xs text-roast/45">Chưa có công thức</span>
                        ) : (
                          <>
                            <span className="text-roast/75">{formatVnd(cost)}</span>
                            <span className={`block text-xs ${margin !== null && margin < 60 ? 'text-amber-700' : 'text-roast/50'}`}>lãi {margin}%</span>
                          </>
                        )}
                      </td>
                      <td className={`${td} text-right ${num} ${cups === 0 ? 'font-semibold text-chili' : cups !== null && cups < 30 ? 'text-amber-700' : 'text-roast/75'}`}>
                        {cups === null ? '—' : cups === 0 ? 'Hết' : `${cups.toLocaleString('vi-VN')} ${p.kind === 'food' ? 'cái' : 'ly'}`}
                      </td>
                      <td className={td}>
                        <span className={`inline-block whitespace-nowrap px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[st].cls}`}>{STATUS_BADGE[st].label}</span>
                      </td>
                      <td className={`${td} text-center`} onClick={(e) => e.stopPropagation()}>
                        <Toggle size="sm" on={!p.hidden} label={`${p.name} hiện trên web`} onChange={(v) => editProduct(p.id, { hidden: !v }, `${v ? 'Hiện lại' : 'Ẩn'} món ${p.name}`)} />
                      </td>
                      <td className={`${td} w-16 text-right`}>
                        <span className="font-label text-xs font-semibold uppercase tracking-wider text-roast/60">Sửa</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {editing && <ProductEditor key={editing.id} product={editing} onClose={close} onSaved={setToast} />}
      {creating && (
        <NewProduct
          onClose={() => setCreating(false)}
          onCreated={(id, name) => {
            setCreating(false);
            setEditId(id);
            setToast(`Đã thêm ${name}. Thêm công thức để quầy biết định lượng.`);
          }}
        />
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

/** Khung sửa món: thẻ Thông tin và thẻ Công thức */
function ProductEditor({ product, onClose, onSaved }: { product: Item; onClose: () => void; onSaved: (m: string) => void }) {
  const params = useSearchParams();
  const [tab, setTab] = useState<'info' | 'recipe'>(params.get('the') === 'cong-thuc' ? 'recipe' : 'info');

  return (
    <DetailDialog open wide title={product.name} onClose={onClose}>
      <div role="tablist" className="-mt-1 mb-5 flex gap-1 border-b border-roast/20">
        {[
          { id: 'info' as const, label: 'Thông tin' },
          { id: 'recipe' as const, label: 'Công thức' },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-xs font-semibold tracking-wider ${tab === t.id ? 'border-gold text-roast' : 'border-transparent text-roast/55 hover:text-roast'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'info' ? (
        <InfoForm
          product={product}
          onCancel={onClose}
          onSaved={(m) => {
            onSaved(m);
            onClose();
          }}
        />
      ) : (
        <RecipeEditor productId={product.id} price={product.price} isFood={product.kind === 'food'} onSaved={onSaved} />
      )}
    </DetailDialog>
  );
}

function InfoForm({ product, onCancel, onSaved }: { product: Item; onCancel: () => void; onSaved: (m: string) => void }) {
  const { data = [] } = useAllProducts();
  const editProduct = useStorefront((s) => s.editProduct);
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    name: product.name,
    tagline: product.tagline ?? '',
    description: product.description,
    price: String(product.price),
    category: product.category,
    tag: product.tag,
    imageUrl: product.imageUrl,
    keywords: product.keywords.join(', '),
    hidden: product.hidden,
    soldOut: product.stock <= 0,
  });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const price = Number(f.price.replace(/\D/g, ''));
  const preview: Item = { ...product, name: f.name || 'Tên món', tagline: f.tagline, price, tag: f.tag, imageUrl: f.imageUrl, stock: f.soldOut ? 0 : Math.max(product.stock, 1), hidden: f.hidden };
  const gallery = useMemo(() => [...new Set(data.map((p) => p.imageUrl))].filter((u) => u !== f.imageUrl).slice(0, 12), [data, f.imageUrl]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Chọn tệp ảnh (JPG, PNG, WEBP).');
    if (file.size > 1024 * 1024) return setError('Ảnh tối đa 1 MB.');
    const reader = new FileReader();
    reader.onload = () => set('imageUrl', String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    if (f.name.trim().length < 2) return setError('Tên món cần ít nhất 2 ký tự.');
    if (!price || price < 1000) return setError('Giá bán chưa hợp lệ.');
    if (!f.imageUrl.trim()) return setError('Món cần có ảnh.');
    const ok = await editProduct(
      product.id,
      {
        name: f.name.trim(),
        tagline: f.tagline.trim(),
        description: f.description.trim(),
        price,
        category: f.category,
        tag: f.tag,
        imageUrl: f.imageUrl.trim(),
        keywords: f.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        hidden: f.hidden,
        soldOut: f.soldOut,
      },
      `Sửa món ${f.name.trim()}`,
    );
    if (!ok) return setError(useStorefront.getState().error ?? 'Chưa lưu được.');
    onSaved(`Đã lưu ${f.name.trim()}. Khách thấy ngay trên web.`);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_14rem]">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <FieldLabel label="Tên món">
            <input value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={60} className={input} />
          </FieldLabel>
          <FieldLabel label="Giá bán (size nhỏ)">
            <input value={f.price} onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`${input} text-right ${num}`} />
          </FieldLabel>
        </div>
        <FieldLabel label={`Câu giới thiệu · ${f.tagline.length}/80`}>
          <input value={f.tagline} onChange={(e) => set('tagline', e.target.value)} maxLength={80} placeholder="Một câu ngắn hiện dưới tên món" className={input} />
        </FieldLabel>
        <FieldLabel label={`Mô tả · ${f.description.length}/240`}>
          <textarea value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={240} rows={3} className={textarea} />
        </FieldLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Nhóm">
            <select value={f.category} onChange={(e) => set('category', e.target.value as CategoryId)} className={`${select} w-full`}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Nhãn trên thẻ món">
            <select value={f.tag ?? ''} onChange={(e) => set('tag', (e.target.value || null) as Product['tag'])} className={`${select} w-full`}>
              <option value="">Không có</option>
              <option value="hot">Bán chạy</option>
              <option value="new">Món mới</option>
            </select>
          </FieldLabel>
        </div>

        <div>
          <p className="font-label text-xs uppercase tracking-wider text-roast/70">Ảnh món</p>
          <div className="mt-1 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {gallery.map((u) => (
              <button key={u} type="button" onClick={() => set('imageUrl', u)} className="aspect-square overflow-hidden border border-roast/20 hover:border-roast" aria-label="Dùng ảnh này">
                <ProductImage product={{ ...product, imageUrl: u }} width={120} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={f.imageUrl.startsWith('data:') ? 'Ảnh tải lên từ máy' : f.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="Hoặc dán đường dẫn ảnh"
              className={`${input} text-xs`}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className={`${btnInk} shrink-0`}>
              Tải ảnh lên
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
          </div>
        </div>

        <FieldLabel label="Từ khoá tìm kiếm" hint="Cách nhau bằng dấu phẩy, ví dụ: cf, cafe, phin.">
          <input value={f.keywords} onChange={(e) => set('keywords', e.target.value)} className={input} />
        </FieldLabel>

        <div className="divide-y divide-roast/10 border border-roast/20">
          <label className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span>
              <span className="block text-sm font-semibold">Hiện trên web</span>
              <span className="block text-xs text-roast/55">Tắt để ẩn món khỏi thực đơn và tìm kiếm.</span>
            </span>
            <Toggle on={!f.hidden} label="Hiện trên web" onChange={(v) => set('hidden', !v)} />
          </label>
          <label className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span>
              <span className="block text-sm font-semibold">Còn hàng</span>
              <span className="block text-xs text-roast/55">Tắt khi hết: món vẫn hiện nhưng khách không đặt được.</span>
            </span>
            <Toggle on={!f.soldOut} label="Còn hàng" onChange={(v) => set('soldOut', !v)} />
          </label>
        </div>

        {error && <p className="text-sm text-chili">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={save} className={btnSolid}>
            Lưu thay đổi
          </button>
          <button type="button" onClick={onCancel} className={btnLine}>
            Huỷ
          </button>
        </div>
      </div>

      <div className="md:sticky md:top-0 md:self-start">
        <p className="font-label text-xs uppercase tracking-wider text-roast/60">Xem trước</p>
        <div className={`mt-2 border border-roast/20 bg-cream p-3 ${f.hidden ? 'opacity-50' : ''}`}>
          <PreviewCard p={preview} />
        </div>
        {f.hidden && <p className="mt-2 text-xs font-semibold text-chili">Món đang ẩn, khách không thấy.</p>}
      </div>
    </div>
  );
}

/** Bản sao tĩnh của thẻ món phía khách */
function PreviewCard({ p }: { p: Item }) {
  const soldOut = p.stock <= 0;
  return (
    <article className="flex flex-col border-t-2 border-roast pt-2">
      <span className={`font-label text-[11px] uppercase tracking-wider ${p.tag === 'hot' ? 'text-gold' : 'text-leaf'}`}>{p.tag === 'hot' ? 'Bán chạy' : p.tag === 'new' ? 'Món mới' : ' '}</span>
      <div className="relative mt-2 aspect-square overflow-hidden border border-roast bg-cream p-1.5">
        <ProductImage key={p.imageUrl} product={p} className="menu-print h-full w-full" />
        {soldOut && (
          <span className="absolute inset-0 grid place-items-center bg-cream/70">
            <span className="stamp text-base text-gold">Hết hàng</span>
          </span>
        )}
      </div>
      <h3 className="mt-2 text-lg font-bold leading-tight">{p.name}</h3>
      {p.tagline && <p className="mt-0.5 font-serif text-sm italic leading-snug text-roast/70">{p.tagline}</p>}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-dotted border-roast/60 pt-2">
        <span className="font-semibold">{formatVnd(p.price)}</span>
        <span className={`inline-flex h-8 items-center border-2 px-2 font-label text-xs font-semibold uppercase ${soldOut ? 'border-roast/30 text-roast/40' : 'border-roast'}`}>+ Thêm</span>
      </div>
    </article>
  );
}

/** Thêm món mới: điền phần chính, lưu xong mở khung sửa để thêm ảnh và công thức */
function NewProduct({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string, name: string) => void }) {
  const { data = [] } = useAllProducts();
  const createProduct = useStorefront((s) => s.createProduct);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<CategoryId>('truyen-thong');
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const n = name.trim();
    const pr = Number(price);
    if (n.length < 2) return setError('Nhập tên món.');
    if (!pr || pr < 1000) return setError('Giá bán chưa hợp lệ.');
    if (data.some((p) => fold(p.name) === fold(n))) return setError('Đã có món trùng tên.');
    setBusy(true);
    const id = await createProduct({ name: n, price: pr, category });
    setBusy(false);
    if (!id) return setError(useStorefront.getState().error ?? 'Chưa thêm được món.');
    onCreated(id, n);
  }

  return (
    <DetailDialog open title="Thêm món mới" onClose={onClose}>
      <div className="space-y-4">
        <FieldLabel label="Tên món">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ví dụ: Cà phê kem trứng" className={input} autoFocus />
        </FieldLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Giá bán (size nhỏ)">
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="35000" className={`${input} text-right ${num}`} />
          </FieldLabel>
          <FieldLabel label="Nhóm">
            <select value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} className={`${select} w-full`}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FieldLabel>
        </div>
        <p className="text-sm text-roast/60">Sau khi thêm, bạn chọn ảnh, viết câu giới thiệu và nhập công thức trong khung sửa món.</p>
        {error && <p className="text-sm text-chili">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={create} disabled={busy} className={btnSolid}>
            Thêm món
          </button>
          <button type="button" onClick={onClose} className={btnLine}>
            Huỷ
          </button>
        </div>
      </div>
    </DetailDialog>
  );
}

'use client';

// Ô tìm kiếm món và quán. Gõ 1–2 chữ cái là có gợi ý (không dấu, chữ cái đầu, tên gọi khác).
// Bàn phím: mũi tên lên/xuống để chọn, Enter để mở, Esc để đóng.
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/context/app-store';
import { CATEGORIES, STORES } from '@/lib/mock-data';
import { useProducts } from '@/lib/products';
import { formatVnd } from '@/lib/format';
import { searchProducts, searchStores, type ProductHit, type StoreHit } from '@/lib/search';
import ProductImage from '@/components/menu/ProductImage';
import Highlight from '@/components/ui/Highlight';
import { PinIcon, SearchIcon } from '@/components/ui/Icons';

type Option = { kind: 'product'; hit: ProductHit } | { kind: 'store'; hit: StoreHit } | { kind: 'all' };

export default function SearchBox() {
  const router = useRouter();
  const { setStoreId, storeId } = useAppStore();
  const baseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const { data: products = [] } = useProducts();
  const q = query.trim();
  const productHits = useMemo<ProductHit[]>(
    () =>
      q
        ? searchProducts(products, q).slice(0, 6)
        : products.filter((p) => p.tag === 'hot').map((product) => ({ product, match: { score: 0, ranges: [] } })),
    [q, products],
  );
  const storeHits = useMemo(() => (q ? searchStores(STORES, q).slice(0, 2) : []), [q]);

  const options: Option[] = [
    ...productHits.map((hit) => ({ kind: 'product' as const, hit })),
    ...storeHits.map((hit) => ({ kind: 'store' as const, hit })),
    ...(q ? [{ kind: 'all' as const }] : []),
  ];
  const noResult = q && !productHits.length && !storeHits.length;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function select(opt: Option) {
    if (opt.kind === 'product') router.push(`/product/${opt.hit.product.id}`);
    if (opt.kind === 'store') setStoreId(opt.hit.store.id);
    if (opt.kind === 'all') router.push(`/menu?q=${encodeURIComponent(q)}`);
    setQuery('');
    close();
    inputRef.current?.blur();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && options[active]) select(options[active]);
      else if (q) select({ kind: 'all' });
    } else if (e.key === 'Escape') {
      close();
    }
  }

  return (
    <div className="relative">
      <label htmlFor={`${baseId}-input`} className="sr-only">
        Tìm món hoặc quán
      </label>
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-roast/50" />
      <input
        ref={inputRef}
        id={`${baseId}-input`}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${baseId}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        enterKeyHint="search"
        value={query}
        placeholder="Tìm món, quán… thử gõ bx hoặc cpsd"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onKeyDown={onKeyDown}
        className="h-11 w-full rounded-full border-2 border-roast/10 bg-foam pl-11 pr-4 text-[15px] placeholder:text-roast/45 focus:border-espresso focus:outline-none"
      />

      {open && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 animate-pop-in overflow-hidden rounded-2xl border border-roast/10 bg-foam shadow-xl">
          <p className="px-4 pt-3 text-xs font-semibold text-roast/55">{q ? 'Gợi ý cho bạn' : 'Món bán chạy'}</p>
          {noResult && (
            <p className="px-4 pt-2 text-sm leading-relaxed">
              Không có món hoặc quán nào khớp “{q}”. Thử gõ chữ cái đầu mỗi từ, ví dụ <b>bx</b> cho Bạc xỉu, <b>cpm</b> cho Cà phê muối.
            </p>
          )}
          <ul id={`${baseId}-list`} role="listbox" aria-label="Gợi ý tìm kiếm" className="max-h-[60vh] overflow-y-auto py-1.5">
            {options.map((opt, i) => (
              <li
                key={opt.kind === 'product' ? opt.hit.product.id : opt.kind === 'store' ? opt.hit.store.id : 'all'}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => select(opt)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${i === active ? 'bg-cream' : ''}`}
              >
                {opt.kind === 'product' && (
                  <>
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-cream">
                      <ProductImage product={opt.hit.product} width={120} className="h-full w-full" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        <Highlight text={opt.hit.product.name} ranges={opt.hit.match.ranges} />
                      </span>
                      <span className="block truncate text-xs text-roast/55">{CATEGORIES.find((c) => c.id === opt.hit.product.category)?.name}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-espresso">{formatVnd(opt.hit.product.price)}</span>
                  </>
                )}
                {opt.kind === 'store' && (
                  <>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-espresso text-foam">
                      <PinIcon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        BrewLite <Highlight text={opt.hit.store.shortName} ranges={opt.hit.match.ranges} />
                      </span>
                      <span className="block truncate text-xs text-roast/55">{opt.hit.store.address}</span>
                    </span>
                    <span className="text-xs font-semibold text-espresso">{opt.hit.store.id === storeId ? 'Đang chọn' : 'Chọn quán'}</span>
                  </>
                )}
                {opt.kind === 'all' && (
                  <>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-roast/10">
                      <SearchIcon />
                    </span>
                    <span className="text-sm">
                      Xem tất cả kết quả cho <b>“{q}”</b>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

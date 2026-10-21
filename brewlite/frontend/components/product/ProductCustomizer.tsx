'use client';

// Bộ chọn tuỳ chọn món: size, đường, đá, topping, ghi chú, số lượng.
// Dùng chung cho trang chi tiết món và tấm "Thêm vào giỏ" bật lên khi bấm nút +.
import { useState, type ReactNode } from 'react';
import { MAX_QTY, useAppStore } from '@/context/app-store';
import { CATEGORIES, SIZES } from '@/lib/mock-data';
import { formatNumber, formatVnd } from '@/lib/format';
import { unitPriceOf } from '@/lib/pricing';
import type { CartItem, Level, NewCartItem, Product, SizeId } from '@/lib/types';
import QuantityStepper from '@/components/ui/QuantityStepper';
import { HeartIcon, StarIcon } from '@/components/ui/Icons';
import LevelPicker, { ICE_HINT, SUGAR_HINT } from './LevelPicker';
import SizePicker from './SizePicker';

const NOTE_MAX = 120;

interface Props {
  product: Product;
  /** Có khi đang sửa một dòng trong giỏ */
  initial?: CartItem;
  variant: 'page' | 'sheet';
  submitLabel: string;
  titleId?: string;
  onSubmit: (item: NewCartItem) => void;
}

function OptionGroup({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2.5 flex items-baseline justify-between gap-4">
        <h3 className="font-bold">{title}</h3>
        {aside && <span className="text-sm text-roast/60">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export default function ProductCustomizer({ product, initial, variant, submitLabel, titleId, onSubmit }: Props) {
  const { favorites, toggleFavorite } = useAppStore();
  const isDrink = product.kind === 'drink';
  const [size, setSize] = useState<SizeId>(initial?.size ?? 'M');
  const [sugar, setSugar] = useState<Level>(initial?.sugar ?? 100);
  const [ice, setIce] = useState<Level>(initial?.ice ?? 100);
  const [toppingIds, setToppingIds] = useState<string[]>(initial?.toppingIds ?? []);
  const [note, setNote] = useState(initial?.note ?? '');
  const [quantity, setQuantity] = useState(Math.min(initial?.quantity ?? 1, Math.max(1, product.stock)));

  const toppings = product.toppings;
  const maxQty = Math.max(1, Math.min(MAX_QTY, product.stock));
  const soldOut = product.stock <= 0;
  const unitPrice = unitPriceOf(product, isDrink ? size : null, toppingIds);
  const total = unitPrice * quantity;
  const category = CATEGORIES.find((c) => c.id === product.category);
  const favorite = favorites.includes(product.id);

  function submit() {
    if (soldOut) return;
    onSubmit({
      productId: product.id,
      name: product.name,
      size: isDrink ? size : null,
      sugar: isDrink ? sugar : null,
      ice: isDrink && product.hasIce ? ice : null,
      toppingIds,
      note: note.trim(),
      quantity,
      unitPrice,
    });
  }

  return (
    <div>
      <p className="text-sm font-medium text-roast/55">{category?.name}</p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <h2 id={titleId} className={`font-extrabold leading-tight tracking-tight ${variant === 'page' ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>
          {product.name}
        </h2>
        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-pressed={favorite}
          aria-label={favorite ? `Bỏ ${product.name} khỏi yêu thích` : `Thêm ${product.name} vào yêu thích`}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition-colors ${favorite ? 'border-chili bg-chili/10 text-chili' : 'border-roast/10 text-roast/50 hover:text-chili'}`}
        >
          <HeartIcon filled={favorite} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-xl font-bold tabular-nums text-espresso">{formatVnd(product.price)}</span>
        <span className="inline-flex items-center gap-1 text-roast/70">
          <StarIcon className="h-4 w-4 text-gold" /> {product.rating.toFixed(1).replace('.', ',')}
          <span className="text-roast/50">({formatNumber(product.sold)} đã bán)</span>
        </span>
        {soldOut ? (
          <span className="rounded-full bg-chili/10 px-2.5 py-0.5 text-xs font-bold text-chili">Hết hàng</span>
        ) : product.stock <= 10 ? (
          <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-bold text-gold-deep">Chỉ còn {product.stock} phần</span>
        ) : null}
      </div>
      <p className="mt-3 max-w-prose leading-relaxed text-roast/75">{product.description}</p>

      {isDrink && (
        <>
          <OptionGroup title="Chọn size" aside={SIZES.find((s) => s.id === size)?.label}>
            <SizePicker value={size} onChange={setSize} />
          </OptionGroup>
          <OptionGroup title="Mức đường" aside={SUGAR_HINT[sugar]}>
            <LevelPicker label="Mức đường" value={sugar} onChange={setSugar} />
          </OptionGroup>
          {product.hasIce ? (
            <OptionGroup title="Mức đá" aside={ICE_HINT[ice]}>
              <LevelPicker label="Mức đá" value={ice} onChange={setIce} />
            </OptionGroup>
          ) : (
            <p className="mt-5 rounded-xl bg-cream px-4 py-3 text-sm text-roast/70">Món phục vụ nóng nên không có tuỳ chọn đá.</p>
          )}
        </>
      )}

      {toppings.length > 0 && (
        <OptionGroup title="Topping đi kèm" aside="Không bắt buộc">
          <ul className="divide-y divide-roast/10 overflow-hidden rounded-2xl border-2 border-roast/10 bg-foam">
            {toppings.map((t) => {
              const checked = toppingIds.includes(t.id);
              return (
                <li key={t.id}>
                  <label className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${checked ? 'bg-cream' : 'hover:bg-cream/60'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setToppingIds((ids) => (ids.includes(t.id) ? ids.filter((x) => x !== t.id) : [...ids, t.id]))}
                      className="h-5 w-5 rounded accent-espresso"
                    />
                    <span className="flex-1">{t.name}</span>
                    <span className="text-sm font-semibold tabular-nums text-espresso">+{formatVnd(t.price)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </OptionGroup>
      )}

      <OptionGroup title="Ghi chú cho barista" aside={`${note.length}/${NOTE_MAX}`}>
        <label htmlFor={`note-${product.id}-${variant}`} className="sr-only">
          Ghi chú cho barista
        </label>
        <textarea
          id={`note-${product.id}-${variant}`}
          value={note}
          maxLength={NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Ví dụ: ít sữa, không lấy ống hút"
          className="w-full resize-none rounded-2xl border-2 border-roast/10 bg-foam px-4 py-3 placeholder:text-roast/40 focus:border-espresso focus:outline-none"
        />
      </OptionGroup>

      {/* Thanh hành động: trong tấm bật lên thì dính đáy; ở trang chi tiết thì cố định đáy trên mobile */}
      <div
        className={
          variant === 'sheet'
            ? 'sticky bottom-0 -mx-6 -mb-6 mt-6 border-t border-roast/10 bg-foam/95 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur'
            : 'fixed inset-x-0 bottom-0 z-20 border-t border-roast/10 bg-foam/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:mt-8 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none'
        }
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <QuantityStepper value={quantity} onChange={setQuantity} max={maxQty} label={product.name} />
          <button
            type="button"
            onClick={submit}
            disabled={soldOut}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gold px-5 font-bold text-roast shadow-[0_10px_24px_-10px_rgba(168,101,15,.8)] transition-[background-color,color,transform] enabled:hover:bg-gold-deep enabled:hover:text-foam enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-roast/15 disabled:text-roast/45 disabled:shadow-none"
          >
            {soldOut ? 'Tạm hết hàng' : submitLabel}
            {!soldOut && <span className="tabular-nums">{formatVnd(total)}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

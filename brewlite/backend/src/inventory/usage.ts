/**
 * Tính nguyên liệu theo công thức (hàm thuần, dễ test). Công thức ghi cho 1 ly size M hoặc 1 cái bánh.
 * Size S, L quy đổi theo tỉ lệ cho nguyên liệu cân đong (g, ml); đồ đếm (ly, nắp, ống hút, trứng) không đổi.
 */
export const SIZE_FACTOR: Record<string, number> = { S: 0.8, M: 1, L: 1.25 };

export interface IngredientLike {
  id: string;
  name: string;
  /** 1 đơn vị nhập kho = per đơn vị công thức (1 kg = 1000 g) */
  per: number;
  stock: number;
}
export interface RecipeLineLike {
  ingredientId: string;
  amount: number;
}
export interface UsageItem {
  productId: string;
  size: string | null;
  qty: number;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Lượng mỗi nguyên liệu (theo đơn vị nhập kho) cần để pha các dòng đơn. Món chưa có công thức thì bỏ qua. */
export function ingredientNeeds(items: UsageItem[], recipes: Map<string, RecipeLineLike[]>, ingredients: Map<string, IngredientLike>): Map<string, number> {
  const need = new Map<string, number>();
  for (const it of items) {
    for (const line of recipes.get(it.productId) ?? []) {
      const ing = ingredients.get(line.ingredientId);
      if (!ing || line.amount <= 0) continue;
      const factor = ing.per === 1 ? 1 : (SIZE_FACTOR[it.size ?? 'M'] ?? 1);
      need.set(ing.id, round((need.get(ing.id) ?? 0) + (line.amount * factor * it.qty) / ing.per));
    }
  }
  return need;
}

/** Nguyên liệu đầu tiên không đủ cho nhu cầu, hoặc null nếu đủ hết */
export function firstShortage(need: Map<string, number>, ingredients: Map<string, IngredientLike>): IngredientLike | null {
  for (const [id, qty] of need) {
    const ing = ingredients.get(id);
    if (ing && ing.stock + 1e-9 < qty) return ing;
  }
  return null;
}

/** Số ly size M (hoặc số cái bánh) còn pha được từ tồn nguyên liệu; null nếu món chưa có công thức */
export function cupsLeft(lines: RecipeLineLike[] | undefined, ingredients: Map<string, IngredientLike>): number | null {
  if (!lines?.length) return null;
  let cups = Infinity;
  for (const l of lines) {
    const ing = ingredients.get(l.ingredientId);
    if (!ing || l.amount <= 0) continue;
    cups = Math.min(cups, Math.floor((ing.stock * ing.per) / l.amount + 1e-9));
  }
  return cups === Infinity ? null : Math.max(0, cups);
}

import { cupsLeft, firstShortage, ingredientNeeds } from './usage';

const ings = new Map([
  ['robusta', { id: 'robusta', name: 'Hạt robusta', per: 1000, stock: 1 }], // 1 kg
  ['ly', { id: 'ly', name: 'Ly nhựa', per: 1, stock: 3 }],
]);
const recipes = new Map([['cpsd', [{ ingredientId: 'robusta', amount: 25 }, { ingredientId: 'ly', amount: 1 }]]]);

describe('Nguyên liệu theo công thức', () => {
  it('size S, L quy đổi theo tỉ lệ; đồ đếm (ly) không đổi', () => {
    const need = ingredientNeeds(
      [
        { productId: 'cpsd', size: 'S', qty: 2 }, // 2 × 20g
        { productId: 'cpsd', size: 'L', qty: 1 }, // 1 × 31,25g
      ],
      recipes,
      ings,
    );
    expect(need.get('robusta')).toBeCloseTo(0.071, 3); // 71,25 g = 0,071 kg (làm tròn 3 số)
    expect(need.get('ly')).toBe(3);
  });

  it('món chưa có công thức thì không trừ gì', () => {
    expect(ingredientNeeds([{ productId: 'khong-co', size: 'M', qty: 5 }], recipes, ings).size).toBe(0);
  });

  it('báo nguyên liệu thiếu đầu tiên', () => {
    const need = ingredientNeeds([{ productId: 'cpsd', size: 'M', qty: 4 }], recipes, ings);
    expect(firstShortage(need, ings)?.name).toBe('Ly nhựa');
    expect(firstShortage(ingredientNeeds([{ productId: 'cpsd', size: 'M', qty: 3 }], recipes, ings), ings)).toBeNull();
  });

  it('số ly còn pha được lấy theo nguyên liệu hết trước', () => {
    expect(cupsLeft(recipes.get('cpsd'), ings)).toBe(3); // robusta đủ 40 ly, ly nhựa chỉ còn 3
    expect(cupsLeft(undefined, ings)).toBeNull();
  });
});

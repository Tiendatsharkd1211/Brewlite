// Tìm kiếm "thông minh" chạy ngay trên trình duyệt, không cần backend.
// Nhận diện được khi người dùng gõ 1–2 chữ cái:
//   - không dấu:          "bac xiu", "ca phe"        -> Bạc xỉu, Cà phê ...
//   - đầu từ:             "xi", "mu"                 -> Bạc xỉu, Cà phê muối
//   - chữ cái đầu mỗi từ: "bx", "cpsd", "cpm"        -> Bạc xỉu, Cà phê sữa đá, Cà phê muối
//   - nhiều từ rút gọn:   "ca sua", "tra cam"        -> Cà phê sữa đá, Trà đào cam sả
//   - tên gọi khác:       "cf", "cafe", "coffee"     -> Cà phê ...
import { CATEGORIES } from './mock-data';
import type { Product } from './types';

export type Range = [number, number];
export interface Match {
  score: number;
  /** Vị trí cần tô sáng trong chuỗi gốc */
  ranges: Range[];
}

const ALIASES: Record<string, string> = {
  cf: 'ca phe',
  cafe: 'ca phe',
  caphe: 'ca phe',
  coffee: 'ca phe',
  tea: 'tra',
  ts: 'tra sua',
};

/**
 * Bỏ dấu tiếng Việt và viết thường, GIỮ NGUYÊN độ dài chuỗi
 * để vị trí khớp trên chuỗi đã bỏ dấu dùng được cho chuỗi gốc.
 */
export function fold(text: string): string {
  let out = '';
  for (const ch of text.normalize('NFC')) {
    if (ch === 'đ' || ch === 'Đ') {
      out += 'd';
      continue;
    }
    const base = ch.normalize('NFD').charAt(0).toLowerCase();
    out += base || ch;
  }
  return out;
}

function normalizeQuery(raw: string): string {
  return fold(raw)
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((t) => ALIASES[t] ?? t)
    .join(' ');
}

interface Word {
  start: number;
  text: string;
}

function wordsOf(folded: string): Word[] {
  const words: Word[] = [];
  const re = /[a-z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(folded))) words.push({ start: m.index, text: m[0] });
  return words;
}

export function matchText(text: string, rawQuery: string): Match | null {
  const q = normalizeQuery(rawQuery);
  if (!q) return null;
  const t = fold(text);
  const words = wordsOf(t);
  const tokens = q.split(' ');
  const compact = tokens.join('');

  // 1. Tên bắt đầu bằng đúng cụm đã gõ: "bac x" -> "Bạc xỉu"
  if (t.startsWith(q)) return { score: 100, ranges: [[0, q.length]] };

  // 2. Một từ trong tên bắt đầu bằng cụm đã gõ: "xi" -> "Bạc xỉu"
  const wi = words.findIndex((w) => t.startsWith(q, w.start));
  if (wi >= 0) {
    const s = words[wi].start;
    return { score: 85 - wi, ranges: [[s, s + q.length]] };
  }

  // 3. Chữ cái đầu mỗi từ: "bx" -> Bạc xỉu, "cpsd" -> Cà phê sữa đá
  if (tokens.length === 1 && compact.length >= 2) {
    const initials = words.map((w) => w.text[0]).join('');
    const ii = initials.indexOf(compact);
    if (ii >= 0) {
      return {
        score: ii === 0 ? 75 : 60,
        ranges: words.slice(ii, ii + compact.length).map((w) => [w.start, w.start + 1] as Range),
      };
    }
  }

  // 4. Nhiều từ, mỗi từ là phần đầu của một từ trong tên, đúng thứ tự: "ca sua" -> Cà phê sữa đá
  if (tokens.length > 1) {
    const ranges: Range[] = [];
    let from = 0;
    for (const tok of tokens) {
      const idx = words.findIndex((w, i) => i >= from && w.text.startsWith(tok));
      if (idx < 0) break;
      ranges.push([words[idx].start, words[idx].start + tok.length]);
      from = idx + 1;
    }
    if (ranges.length === tokens.length) return { score: 70, ranges };
  }

  // 5. Chuỗi con bất kỳ (từ 2 ký tự, để 1 chữ cái không ra quá nhiều kết quả nhiễu)
  if (q.length >= 2) {
    const si = t.indexOf(q);
    if (si >= 0) return { score: 45, ranges: [[si, si + q.length]] };
  }
  return null;
}

export interface ProductHit {
  product: Product;
  match: Match;
}

export function searchProducts(products: Product[], query: string): ProductHit[] {
  const q = normalizeQuery(query);
  if (!q) return [];
  const hits: ProductHit[] = [];
  for (const product of products) {
    const byName = matchText(product.name, query);
    if (byName) {
      hits.push({ product, match: byName });
      continue;
    }
    // Không khớp tên thì thử từ khoá phụ, tên danh mục, rồi mô tả (điểm thấp hơn, không tô sáng).
    // Chỉ làm khi đã gõ từ 2 ký tự, để 1 chữ cái không kéo theo kết quả nhiễu.
    if (q.length < 2) continue;
    const byKeyword = product.keywords.some((k) => matchText(k, query));
    const category = CATEGORIES.find((c) => c.id === product.category);
    const byCategory = category ? matchText(category.name, query) : null;
    const byDescription = q.length >= 3 && fold(product.description).includes(q);
    const score = byKeyword ? 35 : byCategory ? 25 : byDescription ? 10 : 0;
    if (score) hits.push({ product, match: { score, ranges: [] } });
  }
  return hits.sort((a, b) => b.match.score - a.match.score || a.product.name.localeCompare(b.product.name, 'vi'));
}

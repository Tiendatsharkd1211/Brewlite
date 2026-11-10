// Dữ liệu mẫu kho nguyên liệu: nguyên liệu, công thức cho cả 27 món, phiếu nhập, lịch sử nhập / xuất
// (nạp bằng src/seed.ts; chỉ nạp khi bảng nguyên liệu còn trống để không ghi đè dữ liệu quản lý đã sửa)

interface Ingredient { id: string; name: string; group: string; unit: string; sub: string; per: number; stock: number; min: number; cost: number }
interface Recipe { productId: string; size: string; lines: { ingredientId: string; amount: number }[] }
interface Receipt { id: string; at: string; by: string; note: string; lines: { ingredientId: string; qty: number; price: number }[] }
interface Movement { id: string; ingredientId: string; kind: 'receipt' | 'usage'; qty: number; at: string; note: string; ref?: string }

const INGREDIENTS: Ingredient[] = [
  { id: 'robusta', name: 'Hạt robusta rang mộc', group: 'ca-phe', unit: 'kg', sub: 'g', per: 1000, stock: 18.5, min: 10, cost: 220000 },
  { id: 'arabica', name: 'Hạt arabica', group: 'ca-phe', unit: 'kg', sub: 'g', per: 1000, stock: 6.2, min: 8, cost: 380000 },
  { id: 'sua-dac', name: 'Sữa đặc', group: 'sua', unit: 'hộp', sub: 'g', per: 380, stock: 42, min: 30, cost: 24000 },
  { id: 'sua-tuoi', name: 'Sữa tươi không đường', group: 'sua', unit: 'lít', sub: 'ml', per: 1000, stock: 12, min: 20, cost: 32000 },
  { id: 'kem-beo', name: 'Kem béo whipping', group: 'sua', unit: 'lít', sub: 'ml', per: 1000, stock: 3.5, min: 4, cost: 120000 },
  { id: 'cot-dua', name: 'Nước cốt dừa', group: 'sua', unit: 'lít', sub: 'ml', per: 1000, stock: 0, min: 3, cost: 65000 },
  { id: 'tra-den', name: 'Trà đen', group: 'tra', unit: 'kg', sub: 'g', per: 1000, stock: 4.8, min: 2, cost: 260000 },
  { id: 'matcha', name: 'Bột matcha', group: 'tra', unit: 'kg', sub: 'g', per: 1000, stock: 1.2, min: 1, cost: 900000 },
  { id: 'dao-ngam', name: 'Đào ngâm', group: 'tra', unit: 'hộp', sub: 'g', per: 820, stock: 14, min: 10, cost: 58000 },
  { id: 'vai-ngam', name: 'Vải ngâm', group: 'tra', unit: 'hộp', sub: 'g', per: 565, stock: 9, min: 8, cost: 62000 },
  { id: 'chanh-day', name: 'Chanh dây', group: 'tra', unit: 'kg', sub: 'g', per: 1000, stock: 2, min: 3, cost: 45000 },
  { id: 'cam', name: 'Cam sành', group: 'tra', unit: 'kg', sub: 'g', per: 1000, stock: 6, min: 4, cost: 38000 },
  { id: 'sa', name: 'Sả cây', group: 'tra', unit: 'kg', sub: 'g', per: 1000, stock: 1.5, min: 1, cost: 25000 },
  { id: 'tran-chau', name: 'Trân châu đen', group: 'tra', unit: 'kg', sub: 'g', per: 1000, stock: 5, min: 3, cost: 70000 },
  { id: 'muoi', name: 'Muối biển', group: 'duong', unit: 'kg', sub: 'g', per: 1000, stock: 2, min: 0.5, cost: 15000 },
  { id: 'duong', name: 'Đường cát trắng', group: 'duong', unit: 'kg', sub: 'g', per: 1000, stock: 25, min: 10, cost: 22000 },
  { id: 'siro-caramel', name: 'Siro caramel', group: 'duong', unit: 'chai', sub: 'ml', per: 750, stock: 4, min: 3, cost: 210000 },
  { id: 'sot-socola', name: 'Sốt sô-cô-la', group: 'duong', unit: 'chai', sub: 'ml', per: 500, stock: 2, min: 2, cost: 180000 },
  { id: 'bot-mi', name: 'Bột mì số 11', group: 'banh', unit: 'kg', sub: 'g', per: 1000, stock: 15, min: 10, cost: 28000 },
  { id: 'bo', name: 'Bơ lạt', group: 'banh', unit: 'kg', sub: 'g', per: 1000, stock: 3, min: 4, cost: 260000 },
  { id: 'trung', name: 'Trứng gà', group: 'banh', unit: 'quả', sub: 'quả', per: 1, stock: 120, min: 60, cost: 3500 },
  { id: 'pho-mai', name: 'Phô mai kem', group: 'banh', unit: 'kg', sub: 'g', per: 1000, stock: 4, min: 2, cost: 240000 },
  { id: 'bot-cacao', name: 'Bột cacao', group: 'banh', unit: 'kg', sub: 'g', per: 1000, stock: 1.5, min: 0.5, cost: 280000 },
  { id: 'chuoi', name: 'Chuối chín', group: 'banh', unit: 'kg', sub: 'g', per: 1000, stock: 5, min: 2, cost: 25000 },
  { id: 'viet-quat', name: 'Việt quất', group: 'banh', unit: 'hộp', sub: 'g', per: 125, stock: 12, min: 6, cost: 45000 },
  { id: 'banh-quy', name: 'Bánh quy sô-cô-la', group: 'banh', unit: 'gói', sub: 'g', per: 133, stock: 20, min: 10, cost: 18000 },
  { id: 'da-vien', name: 'Đá viên', group: 'bao-bi', unit: 'kg', sub: 'g', per: 1000, stock: 80, min: 50, cost: 3000 },
  { id: 'ly-500', name: 'Ly nhựa 500 ml', group: 'bao-bi', unit: 'cái', sub: 'cái', per: 1, stock: 850, min: 500, cost: 1200 },
  { id: 'nap-ly', name: 'Nắp ly', group: 'bao-bi', unit: 'cái', sub: 'cái', per: 1, stock: 900, min: 500, cost: 400 },
  { id: 'ong-hut', name: 'Ống hút giấy', group: 'bao-bi', unit: 'cái', sub: 'cái', per: 1, stock: 300, min: 400, cost: 300 },
  { id: 'tui-giay', name: 'Túi giấy mang đi', group: 'bao-bi', unit: 'cái', sub: 'cái', per: 1, stock: 400, min: 200, cost: 1500 },
];

// Công thức định lượng cho ly size M (hoặc 1 cái bánh)
const CUP = [
  { ingredientId: 'ly-500', amount: 1 },
  { ingredientId: 'nap-ly', amount: 1 },
  { ingredientId: 'ong-hut', amount: 1 },
];
// Đồ uống nóng: ly và nắp, không ống hút
const HOT = [
  { ingredientId: 'ly-500', amount: 1 },
  { ingredientId: 'nap-ly', amount: 1 },
];
const BAG = [{ ingredientId: 'tui-giay', amount: 1 }];
const RECIPES: Recipe[] = [
  { productId: 'ca-phe-sua-da', size: 'M', lines: [{ ingredientId: 'robusta', amount: 25 }, { ingredientId: 'sua-dac', amount: 35 }, { ingredientId: 'da-vien', amount: 150 }, ...CUP] },
  { productId: 'bac-xiu', size: 'M', lines: [{ ingredientId: 'robusta', amount: 15 }, { ingredientId: 'sua-dac', amount: 30 }, { ingredientId: 'sua-tuoi', amount: 80 }, { ingredientId: 'da-vien', amount: 120 }, ...CUP] },
  { productId: 'ca-phe-den-da', size: 'M', lines: [{ ingredientId: 'robusta', amount: 25 }, { ingredientId: 'duong', amount: 15 }, { ingredientId: 'da-vien', amount: 150 }, ...CUP] },
  { productId: 'ca-phe-cot-dua', size: 'M', lines: [{ ingredientId: 'robusta', amount: 25 }, { ingredientId: 'cot-dua', amount: 60 }, { ingredientId: 'sua-dac', amount: 20 }, { ingredientId: 'da-vien', amount: 150 }, ...CUP] },
  { productId: 'latte', size: 'M', lines: [{ ingredientId: 'arabica', amount: 18 }, { ingredientId: 'sua-tuoi', amount: 200 }, ...CUP] },
  { productId: 'caramel-macchiato', size: 'M', lines: [{ ingredientId: 'arabica', amount: 18 }, { ingredientId: 'sua-tuoi', amount: 180 }, { ingredientId: 'siro-caramel', amount: 20 }, { ingredientId: 'kem-beo', amount: 30 }, ...CUP] },
  { productId: 'tra-dao-cam-sa', size: 'M', lines: [{ ingredientId: 'tra-den', amount: 8 }, { ingredientId: 'dao-ngam', amount: 70 }, { ingredientId: 'cam', amount: 40 }, { ingredientId: 'sa', amount: 10 }, { ingredientId: 'duong', amount: 15 }, { ingredientId: 'da-vien', amount: 150 }, ...CUP] },
  { productId: 'tra-chanh-day', size: 'M', lines: [{ ingredientId: 'tra-den', amount: 6 }, { ingredientId: 'chanh-day', amount: 50 }, { ingredientId: 'duong', amount: 20 }, { ingredientId: 'da-vien', amount: 150 }, ...CUP] },
  { productId: 'tra-sua-tran-chau', size: 'M', lines: [{ ingredientId: 'tra-den', amount: 8 }, { ingredientId: 'sua-tuoi', amount: 100 }, { ingredientId: 'tran-chau', amount: 50 }, { ingredientId: 'duong', amount: 20 }, { ingredientId: 'da-vien', amount: 120 }, ...CUP] },
  { productId: 'croissant-bo', size: '1 cái', lines: [{ ingredientId: 'bot-mi', amount: 60 }, { ingredientId: 'bo', amount: 35 }, { ingredientId: 'trung', amount: 0.3 }, { ingredientId: 'tui-giay', amount: 1 }] },
  { productId: 'tra-vai', size: 'M', lines: [{ ingredientId: 'tra-den', amount: 8 }, { ingredientId: 'vai-ngam', amount: 80 }, { ingredientId: 'duong', amount: 15 }, { ingredientId: 'da-vien', amount: 150 }, ...CUP] },
  { productId: 'ca-phe-muoi', size: 'M', lines: [{ ingredientId: 'robusta', amount: 25 }, { ingredientId: 'sua-dac', amount: 25 }, { ingredientId: 'kem-beo', amount: 40 }, { ingredientId: 'muoi', amount: 1 }, { ingredientId: 'da-vien', amount: 150 }, ...CUP] },
  { productId: 'ca-phe-sua-nong', size: 'M', lines: [{ ingredientId: 'robusta', amount: 25 }, { ingredientId: 'sua-dac', amount: 35 }, ...HOT] },
  { productId: 'ca-phe-den-nong', size: 'M', lines: [{ ingredientId: 'robusta', amount: 25 }, { ingredientId: 'duong', amount: 15 }, ...HOT] },
  { productId: 'ca-phe-trung', size: 'M', lines: [{ ingredientId: 'robusta', amount: 25 }, { ingredientId: 'trung', amount: 1 }, { ingredientId: 'sua-dac', amount: 20 }, { ingredientId: 'duong', amount: 10 }, ...HOT] },
  { productId: 'matcha-da-xay', size: 'M', lines: [{ ingredientId: 'matcha', amount: 5 }, { ingredientId: 'sua-tuoi', amount: 180 }, { ingredientId: 'duong', amount: 15 }, { ingredientId: 'da-vien', amount: 120 }, ...CUP] },
  { productId: 'cookie-da-xay', size: 'M', lines: [{ ingredientId: 'banh-quy', amount: 40 }, { ingredientId: 'sua-tuoi', amount: 150 }, { ingredientId: 'kem-beo', amount: 30 }, { ingredientId: 'duong', amount: 15 }, { ingredientId: 'da-vien', amount: 180 }, ...CUP] },
  { productId: 'espresso', size: 'M', lines: [{ ingredientId: 'arabica', amount: 18 }, ...HOT] },
  { productId: 'americano', size: 'M', lines: [{ ingredientId: 'arabica', amount: 18 }, { ingredientId: 'da-vien', amount: 150 }, ...CUP] },
  { productId: 'cappuccino', size: 'M', lines: [{ ingredientId: 'arabica', amount: 18 }, { ingredientId: 'sua-tuoi', amount: 150 }, ...HOT] },
  { productId: 'mocha', size: 'M', lines: [{ ingredientId: 'arabica', amount: 18 }, { ingredientId: 'sua-tuoi', amount: 180 }, { ingredientId: 'sot-socola', amount: 25 }, ...HOT] },
  { productId: 'cold-brew', size: 'M', lines: [{ ingredientId: 'arabica', amount: 25 }, { ingredientId: 'duong', amount: 10 }, { ingredientId: 'da-vien', amount: 150 }, ...CUP] },
  { productId: 'tiramisu', size: '1 cái', lines: [{ ingredientId: 'pho-mai', amount: 50 }, { ingredientId: 'kem-beo', amount: 30 }, { ingredientId: 'trung', amount: 0.5 }, { ingredientId: 'robusta', amount: 5 }, { ingredientId: 'bot-cacao', amount: 3 }, { ingredientId: 'duong', amount: 15 }, { ingredientId: 'bot-mi', amount: 20 }, ...BAG] },
  { productId: 'cheesecake', size: '1 cái', lines: [{ ingredientId: 'pho-mai', amount: 70 }, { ingredientId: 'bot-mi', amount: 15 }, { ingredientId: 'bo', amount: 15 }, { ingredientId: 'trung', amount: 0.5 }, { ingredientId: 'duong', amount: 20 }, ...BAG] },
  { productId: 'brownie', size: '1 cái', lines: [{ ingredientId: 'bot-mi', amount: 25 }, { ingredientId: 'bo', amount: 25 }, { ingredientId: 'sot-socola', amount: 30 }, { ingredientId: 'bot-cacao', amount: 5 }, { ingredientId: 'trung', amount: 0.5 }, { ingredientId: 'duong', amount: 20 }, ...BAG] },
  { productId: 'banh-chuoi-nuong', size: '1 cái', lines: [{ ingredientId: 'chuoi', amount: 80 }, { ingredientId: 'bot-mi', amount: 40 }, { ingredientId: 'bo', amount: 15 }, { ingredientId: 'trung', amount: 0.5 }, { ingredientId: 'duong', amount: 15 }, ...BAG] },
  { productId: 'muffin-viet-quat', size: '1 cái', lines: [{ ingredientId: 'viet-quat', amount: 30 }, { ingredientId: 'bot-mi', amount: 45 }, { ingredientId: 'bo', amount: 15 }, { ingredientId: 'trung', amount: 0.5 }, { ingredientId: 'sua-tuoi', amount: 20 }, { ingredientId: 'duong', amount: 15 }, ...BAG] },
];

/** Ngày giờ lùi về quá khứ (dữ liệu mẫu) */
const ago = (days: number, hour = 8) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};

const RECEIPTS: Receipt[] = [
  { id: 'PN0018', at: ago(1, 9), by: 'Quản lý cửa hàng', note: '', lines: [{ ingredientId: 'robusta', qty: 10, price: 220000 }, { ingredientId: 'arabica', qty: 3, price: 380000 }] },
  { id: 'PN0017', at: ago(2, 7), by: 'Quản lý cửa hàng', note: 'Thiếu 1 thùng sữa tươi, giao bù sau', lines: [{ ingredientId: 'sua-dac', qty: 24, price: 24000 }, { ingredientId: 'sua-tuoi', qty: 12, price: 32000 }] },
  { id: 'PN0016', at: ago(3, 6), by: 'Quản lý cửa hàng', note: '', lines: [{ ingredientId: 'cam', qty: 5, price: 38000 }, { ingredientId: 'chanh-day', qty: 3, price: 45000 }, { ingredientId: 'dao-ngam', qty: 12, price: 58000 }] },
  { id: 'PN0015', at: ago(5, 10), by: 'Quản lý cửa hàng', note: '', lines: [{ ingredientId: 'ly-500', qty: 1000, price: 1200 }, { ingredientId: 'nap-ly', qty: 1000, price: 400 }] },
]


const MOVEMENTS: Movement[] = [
  { id: 'm1', ingredientId: 'robusta', kind: 'receipt', qty: 10, at: ago(1, 9), note: 'Phiếu nhập', ref: 'PN0018' },
  { id: 'm2', ingredientId: 'arabica', kind: 'receipt', qty: 3, at: ago(1, 9), note: 'Phiếu nhập', ref: 'PN0018' },
  { id: 'm3', ingredientId: 'robusta', kind: 'usage', qty: -2.4, at: ago(0, 21), note: 'Pha chế trong ngày (96 ly)' },
  { id: 'm4', ingredientId: 'sua-tuoi', kind: 'usage', qty: -6.8, at: ago(0, 21), note: 'Pha chế trong ngày' },
  { id: 'm6', ingredientId: 'sua-dac', kind: 'receipt', qty: 24, at: ago(2, 7), note: 'Phiếu nhập', ref: 'PN0017' },
  { id: 'm8', ingredientId: 'chanh-day', kind: 'usage', qty: -1.6, at: ago(0, 21), note: 'Pha chế trong ngày' },
  { id: 'm9', ingredientId: 'cam', kind: 'receipt', qty: 5, at: ago(3, 6), note: 'Phiếu nhập', ref: 'PN0016' },
  { id: 'm10', ingredientId: 'bo', kind: 'usage', qty: -1.2, at: ago(0, 6), note: 'Mẻ croissant buổi sáng (34 cái)' },
];

export { INGREDIENTS, RECIPES, RECEIPTS, MOVEMENTS };

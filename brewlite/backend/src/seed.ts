/**
 * Nạp dữ liệu mẫu: menu, topping, mã giảm giá, tài khoản demo.
 * Chạy được nhiều lần: chỉ thêm cái còn thiếu, không ghi đè tồn kho hay đơn hàng đã có.
 *   npm run seed            (khi phát triển)
 *   node dist/seed.js       (trong Docker)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const img = (id: string) => `https://images.unsplash.com/photo-${id}`;
const COFFEE = ['cafe', 'coffee', 'caphe'];

const TOPPINGS = [
  { id: 'espresso', name: 'Thêm shot espresso', price: 10000 },
  { id: 'cheese', name: 'Kem cheese', price: 12000 },
  { id: 'thach', name: 'Thạch cà phê', price: 8000 },
  { id: 'tranchau', name: 'Trân châu trắng', price: 8000 },
];

const PRODUCTS = [
  { id: 'ca-phe-sua-da', name: 'Cà phê sữa đá', category: 'truyen-thong', price: 29000, stock: 120, tag: 'hot', imageUrl: img('1595394269751-bcf08ce7bd5d'), rating: 4.9, sold: 2400, color: '#8a5634', kind: 'drink', hasIce: true, toppings: ['espresso', 'thach'], keywords: [...COFFEE, 'phin'], description: 'Robusta pha phin, đậm và đắng hậu, cân lại bằng sữa đặc. Ly quen của người Sài Gòn.' },
  { id: 'bac-xiu', name: 'Bạc xỉu', category: 'truyen-thong', price: 32000, stock: 100, tag: 'hot', imageUrl: img('1562447457-579fc34967fb'), rating: 4.8, sold: 1800, color: '#c49a6c', kind: 'drink', hasIce: true, toppings: ['espresso', 'thach', 'cheese'], keywords: [...COFFEE, 'sua'], description: 'Nhiều sữa, ít cà phê, vị béo ngọt dịu cho người mới tập uống cà phê.' },
  { id: 'ca-phe-den-da', name: 'Cà phê đen đá', category: 'truyen-thong', price: 25000, stock: 120, tag: null, imageUrl: img('1502599213010-875782f9bf52'), rating: 4.7, sold: 1300, color: '#3e2418', kind: 'drink', hasIce: true, toppings: ['espresso'], keywords: [...COFFEE, 'black'], description: 'Phin nguyên chất, đắng rõ, thơm mùi hạt rang. Tỉnh táo cả buổi sáng.' },
  { id: 'ca-phe-muoi', name: 'Cà phê muối', category: 'truyen-thong', price: 35000, stock: 60, tag: 'new', imageUrl: img('1592663527359-cf6642f54cff'), rating: 4.9, sold: 950, color: '#9c6b45', kind: 'drink', hasIce: true, toppings: ['espresso', 'cheese'], keywords: [...COFFEE, 'salt'], description: 'Lớp kem muối mặn nhẹ phủ trên cà phê sữa đậm, khuấy đều trước khi uống.' },
  { id: 'latte', name: 'Latte', category: 'pha-may', price: 45000, stock: 80, tag: 'new', imageUrl: img('1461023058943-07fcbe16d735'), rating: 4.7, sold: 820, color: '#cfa87f', kind: 'drink', hasIce: true, toppings: ['espresso'], keywords: [...COFFEE, 'sua tuoi'], description: 'Espresso Arabica với sữa tươi đánh mịn, vị êm và thơm.' },
  { id: 'cappuccino', name: 'Cappuccino', category: 'pha-may', price: 45000, stock: 80, tag: null, imageUrl: img('1497636577773-f1231844b336'), rating: 4.6, sold: 640, color: '#a87b55', kind: 'drink', hasIce: false, toppings: ['espresso'], keywords: [...COFFEE, 'nong'], description: 'Espresso, sữa nóng và lớp bọt sữa dày. Phục vụ nóng.' },
  { id: 'americano', name: 'Americano', category: 'pha-may', price: 39000, stock: 80, tag: null, imageUrl: img('1517701550927-30cf4ba1dba5'), rating: 4.5, sold: 580, color: '#4a2c1c', kind: 'drink', hasIce: true, toppings: ['espresso'], keywords: [...COFFEE, 'den'], description: 'Espresso pha loãng với nước lạnh, vị thanh và ít đắng.' },
  { id: 'tra-dao-cam-sa', name: 'Trà đào cam sả', category: 'tra-da-xay', price: 42000, stock: 100, tag: 'hot', imageUrl: img('1556679343-c7306c1976bc'), rating: 4.8, sold: 2100, color: '#e8a048', kind: 'drink', hasIce: true, toppings: ['thach', 'tranchau'], keywords: ['tea', 'peach'], description: 'Trà đen ủ lạnh, đào miếng, cam tươi và sả đập dập.' },
  { id: 'matcha-da-xay', name: 'Matcha latte đá', category: 'tra-da-xay', price: 49000, stock: 50, tag: 'new', imageUrl: img('1717603545758-88cc454db69b'), rating: 4.8, sold: 760, color: '#8da35a', kind: 'drink', hasIce: true, toppings: ['cheese', 'tranchau'], keywords: ['tra xanh', 'green tea', 'matcha'], description: 'Matcha Nhật pha cùng sữa tươi và đá, xanh mát, ngọt nhẹ.' },
  { id: 'croissant-bo', name: 'Bánh croissant bơ', category: 'banh-ngot', price: 28000, stock: 8, tag: null, imageUrl: img('1654808991961-141a731f55db'), rating: 4.7, sold: 430, color: '#d9a45b', kind: 'food', hasIce: false, toppings: [], keywords: ['banh sung bo'], description: 'Nướng mới mỗi sáng, vỏ giòn nhiều lớp, ruột mềm thơm bơ.' },
  { id: 'brownie', name: 'Brownie sô-cô-la', category: 'banh-ngot', price: 35000, stock: 5, tag: null, imageUrl: img('1606313564200-e75d5e30476c'), rating: 4.6, sold: 380, color: '#5a3420', kind: 'food', hasIce: false, toppings: [], keywords: ['chocolate', 'socola', 'banh'], description: 'Bánh brownie đặc ruột, rưới sô-cô-la nóng chảy. Mỗi ngày chỉ nướng một mẻ nhỏ.' },
];

const VOUCHERS = [
  { code: 'BREW20', type: 'PERCENT' as const, label: 'Giảm 20%, tối đa 20.000đ cho đơn từ 50.000đ', percent: 20, maxDiscount: 20000, minOrder: 50000 },
  { code: 'MOMO20', type: 'PERCENT' as const, label: 'Giảm 20% khi trả bằng MoMo, tối đa 25.000đ', percent: 20, maxDiscount: 25000, requiredMethod: 'MOMO' as const },
  { code: 'FREESHIP', type: 'FREESHIP' as const, label: 'Miễn phí giao hàng', requiresDelivery: true },
];

const DEMO_WALLETS = [
  { provider: 'MOMO' as const, maskedNumber: '090•••4567', balance: 300_000 },
  { provider: 'CARD' as const, maskedNumber: '•••• 4242', balance: 20_000 },
];

async function main() {
  for (const t of TOPPINGS) {
    await prisma.topping.upsert({ where: { id: t.id }, update: {}, create: t });
  }
  for (const { toppings, ...p } of PRODUCTS) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: { ...p, toppings: { connect: toppings.map((id) => ({ id })) } },
    });
  }
  for (const v of VOUCHERS) {
    await prisma.voucher.upsert({ where: { code: v.code }, update: {}, create: v });
  }
  let demo = await prisma.user.findUnique({ where: { email: 'demo@brewlite.vn' } });
  if (!demo) {
    demo = await prisma.user.create({
      data: {
        email: 'demo@brewlite.vn',
        fullName: 'Khách Demo',
        passwordHash: await bcrypt.hash('Brewlite123', 10),
        loyaltyPoints: 1250,
        loyaltyLogs: { create: { delta: 1250, reason: 'Quà chào mừng thành viên mới' } },
      },
    });
  }
  // Tài khoản ảo của khách demo: MoMo đủ tiền để demo thanh toán thành công,
  // thẻ chỉ còn 20.000đ để demo thanh toán thất bại do không đủ số dư (PAYMENT_FAILED)
  if ((await prisma.walletAccount.count({ where: { userId: demo.id } })) === 0) {
    for (const w of DEMO_WALLETS) {
      await prisma.walletAccount.create({
        data: { ...w, userId: demo.id, holderName: demo.fullName, transactions: { create: { type: 'OPENING', amount: w.balance, balanceAfter: w.balance, note: 'Số dư ban đầu khi liên kết tài khoản ảo' } } },
      });
    }
  }
  console.log(`Đã nạp ${PRODUCTS.length} món, ${TOPPINGS.length} topping, ${VOUCHERS.length} mã giảm giá, tài khoản demo@brewlite.vn / Brewlite123 (ví MoMo ảo 300.000đ, thẻ ảo 20.000đ)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

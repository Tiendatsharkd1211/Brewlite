/**
 * Nạp dữ liệu mẫu: menu, topping, mã giảm giá, tài khoản demo.
 * Chạy được nhiều lần: chỉ thêm cái còn thiếu, không ghi đè tồn kho hay đơn hàng đã có.
 *   npm run seed            (khi phát triển)
 *   node dist/seed.js       (trong Docker)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { INGREDIENTS, MOVEMENTS, RECEIPTS, RECIPES } from './inventory/seed-data';

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
  { id: 'ca-phe-sua-da', name: 'Cà phê sữa đá', category: 'truyen-thong', price: 29000, stock: 120, tag: 'hot', imageUrl: img('1689453014159-05751017e5b0'), rating: 4.9, sold: 2400, color: '#8a5634', kind: 'drink', hasIce: true, toppings: ['espresso', 'thach'], keywords: [...COFFEE, 'phin'], description: 'Robusta pha phin, đậm và đắng hậu, cân lại bằng sữa đặc. Ly quen của người Sài Gòn.' },
  { id: 'bac-xiu', name: 'Bạc xỉu', category: 'truyen-thong', price: 32000, stock: 100, tag: 'hot', imageUrl: img('1562447457-579fc34967fb'), rating: 4.8, sold: 1800, color: '#c49a6c', kind: 'drink', hasIce: true, toppings: ['espresso', 'thach', 'cheese'], keywords: [...COFFEE, 'sua'], description: 'Nhiều sữa, ít cà phê, vị béo ngọt dịu cho người mới tập uống cà phê.' },
  { id: 'ca-phe-den-da', name: 'Cà phê đen đá', category: 'truyen-thong', price: 25000, stock: 120, tag: null, imageUrl: img('1749104953130-819934417466'), rating: 4.7, sold: 1300, color: '#3e2418', kind: 'drink', hasIce: true, toppings: ['espresso'], keywords: [...COFFEE, 'black'], description: 'Phin nguyên chất, đắng rõ, thơm mùi hạt rang. Tỉnh táo cả buổi sáng.' },
  { id: 'ca-phe-muoi', name: 'Cà phê muối', category: 'truyen-thong', price: 35000, stock: 60, tag: 'new', imageUrl: img('1741321723835-7c4f3ef95b5a'), rating: 4.9, sold: 950, color: '#9c6b45', kind: 'drink', hasIce: true, toppings: ['espresso', 'cheese'], keywords: [...COFFEE, 'salt'], description: 'Lớp kem muối mặn nhẹ phủ trên cà phê sữa đậm, khuấy đều trước khi uống.' },
  { id: 'latte', name: 'Latte', category: 'pha-may', price: 45000, stock: 80, tag: 'new', imageUrl: img('1461023058943-07fcbe16d735'), rating: 4.7, sold: 820, color: '#cfa87f', kind: 'drink', hasIce: true, toppings: ['espresso'], keywords: [...COFFEE, 'sua tuoi'], description: 'Espresso Arabica với sữa tươi đánh mịn, vị êm và thơm.' },
  { id: 'cappuccino', name: 'Cappuccino', category: 'pha-may', price: 45000, stock: 80, tag: null, imageUrl: img('1497636577773-f1231844b336'), rating: 4.6, sold: 640, color: '#a87b55', kind: 'drink', hasIce: false, toppings: ['espresso'], keywords: [...COFFEE, 'nong'], description: 'Espresso, sữa nóng và lớp bọt sữa dày. Phục vụ nóng.' },
  { id: 'americano', name: 'Americano', category: 'pha-may', price: 39000, stock: 80, tag: null, imageUrl: img('1517959105821-eaf2591984ca'), rating: 4.5, sold: 580, color: '#4a2c1c', kind: 'drink', hasIce: true, toppings: ['espresso'], keywords: [...COFFEE, 'den'], description: 'Espresso pha loãng với nước lạnh, vị thanh và ít đắng.' },
  { id: 'tra-dao-cam-sa', name: 'Trà đào cam sả', category: 'tra-da-xay', price: 42000, stock: 100, tag: 'hot', imageUrl: img('1676693420436-7fa448f054eb'), rating: 4.8, sold: 2100, color: '#e8a048', kind: 'drink', hasIce: true, toppings: ['thach', 'tranchau'], keywords: ['tea', 'peach'], description: 'Trà đen ủ lạnh, đào miếng, cam tươi và sả đập dập.' },
  { id: 'matcha-da-xay', name: 'Matcha latte đá', category: 'tra-da-xay', price: 49000, stock: 50, tag: 'new', imageUrl: img('1717603545758-88cc454db69b'), rating: 4.8, sold: 760, color: '#8da35a', kind: 'drink', hasIce: true, toppings: ['cheese', 'tranchau'], keywords: ['tra xanh', 'green tea', 'matcha'], description: 'Matcha Nhật pha cùng sữa tươi và đá, xanh mát, ngọt nhẹ.' },
  { id: 'croissant-bo', name: 'Bánh croissant bơ', category: 'banh-ngot', price: 28000, stock: 8, tag: null, imageUrl: img('1681072368184-a5a906887cf2'), rating: 4.7, sold: 430, color: '#d9a45b', kind: 'food', hasIce: false, toppings: [], keywords: ['banh sung bo'], description: 'Nướng mới mỗi sáng, vỏ giòn nhiều lớp, ruột mềm thơm bơ.' },
  { id: 'brownie', name: 'Brownie sô-cô-la', category: 'banh-ngot', price: 35000, stock: 5, tag: null, imageUrl: img('1606313564200-e75d5e30476c'), rating: 4.6, sold: 380, color: '#5a3420', kind: 'food', hasIce: false, toppings: [], keywords: ['chocolate', 'socola', 'banh'], description: 'Bánh brownie đặc ruột, rưới sô-cô-la nóng chảy. Mỗi ngày chỉ nướng một mẻ nhỏ.' },
  // ----- Thêm món (ảnh đã soát khớp từng món) -----
  { id: 'ca-phe-trung', name: 'Cà phê trứng', category: 'truyen-thong', price: 39000, stock: 50, tag: 'new', imageUrl: img('1599284169556-5054894d77f3'), rating: 4.8, sold: 690, color: '#c9a27a', kind: 'drink', hasIce: false, toppings: ['espresso'], keywords: [...COFFEE, 'trung', 'egg', 'ha noi'], description: 'Lớp kem trứng đánh bông béo mịn trên nền cà phê phin nóng, uống kiểu Hà Nội.' },
  { id: 'ca-phe-cot-dua', name: 'Cà phê cốt dừa', category: 'truyen-thong', price: 39000, stock: 70, tag: 'hot', imageUrl: img('1588413335672-87b35888b55d'), rating: 4.8, sold: 1500, color: '#d8c3a5', kind: 'drink', hasIce: true, toppings: ['espresso', 'thach'], keywords: [...COFFEE, 'dua', 'coconut'], description: 'Cốt dừa xay cùng đá, rưới cà phê phin đậm. Béo, thơm, mát lạnh.' },
  { id: 'ca-phe-sua-nong', name: 'Cà phê sữa nóng', category: 'truyen-thong', price: 29000, stock: 120, tag: null, imageUrl: img('1570968915860-54d5c301fa9f'), rating: 4.7, sold: 880, color: '#9c6b45', kind: 'drink', hasIce: false, toppings: ['espresso'], keywords: [...COFFEE, 'sua', 'nong', 'hot'], description: 'Cà phê phin pha với sữa đặc, uống nóng cho buổi sáng se lạnh.' },
  { id: 'ca-phe-den-nong', name: 'Cà phê đen nóng', category: 'truyen-thong', price: 25000, stock: 120, tag: null, imageUrl: img('1611162458324-aae1eb4129a4'), rating: 4.6, sold: 540, color: '#3e2418', kind: 'drink', hasIce: false, toppings: ['espresso'], keywords: [...COFFEE, 'den', 'nong', 'black'], description: 'Phin nguyên chất, không đường hoặc ít đường tuỳ bạn chọn.' },
  { id: 'espresso', name: 'Espresso', category: 'pha-may', price: 35000, stock: 80, tag: null, imageUrl: img('1572286258217-40142c1c6a70'), rating: 4.6, sold: 410, color: '#4a2c1c', kind: 'drink', hasIce: false, toppings: [], keywords: [...COFFEE, 'shot'], description: 'Một shot espresso arabica, lớp crema dày, vị chua nhẹ và hậu ngọt.' },
  { id: 'mocha', name: 'Mocha', category: 'pha-may', price: 49000, stock: 70, tag: null, imageUrl: img('1530629159325-9c378fc150b9'), rating: 4.7, sold: 470, color: '#6b4430', kind: 'drink', hasIce: true, toppings: ['espresso', 'cheese'], keywords: [...COFFEE, 'socola', 'chocolate'], description: 'Espresso, sốt sô-cô-la và sữa tươi đánh nóng, rắc bột cacao.' },
  { id: 'caramel-macchiato', name: 'Caramel macchiato', category: 'pha-may', price: 52000, stock: 70, tag: 'hot', imageUrl: img('1570517130750-10c67ffdde09'), rating: 4.8, sold: 990, color: '#c48a4a', kind: 'drink', hasIce: true, toppings: ['espresso'], keywords: [...COFFEE, 'caramen'], description: 'Sữa tươi, espresso và sốt caramel rưới trên lớp kem sữa.' },
  { id: 'cold-brew', name: 'Cold brew', category: 'pha-may', price: 45000, stock: 40, tag: 'new', imageUrl: img('1759259639356-6eee63241869'), rating: 4.7, sold: 360, color: '#3a2418', kind: 'drink', hasIce: true, toppings: [], keywords: [...COFFEE, 'u lanh'], description: 'Cà phê ủ lạnh 18 tiếng, vị êm, ít đắng, đóng chai mỗi sáng.' },
  { id: 'tra-vai', name: 'Trà vải', category: 'tra-da-xay', price: 42000, stock: 90, tag: 'hot', imageUrl: img('1599767431130-41b1c51d9a7b'), rating: 4.8, sold: 1650, color: '#d9a27a', kind: 'drink', hasIce: true, toppings: ['thach', 'tranchau'], keywords: ['tea', 'lychee', 'vai'], description: 'Trà đen ủ lạnh, vải thiều bóc vỏ và lá bạc hà.' },
  { id: 'tra-sua-tran-chau', name: 'Trà sữa trân châu', category: 'tra-da-xay', price: 39000, stock: 100, tag: 'hot', imageUrl: img('1525803377221-4f6ccdaa5133'), rating: 4.7, sold: 1900, color: '#c8a27c', kind: 'drink', hasIce: true, toppings: ['tranchau', 'cheese'], keywords: ['tra sua', 'milk tea', 'boba', 'tran chau'], description: 'Trà đen pha sữa tươi, trân châu đường đen nấu mới mỗi ca.' },
  { id: 'tra-chanh-day', name: 'Trà chanh dây', category: 'tra-da-xay', price: 39000, stock: 80, tag: null, imageUrl: img('1786783506825-1bdc1d2acd72'), rating: 4.6, sold: 720, color: '#e8b33a', kind: 'drink', hasIce: true, toppings: ['thach'], keywords: ['tea', 'passion', 'chanh day'], description: 'Trà xanh nhài với chanh dây tươi, chua ngọt, nhiều đá.' },
  { id: 'cookie-da-xay', name: 'Cookie đá xay', category: 'tra-da-xay', price: 55000, stock: 50, tag: 'new', imageUrl: img('1572490122747-3968b75cc699'), rating: 4.7, sold: 520, color: '#4a3a34', kind: 'drink', hasIce: true, toppings: ['cheese'], keywords: ['frappe', 'oreo', 'socola', 'da xay'], description: 'Sữa, bánh quy sô-cô-la xay cùng đá, phủ kem và vụn bánh.' },
  { id: 'tiramisu', name: 'Tiramisu', category: 'banh-ngot', price: 42000, stock: 12, tag: 'hot', imageUrl: img('1571877227200-a0d98ea607e9'), rating: 4.8, sold: 610, color: '#a07a5a', kind: 'food', hasIce: false, toppings: [], keywords: ['banh', 'cake', 'y'], description: 'Bánh ladyfinger thấm espresso, kem mascarpone, rắc cacao.' },
  { id: 'cheesecake', name: 'Bánh phô mai', category: 'banh-ngot', price: 45000, stock: 10, tag: null, imageUrl: img('1702920375096-5ae53044d11c'), rating: 4.7, sold: 390, color: '#e9dcc0', kind: 'food', hasIce: false, toppings: [], keywords: ['banh', 'cheesecake', 'pho mai'], description: 'Phô mai kem nướng chậm kiểu New York, đế bánh quy bơ.' },
  { id: 'muffin-viet-quat', name: 'Muffin việt quất', category: 'banh-ngot', price: 32000, stock: 15, tag: null, imageUrl: img('1601390387542-22acd08d6029'), rating: 4.5, sold: 280, color: '#b98a5a', kind: 'food', hasIce: false, toppings: [], keywords: ['banh', 'blueberry', 'viet quat'], description: 'Muffin mềm ẩm, nhân việt quất, nướng mới mỗi sáng.' },
  { id: 'banh-chuoi-nuong', name: 'Bánh chuối nướng', category: 'banh-ngot', price: 29000, stock: 12, tag: null, imageUrl: img('1774987703209-c7c505076b14'), rating: 4.6, sold: 300, color: '#8a5a34', kind: 'food', hasIce: false, toppings: [], keywords: ['banh', 'banana', 'chuoi'], description: 'Chuối chín nướng cùng quế và óc chó, ăn kèm cà phê rất hợp.' },
];

const VOUCHERS = [
  { code: 'BREW20', type: 'PERCENT' as const, label: 'Giảm 20% cho đơn từ 50.000đ', terms: 'Tối đa 20.000đ. Áp dụng mọi phương thức thanh toán.', percent: 20, maxDiscount: 20000, minOrder: 50000 },
  { code: 'VNPAY20', type: 'PERCENT' as const, label: 'Giảm 20% khi trả qua VNPay', terms: 'Tối đa 25.000đ. Chỉ áp dụng khi chọn thanh toán VNPay.', percent: 20, maxDiscount: 25000, requiredMethod: 'VNPAY' as const },
  { code: 'FREESHIP', type: 'FREESHIP' as const, label: 'Miễn phí giao hàng', terms: 'Áp dụng khi chọn giao tận nơi, phí giao thường là 15.000đ.', requiresDelivery: true },
];

async function main() {
  for (const t of TOPPINGS) {
    await prisma.topping.upsert({ where: { id: t.id }, update: {}, create: t });
  }
  for (const { toppings, ...p } of PRODUCTS) {
    await prisma.product.upsert({
      where: { id: p.id },
      // Chỉ cập nhật ảnh (để sửa ảnh sai món trên CSDL đã có); không đụng tồn kho, số đã bán
      update: { imageUrl: p.imageUrl },
      create: { ...p, toppings: { connect: toppings.map((id) => ({ id })) } },
    });
  }
  for (const v of VOUCHERS) {
    // CSDL cũ: chỉ bổ sung tiêu đề, điều kiện; không đụng số lượt đã dùng hay thay đổi của quản lý
    await prisma.voucher.upsert({ where: { code: v.code }, update: { terms: v.terms }, create: v });
  }
  const demo = await prisma.user.findUnique({ where: { email: 'demo@brewlite.vn' } });
  if (!demo) {
    await prisma.user.create({
      data: {
        email: 'demo@brewlite.vn',
        fullName: 'Nguyễn Minh Anh',
        passwordHash: await bcrypt.hash('Brewlite123', 10),
        loyaltyPoints: 1250,
        loyaltyLogs: { create: { delta: 1250, reason: 'Quà chào mừng thành viên mới' } },
      },
    });
  } else if (demo.fullName === 'Khách Demo') {
    // CSDL cũ: đổi tên mẫu cũ thành tên người thật, khách nhìn vào không thấy chữ "Demo"
    await prisma.user.update({ where: { id: demo.id }, data: { fullName: 'Nguyễn Minh Anh' } });
  }
  // Tài khoản nhân viên quầy chỉ tạo bằng seed; đăng ký trên web luôn là khách (CUSTOMER)
  await prisma.user.upsert({
    where: { email: 'staff@brewlite.vn' },
    update: { role: 'STAFF' },
    create: { email: 'staff@brewlite.vn', fullName: 'Nhân viên quầy', passwordHash: await bcrypt.hash('Brewlite123', 10), role: 'STAFF' },
  });
  await prisma.user.upsert({
    where: { email: 'manager@brewlite.vn' },
    update: { role: 'MANAGER' },
    create: { email: 'manager@brewlite.vn', fullName: 'Quản lý cửa hàng', passwordHash: await bcrypt.hash('Brewlite123', 10), role: 'MANAGER' },
  });
  // Vài khách mẫu cho trang Tài khoản khách của quản lý; một tài khoản đang bị khoá để thấy luồng mở khoá
  for (const c of SAMPLE_CUSTOMERS) {
    const exists = await prisma.user.findUnique({ where: { email: c.email } });
    if (exists) {
      // CSDL cũ chưa có số điện thoại: bổ sung
      if (!exists.phone) await prisma.user.update({ where: { id: exists.id }, data: { phone: c.phone } });
      continue;
    }
    const locked = 'lockReason' in c;
    await prisma.user.create({
      data: {
        email: c.email,
        phone: c.phone,
        fullName: c.fullName,
        passwordHash: await bcrypt.hash('Brewlite123', 10),
        loyaltyPoints: c.points,
        loyaltyLogs: { create: { delta: c.points, reason: 'Quà chào mừng thành viên mới' } },
        ...(locked && {
          lockedAt: new Date(),
          lockReason: c.lockReason,
          accountLogs: { create: { action: 'LOCK', reason: c.lockReason, byName: 'Quản lý cửa hàng' } },
          notifications: { create: { title: 'Tài khoản của bạn đã bị tạm khoá', body: `Lý do: ${c.lockReason}` } },
        }),
      },
    });
  }
  // Kho nguyên liệu: chỉ nạp khi còn trống, để không ghi đè số tồn, công thức quản lý đã sửa
  if ((await prisma.ingredient.count()) === 0) {
    await prisma.ingredient.createMany({ data: INGREDIENTS });
    const ids = new Set((await prisma.product.findMany({ select: { id: true } })).map((p) => p.id));
    await prisma.recipeLine.createMany({ data: RECIPES.filter((r) => ids.has(r.productId)).flatMap((r) => r.lines.map((l) => ({ productId: r.productId, ...l }))) });
    for (const r of RECEIPTS) await prisma.receipt.create({ data: { id: r.id, at: new Date(r.at), by: r.by, note: r.note, lines: { create: r.lines } } });
    await prisma.stockMove.createMany({ data: MOVEMENTS.map(({ id: _id, at, ...m }) => ({ ...m, at: new Date(at) })) });
    console.log(`Đã nạp kho: ${INGREDIENTS.length} nguyên liệu, ${RECIPES.length} công thức, ${RECEIPTS.length} phiếu nhập`);
  }
  console.log(`Đã nạp ${PRODUCTS.length} món, ${TOPPINGS.length} topping, ${VOUCHERS.length} mã giảm giá, tài khoản demo@brewlite.vn, staff@brewlite.vn và manager@brewlite.vn (mật khẩu Brewlite123)`);
}

const SAMPLE_CUSTOMERS = [
  { email: 'lan.tran@brewlite.vn', phone: '0912345678', fullName: 'Trần Thị Lan', points: 1250 },
  { email: 'huy.le@brewlite.vn', phone: '0987654321', fullName: 'Lê Quang Huy', points: 1250 },
  { email: 'khoa.pham@brewlite.vn', phone: '0905123456', fullName: 'Phạm Đăng Khoa', points: 300, lockReason: 'Đặt nhiều đơn rồi không nhận, không thanh toán' },
] as const;

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

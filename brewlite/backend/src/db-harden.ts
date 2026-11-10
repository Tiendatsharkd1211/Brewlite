/**
 * Rào CSDL: chạy sau `prisma db push`, bằng tài khoản CHỦ CSDL (DIRECT_URL). Chạy lại nhiều lần vẫn an toàn.
 *   npm run db:harden          (khi phát triển)
 *   node dist/db-harden.js     (trong Docker)
 *
 * 1. Tài khoản riêng cho app (lấy tên và mật khẩu trong DATABASE_URL): chỉ được SELECT/INSERT/UPDATE/DELETE,
 *    không tạo, sửa, xoá bảng. App có lỗi hay bị tấn công cũng không DROP TABLE hay đổi cấu trúc được.
 * 2. CHECK constraint: CSDL tự từ chối số âm (tồn kho, điểm, tiền) dù code phía trên có lỗi.
 */
import { PrismaClient } from '@prisma/client';

/** [bảng, tên ràng buộc, điều kiện] */
const CHECKS: [string, string, string][] = [
  ['Product', 'product_price_nonneg', '"price" >= 0'],
  ['Product', 'product_stock_nonneg', '"stock" >= 0'],
  ['Product', 'product_sold_nonneg', '"sold" >= 0'],
  ['User', 'user_points_nonneg', '"loyaltyPoints" >= 0'],
  ['Order', 'order_money_nonneg', '"subtotal" >= 0 AND "fee" >= 0 AND "discount" >= 0 AND "total" >= 0'],
  ['Order', 'order_points_nonneg', '"pointsEarned" >= 0 AND "pointsUsed" >= 0'],
  ['OrderItem', 'orderitem_qty_range', '"qty" BETWEEN 1 AND 20'],
  ['OrderItem', 'orderitem_money_nonneg', '"unitPrice" >= 0 AND "lineTotal" >= 0'],
  ['OrderItem', 'orderitem_levels', '("sugar" IS NULL OR "sugar" IN (0, 30, 50, 100)) AND ("ice" IS NULL OR "ice" IN (0, 30, 50, 100))'],
  ['Payment', 'payment_amount_nonneg', '"amount" >= 0'],
  ['Voucher', 'voucher_values_nonneg', '"percent" BETWEEN 0 AND 100 AND "maxDiscount" >= 0 AND "minOrder" >= 0 AND "usedCount" >= 0'],
];

/** Tên định danh SQL chỉ cho phép chữ, số, gạch dưới (tránh chèn lệnh qua biến môi trường) */
function ident(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Tên không hợp lệ: ${name}`);
  return `"${name}"`;
}

async function main() {
  const ownerUrl = process.env.DIRECT_URL;
  const appUrl = process.env.DATABASE_URL;
  if (!ownerUrl || !appUrl) throw new Error('Cần đặt cả DIRECT_URL (chủ CSDL) và DATABASE_URL (tài khoản app)');

  const owner = new URL(ownerUrl);
  const app = new URL(appUrl);
  const prisma = new PrismaClient({ datasourceUrl: ownerUrl });
  try {
    for (const [table, name, condition] of CHECKS) {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${ident(table)} DROP CONSTRAINT IF EXISTS ${ident(name)}`);
      await prisma.$executeRawUnsafe(`ALTER TABLE ${ident(table)} ADD CONSTRAINT ${ident(name)} CHECK (${condition})`);
    }
    console.log(`Đã gắn ${CHECKS.length} ràng buộc CHECK`);

    const appUser = decodeURIComponent(app.username);
    if (appUser === decodeURIComponent(owner.username)) {
      console.log('[CHÚ Ý] DATABASE_URL đang dùng tài khoản chủ CSDL; nên tách tài khoản app riêng (xem .env.example)');
      return;
    }
    const role = ident(appUser);
    const db = ident(decodeURIComponent(owner.pathname.slice(1)));
    const exists = await prisma.$queryRaw<{ n: number }[]>`SELECT 1 AS n FROM pg_roles WHERE rolname = ${appUser}`;
    // Mật khẩu đi qua tham số, không ghép chuỗi; NOSUPERUSER... để chắc chắn tài khoản app không có quyền quản trị
    const password = decodeURIComponent(app.password);
    const literal = (await prisma.$queryRaw<{ q: string }[]>`SELECT quote_literal(${password}) AS q`)[0].q;
    const opts = `LOGIN PASSWORD ${literal} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`;
    await prisma.$executeRawUnsafe(exists.length ? `ALTER ROLE ${role} WITH ${opts}` : `CREATE ROLE ${role} WITH ${opts}`);

    const statements = [
      `REVOKE ALL ON DATABASE ${db} FROM PUBLIC`,
      `GRANT CONNECT ON DATABASE ${db} TO ${role}`,
      'REVOKE CREATE ON SCHEMA public FROM PUBLIC',
      `REVOKE CREATE ON SCHEMA public FROM ${role}`,
      `GRANT USAGE ON SCHEMA public TO ${role}`,
      `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${role}`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`,
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${role}`,
    ];
    for (const sql of statements) await prisma.$executeRawUnsafe(sql);
    console.log(`Tài khoản app ${appUser}: chỉ đọc/ghi dữ liệu, không đổi được cấu trúc bảng`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Rào CSDL thất bại:', err instanceof Error ? err.message : err);
  process.exit(1);
});

import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import type { User } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';
import { CustomersService } from '../src/customers/customers.service';
import { PrismaService } from '../src/prisma/prisma.service';

// Quản lý khoá / mở khoá tài khoản khách: chặn đăng nhập, ghi lịch sử, báo lý do cho khách (PostgreSQL thật)
describe('Tài khoản khách: khoá và mở khoá (PostgreSQL thật)', () => {
  let prisma: PrismaService;
  let customers: CustomersService;
  let auth: AuthService;
  const manager = { fullName: 'Quản lý kiểm thử' } as User;
  const created: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    customers = new CustomersService(prisma);
    auth = new AuthService(prisma, new JwtService({ secret: 'test-secret' }));
  });
  afterAll(async () => {
    await prisma.loyaltyTransaction.deleteMany({ where: { userId: { in: created } } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    await prisma.$disconnect();
  });

  async function newCustomer() {
    const email = `cus-${randomUUID().slice(0, 8)}@brewlite.test`;
    const c = await customers.create({ fullName: 'Khách kiểm thử', email, password: 'Matkhau123' }, manager);
    created.push(c.id);
    return { ...c, email };
  }

  it('khoá thì không đăng nhập được và thấy lý do; mở khoá thì đăng nhập lại và có thông báo', async () => {
    const c = await newCustomer();
    await customers.lock(c.id, { reason: 'promo-abuse', note: 'Dùng 5 tài khoản phụ' }, manager);

    await expect(auth.login({ email: c.email, password: 'Matkhau123' })).rejects.toThrow(ForbiddenException);
    await expect(auth.login({ email: c.email, password: 'Matkhau123' })).rejects.toThrow('Lạm dụng mã giảm giá hoặc điểm thưởng. Dùng 5 tài khoản phụ');
    // Sai mật khẩu thì không lộ chuyện tài khoản đang bị khoá
    await expect(auth.login({ email: c.email, password: 'Sai12345678' })).rejects.toThrow('Email hoặc mật khẩu không đúng');

    const after = await customers.unlock(c.id, { reason: 'mistake' }, manager);
    expect(after.lockedAt).toBeNull();
    expect(after.accountLogs.map((l) => l.action)).toEqual(['UNLOCK', 'LOCK']);
    expect(after.accountLogs[0]).toMatchObject({ reason: 'Tài khoản bị khoá nhầm', byName: manager.fullName });

    await expect(auth.login({ email: c.email, password: 'Matkhau123' })).resolves.toHaveProperty('accessToken');
    const titles = (await prisma.notification.findMany({ where: { userId: c.id }, orderBy: { createdAt: 'desc' } })).map((n) => n.title);
    expect(titles.slice(0, 2)).toEqual(['Tài khoản của bạn đã được mở khoá', 'Tài khoản của bạn đã bị tạm khoá']);
  });

  it('khoá hai lần cùng lúc chỉ ghi một lần; mở khoá tài khoản đang mở thì báo lỗi', async () => {
    const c = await newCustomer();
    const results = await Promise.allSettled([customers.lock(c.id, { reason: 'behavior' }, manager), customers.lock(c.id, { reason: 'behavior' }, manager)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.accountLog.count({ where: { userId: c.id } })).toBe(1);

    await customers.unlock(c.id, { reason: 'resolved' }, manager);
    await expect(customers.unlock(c.id, { reason: 'resolved' }, manager)).rejects.toThrow(ConflictException);
  });

  it('tìm theo số điện thoại (gõ có dấu cách), lọc đang khoá, SĐT trùng bị từ chối', async () => {
    const phone = `09${String(Date.now()).slice(-8)}`;
    const email = `cus-${randomUUID().slice(0, 8)}@brewlite.test`;
    const c = await customers.create({ fullName: 'Khách có số', email, phone, password: 'Matkhau123' }, manager);
    created.push(c.id);
    const list = { status: 'all', sort: 'new', page: 1, size: 10 } as const;

    const found = await customers.findAll({ ...list, q: `${phone.slice(0, 4)} ${phone.slice(4, 7)}` });
    expect(found.items.map((x) => x.id)).toContain(c.id);
    expect((await customers.findAll({ ...list, status: 'locked', q: phone })).total).toBe(0);
    await customers.lock(c.id, { reason: 'behavior' }, manager);
    expect((await customers.findAll({ ...list, status: 'locked', q: phone })).items[0].id).toBe(c.id);

    await expect(customers.create({ fullName: 'Trùng số', email: `x-${email}`, phone, password: 'Matkhau123' }, manager)).rejects.toThrow('Số điện thoại này đã có tài khoản');
  });

  it('không khoá được tài khoản nhân viên, quản lý', async () => {
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: 'staff@brewlite.vn' } });
    await expect(customers.lock(staff.id, { reason: 'behavior' }, manager)).rejects.toThrow(NotFoundException);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: staff.id } })).lockedAt).toBeNull();
  });
});

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { WELCOME_POINTS } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueViolation } from '../prisma/prisma-errors';
import type { CreateCustomerDto, ListCustomersDto, LockCustomerDto, UnlockCustomerDto } from './dto';
import { LOCK_REASONS, UNLOCK_REASONS, reasonText } from './reasons';

/** Các cột trả về cho quản lý: không bao giờ kèm passwordHash */
const PUBLIC = { id: true, fullName: true, email: true, phone: true, loyaltyPoints: true, createdAt: true, lockedAt: true, lockReason: true } satisfies Prisma.UserSelect;

/**
 * Quản lý tài khoản khách: xem, thêm, khoá, mở khoá. Không có xoá: khoá là đủ để chặn,
 * còn đơn hàng, điểm, lịch sử thanh toán của khách vẫn giữ nguyên để đối soát.
 * Mọi câu lệnh đều kèm điều kiện role = CUSTOMER nên không đụng được tài khoản nhân viên, quản lý.
 */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Một trang danh sách khách. Lọc, tìm, cắt trang đều làm trong CSDL nên nhiều khách vẫn nhẹ.
   * Kèm số đếm cho các ô Tất cả / Hoạt động / Đang khoá / Mới 30 ngày (không phụ thuộc bộ lọc).
   */
  async findAll(dto: ListCustomersDto) {
    const where: Prisma.UserWhereInput = { role: 'CUSTOMER' };
    if (dto.status === 'locked') where.lockedAt = { not: null };
    if (dto.status === 'active') where.lockedAt = null;
    const q = dto.q?.trim();
    if (q) {
      const or: Prisma.UserWhereInput[] = [{ fullName: { contains: q, mode: 'insensitive' } }, { email: { contains: q.toLowerCase() } }];
      // Gõ số (kể cả có dấu cách, chấm) thì tìm theo số điện thoại
      const digits = q.replace(/[\s.-]/g, '');
      if (/^\d{3,}$/.test(digits)) or.push({ phone: { contains: digits } });
      where.OR = or;
    }
    const monthAgo = new Date(Date.now() - 30 * 86_400_000);
    const base = { role: 'CUSTOMER' as const };
    const [items, total, all, locked, fresh] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: PUBLIC,
        orderBy: dto.sort === 'name' ? [{ fullName: 'asc' }, { id: 'asc' }] : [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (dto.page - 1) * dto.size,
        take: dto.size,
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: base }),
      this.prisma.user.count({ where: { ...base, lockedAt: { not: null } } }),
      this.prisma.user.count({ where: { ...base, createdAt: { gte: monthAgo } } }),
    ]);
    return { items, total, page: dto.page, size: dto.size, counts: { all, active: all - locked, locked, fresh } };
  }

  /** Chi tiết một khách kèm lịch sử khoá / mở khoá */
  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
      select: { ...PUBLIC, accountLogs: { orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, action: true, reason: true, byName: true, createdAt: true } } },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản khách này');
    return user;
  }

  /** Quản lý tạo tài khoản khách; khách cũng được quà chào mừng như khi tự đăng ký */
  async create(dto: CreateCustomerDto, by: User) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          phone: dto.phone ?? null,
          fullName: dto.fullName,
          passwordHash,
          role: 'CUSTOMER',
          loyaltyPoints: WELCOME_POINTS,
          loyaltyLogs: { create: { delta: WELCOME_POINTS, reason: 'Quà chào mừng thành viên mới' } },
          notifications: {
            create: {
              title: 'Chào mừng bạn đến với BrewLite',
              body: `Tài khoản được ${by.fullName} tạo giúp tại cửa hàng, kèm ${WELCOME_POINTS.toLocaleString('vi-VN')} điểm chào mừng. Bạn nên đổi mật khẩu sau lần đăng nhập đầu tiên.`,
            },
          },
        },
        select: { id: true },
      });
      return this.findOne(user.id);
    } catch (err) {
      if (isUniqueViolation(err)) {
        const target = String((err as { meta?: { target?: unknown } }).meta?.target ?? '');
        throw new ConflictException(target.includes('phone') ? 'Số điện thoại này đã có tài khoản' : 'Email này đã có tài khoản');
      }
      throw err;
    }
  }

  async lock(id: string, dto: LockCustomerDto, by: User) {
    const reason = reasonText(LOCK_REASONS, dto.reason, dto.note);
    if (!reason) throw new BadRequestException('Ghi rõ lý do khoá');
    await this.prisma.$transaction(async (tx) => {
      // Điều kiện "đang mở" nằm trong câu UPDATE: hai quản lý bấm cùng lúc cũng chỉ một lần khoá được ghi
      const res = await tx.user.updateMany({ where: { id, role: 'CUSTOMER', lockedAt: null }, data: { lockedAt: new Date(), lockReason: reason } });
      if (res.count === 0) await this.explainMiss(tx, id, 'Tài khoản này đang bị khoá rồi');
      await tx.accountLog.create({ data: { userId: id, action: 'LOCK', reason, byName: by.fullName } });
      // Khách đang bị khoá chưa đọc được, nhưng sau khi mở khoá vẫn thấy lại trong lịch sử thông báo
      await tx.notification.create({ data: { userId: id, title: 'Tài khoản của bạn đã bị tạm khoá', body: `Lý do: ${reason}` } });
    });
    return this.findOne(id);
  }

  async unlock(id: string, dto: UnlockCustomerDto, by: User) {
    const reason = reasonText(UNLOCK_REASONS, dto.reason, dto.note);
    if (!reason) throw new BadRequestException('Ghi rõ lý do mở khoá');
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.user.updateMany({ where: { id, role: 'CUSTOMER', lockedAt: { not: null } }, data: { lockedAt: null, lockReason: null } });
      if (res.count === 0) await this.explainMiss(tx, id, 'Tài khoản này đang không bị khoá');
      await tx.accountLog.create({ data: { userId: id, action: 'UNLOCK', reason, byName: by.fullName } });
      await tx.notification.create({ data: { userId: id, title: 'Tài khoản của bạn đã được mở khoá', body: `Lý do: ${reason}. Bạn có thể đăng nhập và đặt món lại bình thường.` } });
    });
    return this.findOne(id);
  }

  /** Không cập nhật được dòng nào: hoặc không có khách này, hoặc trạng thái đã đúng như yêu cầu */
  private async explainMiss(tx: Prisma.TransactionClient, id: string, conflict: string): Promise<never> {
    const exists = await tx.user.count({ where: { id, role: 'CUSTOMER' } });
    if (!exists) throw new NotFoundException('Không tìm thấy tài khoản khách này');
    throw new ConflictException(conflict);
  }
}

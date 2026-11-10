import { randomBytes } from 'crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueViolation } from '../prisma/prisma-errors';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import { REWARDS } from './rewards';

export const WELCOME_POINTS = 1250;

/** Trùng email hay trùng số điện thoại: đọc tên cột trong lỗi UNIQUE của Prisma */
function uniqueMessage(err: unknown, fallback: string) {
  const target = String((err as { meta?: { target?: unknown } }).meta?.target ?? '');
  return target.includes('phone') ? 'Số điện thoại này đã được dùng cho tài khoản khác' : fallback;
}
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) throw new BadRequestException('Mật khẩu xác nhận không khớp');
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          phone: dto.phone ?? null,
          fullName: dto.fullName,
          passwordHash,
          loyaltyPoints: WELCOME_POINTS,
          loyaltyLogs: { create: { delta: WELCOME_POINTS, reason: 'Quà chào mừng thành viên mới' } },
          notifications: { create: { title: `Bạn được tặng ${WELCOME_POINTS.toLocaleString('vi-VN')} điểm`, body: 'Quà chào mừng thành viên mới. Dùng điểm để trả cho đơn hoặc đổi quà ở trang Tài khoản.' } },
        },
      });
      return this.session(user);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(uniqueMessage(err, 'Email này đã được dùng để đăng ký'));
      throw err;
    }
  }

  /**
   * Đổi mật khẩu (mọi vai trò). Ghi thời điểm đổi: mọi token cấp trước đó hết hiệu lực ở request kế tiếp,
   * nên tài khoản dùng chung ở quầy đổi mật khẩu là người đã nghỉ bị đăng xuất khỏi mọi máy.
   * Trả về token mới để máy đang đổi vẫn đăng nhập.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) throw new BadRequestException('Mật khẩu xác nhận không khớp');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    if (dto.currentPassword === dto.newPassword) throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS), passwordChangedAt: new Date() },
    });
    return this.session(updated);
  }

  /** Khách tự sửa số điện thoại (null là xoá số) */
  async updateProfile(userId: string, phone: string | null) {
    try {
      await this.prisma.user.update({ where: { id: userId }, data: { phone } });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Số điện thoại này đã có tài khoản khác dùng');
      throw err;
    }
    return this.profile(userId);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Cùng một thông báo cho "sai email" và "sai mật khẩu" để không lộ email nào đã đăng ký
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    // Chỉ báo bị khoá sau khi đúng mật khẩu, để người lạ không dò được tài khoản nào đang bị khoá
    if (user.lockedAt) {
      throw new ForbiddenException(`Tài khoản của bạn đang bị tạm khoá. Lý do: ${user.lockReason ?? 'không ghi'}. Cần hỗ trợ, hãy gửi góp ý ở trang Liên hệ.`);
    }
    return this.session(user);
  }

  /** Thông tin tài khoản trả về client: không bao giờ kèm passwordHash */
  async profile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { loyaltyLogs: { orderBy: { createdAt: 'desc' }, take: 30 } },
    });
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      points: user.loyaltyPoints,
      pointsLog: user.loyaltyLogs.map((l) => ({ id: l.id, at: l.createdAt, label: l.reason, delta: l.delta })),
    };
  }

  /** Đổi điểm lấy quà. Trừ điểm có điều kiện "còn đủ điểm" ngay trong câu UPDATE nên bấm liên tục cũng không âm điểm. */
  async redeem(userId: string, rewardId: string) {
    const reward = REWARDS.find((r) => r.id === rewardId);
    if (!reward) throw new BadRequestException('Quà không tồn tại');
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.user.updateMany({
        where: { id: userId, loyaltyPoints: { gte: reward.cost } },
        data: { loyaltyPoints: { decrement: reward.cost } },
      });
      if (res.count === 0) throw new BadRequestException('Bạn chưa đủ điểm để đổi quà này');
      await tx.loyaltyTransaction.create({ data: { userId, delta: -reward.cost, reason: `Đổi quà: ${reward.name}` } });
      // Mã quà gửi vào thông báo để khách đọc cho nhân viên ở quầy
      const code = randomBytes(3).toString('hex').toUpperCase();
      await tx.notification.create({
        data: { userId, title: `Đã đổi quà: ${reward.name}`, body: `Mã quà của bạn là ${code}. Đọc mã này cho nhân viên ở quầy để nhận quà.` },
      });
    });
    return this.profile(userId);
  }

  private async session(user: User) {
    // pwt: dấu của lần đổi mật khẩu gần nhất; đổi mật khẩu thì dấu đổi, mọi token cũ không còn khớp (JwtStrategy)
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, pwt: user.passwordChangedAt?.getTime() ?? 0 });
    return { accessToken, user: await this.profile(user.id) };
  }
}

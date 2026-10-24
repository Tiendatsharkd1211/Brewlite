import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueViolation } from '../prisma/prisma-errors';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { REWARDS } from './rewards';

/** Số điểm tặng khi đăng ký tài khoản mới */
export const WELCOME_POINTS = 1250;
const BCRYPT_ROUNDS = 10;

/** Service xử lý logic xác thực, phân quyền và quản lý tài khoản */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Đăng ký tài khoản: hash mật khẩu, tặng điểm chào mừng và khởi tạo phiên đăng nhập */
  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) throw new BadRequestException('Mật khẩu xác nhận không khớp');
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          fullName: dto.fullName,
          passwordHash,
          loyaltyPoints: WELCOME_POINTS,
          loyaltyLogs: { create: { delta: WELCOME_POINTS, reason: 'Quà chào mừng thành viên mới' } },
        },
      });
      return this.session(user);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Email này đã được dùng để đăng ký');
      throw err;
    }
  }

  /** Đăng nhập: kiểm tra email & mật khẩu bằng bcrypt, trả về JWT và profile */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Cùng một thông báo cho "sai email" và "sai mật khẩu" để không lộ email nào đã đăng ký
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return this.session(user);
  }

  /** Lấy thông tin tài khoản và 30 giao dịch điểm gần nhất (không kèm passwordHash) */
  async profile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { loyaltyLogs: { orderBy: { createdAt: 'desc' }, take: 30 } },
    });
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
      points: user.loyaltyPoints,
      pointsLog: user.loyaltyLogs.map((l) => ({ id: l.id, at: l.createdAt, label: l.reason, delta: l.delta })),
    };
  }

  /** Đổi điểm lấy quà: trừ điểm bằng transaction có điều kiện (gte) để tránh âm điểm khi spam */
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
    });
    return this.profile(userId);
  }

  /** Tạo JWT access token và trả kèm thông tin profile của user */
  private async session(user: User) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken, user: await this.profile(user.id) };
  }
}


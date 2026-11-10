import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

const DEV_JWT_SECRET = 'brewlite-dev-secret-chi-dung-khi-phat-trien';
/** Các chuỗi mẫu từng ghi trong .env.example, docker-compose: ai cũng biết nên không được dùng thật */
const KNOWN_PLACEHOLDERS = [DEV_JWT_SECRET, 'doi-chuoi-nay-thanh-mot-chuoi-bi-mat-dai', 'doi-chuoi-nay-khi-trien-khai-that'];

/**
 * Khoá ký JWT. Ai có khoá này là tự tạo được token đăng nhập vào bất kỳ tài khoản nào,
 * nên khi chạy thật (NODE_ENV=production) thiếu khoá, khoá ngắn hoặc khoá mẫu thì API từ chối khởi động.
 */
export function jwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (process.env.NODE_ENV !== 'production') return secret || DEV_JWT_SECRET;
  if (!secret || secret.length < 32 || KNOWN_PLACEHOLDERS.includes(secret)) {
    throw new Error('JWT_SECRET phải là chuỗi ngẫu nhiên dài ít nhất 32 ký tự khi chạy production');
  }
  return secret;
}

/** Passport đọc header "Authorization: Bearer <token>", kiểm chữ ký rồi gọi validate() */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(config),
    });
  }

  /** Giá trị trả về được gắn vào request.user */
  async validate(payload: { sub: string; pwt?: number }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại');
    // Token cấp trước lần đổi mật khẩu gần nhất mang dấu cũ: hết hiệu lực (so khớp chính xác, không có khoảng lệch)
    if ((payload.pwt ?? 0) !== (user.passwordChangedAt?.getTime() ?? 0)) {
      throw new UnauthorizedException('Mật khẩu đã được đổi, vui lòng đăng nhập lại');
    }
    // Bị khoá giữa chừng: token cũ hết tác dụng ngay ở request kế tiếp, trình duyệt tự đăng xuất
    if (user.lockedAt) throw new UnauthorizedException('Tài khoản đã bị tạm khoá');
    return user;
  }
}

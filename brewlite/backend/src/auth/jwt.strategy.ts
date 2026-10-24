import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

/** Secret mặc định cho môi trường dev khi chưa cấu hình JWT_SECRET trong .env */
export const DEV_JWT_SECRET = 'brewlite-dev-secret-chi-dung-khi-phat-trien';

/**
 * Strategy xác thực JWT qua header "Authorization: Bearer <token>"
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // Trích xuất JWT từ Authorization header (Bearer token)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? DEV_JWT_SECRET,
    });
  }

  /** Kiểm tra user trong DB từ payload token; giá trị trả về sẽ gắn vào request.user */
  async validate(payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại');
    return user;
  }
}



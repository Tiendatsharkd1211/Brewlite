import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export const DEV_JWT_SECRET = 'brewlite-dev-secret-chi-dung-khi-phat-trien';

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
      secretOrKey: config.get<string>('JWT_SECRET') ?? DEV_JWT_SECRET,
    });
  }

  /** Giá trị trả về được gắn vào request.user */
  async validate(payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại');
    return user;
  }
}

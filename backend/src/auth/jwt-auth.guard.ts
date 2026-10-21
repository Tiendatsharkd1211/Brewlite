import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Gắn @UseGuards(JwtAuthGuard) lên route cần đăng nhập (dùng JwtStrategy của Passport) */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException('Bạn cần đăng nhập, hoặc phiên đăng nhập đã hết hạn');
    }
    return user;
  }
}

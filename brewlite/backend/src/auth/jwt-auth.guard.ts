import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard bảo vệ các route yêu cầu đăng nhập bằng JWT.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /** Xử lý kết quả xác thực: ném lỗi tiếng Việt nếu chưa đăng nhập hoặc token hết hạn */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException('Bạn cần đăng nhập, hoặc phiên đăng nhập đã hết hạn');
    }
    return user;
  }
}



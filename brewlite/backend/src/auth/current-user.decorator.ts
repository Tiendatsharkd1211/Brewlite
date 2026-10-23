import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';

/** Lấy tài khoản đang đăng nhập (JwtStrategy.validate trả về) */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
  return ctx.switchToHttp().getRequest<{ user: User }>().user;
});

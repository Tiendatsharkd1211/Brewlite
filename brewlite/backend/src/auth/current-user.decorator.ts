import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';

/**
 * Custom decorator lấy thông tin người dùng hiện tại từ Request.
 * Giá trị user do JwtStrategy.validate() gán vào sau khi xác thực token thành công.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
  return ctx.switchToHttp().getRequest<{ user: User }>().user;
});



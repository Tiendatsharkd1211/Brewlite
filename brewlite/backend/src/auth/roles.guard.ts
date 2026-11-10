import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role, User } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

/**
 * Chạy sau JwtAuthGuard. Vai trò lấy từ CSDL (JwtStrategy.validate đọc lại tài khoản mỗi request),
 * không lấy từ token, nên đổi hay thu hồi quyền có hiệu lực ngay.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest<{ user?: User }>().user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền dùng chức năng này');
    }
    return true;
  }
}

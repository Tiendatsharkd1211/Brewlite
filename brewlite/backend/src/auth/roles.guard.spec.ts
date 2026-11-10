import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

/** Dựng ExecutionContext giả: route yêu cầu `required`, người gọi có vai trò `role` */
function ctxFor(required: Role[] | undefined, role?: Role): [RolesGuard, ExecutionContext] {
  const reflector = { getAllAndOverride: () => required } as unknown as Reflector;
  const ctx = {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  } as unknown as ExecutionContext;
  return [new RolesGuard(reflector), ctx];
}

describe('RolesGuard', () => {
  it('cho qua route không yêu cầu vai trò', () => {
    const [guard, ctx] = ctxFor(undefined, 'CUSTOMER');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('cho nhân viên quầy gọi API của quầy', () => {
    const [guard, ctx] = ctxFor(['STAFF'], 'STAFF');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('chặn khách gọi API của quầy (403)', () => {
    const [guard, ctx] = ctxFor(['STAFF'], 'CUSTOMER');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('chặn khi không có tài khoản trên request', () => {
    const [guard, ctx] = ctxFor(['STAFF']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});

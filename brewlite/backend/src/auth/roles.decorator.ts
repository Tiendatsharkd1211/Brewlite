import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Gắn lên route cần vai trò cụ thể, dùng kèm JwtAuthGuard và RolesGuard */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

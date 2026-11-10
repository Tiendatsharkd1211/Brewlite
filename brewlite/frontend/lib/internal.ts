import type { Role } from './types';

/** Các trang nội bộ (quầy pha chế, quản lý cửa hàng): không dùng đầu trang, chân trang của khách */
export const isInternalPath = (pathname: string) => /^\/(staff|quan-ly)(\/|$)/.test(pathname);

/** Một trang đăng nhập chung cho mọi vai trò; đăng nhập xong tự chuyển theo vai trò (homeOf) */
export const INTERNAL_LOGIN = '/login';

/** Trang mặc định sau khi đăng nhập theo vai trò */
export function homeOf(role: Role): string {
  return role === 'MANAGER' ? '/quan-ly' : role === 'STAFF' ? '/staff' : '/';
}

/** Vai trò có được vào đường dẫn nội bộ này không */
export function canOpen(role: Role, path: string): boolean {
  if (path.startsWith('/quan-ly')) return role === 'MANAGER';
  if (path.startsWith('/staff')) return role === 'STAFF';
  return true;
}

export const ROLE_LABEL: Record<Role, string> = { CUSTOMER: 'Khách hàng', STAFF: 'Nhân viên quầy', MANAGER: 'Quản lý' };

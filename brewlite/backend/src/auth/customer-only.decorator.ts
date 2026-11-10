import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

/**
 * API chỉ dành cho khách (đặt đơn, thanh toán, lịch sử, món yêu thích, đổi điểm).
 * Tài khoản nhân viên, quản lý đăng nhập được nhưng gọi các API này nhận 403:
 * tài khoản nội bộ không dùng để mua hàng, tránh lẫn đơn thật với đơn của người trong quán.
 */
export const CustomerOnly = () => applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles('CUSTOMER'));

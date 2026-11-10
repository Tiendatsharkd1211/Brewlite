import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** GET /notifications/me: thông báo của tài khoản đang đăng nhập */
  @Get('me')
  findMine(@CurrentUser() user: User) {
    return this.notifications.findMine(user.id);
  }

  /** POST /notifications/read-all: đánh dấu đã đọc hết (khai báo trước ':id') */
  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser() user: User) {
    return this.notifications.markAllRead(user.id);
  }

  /** POST /notifications/:id/read: đánh dấu đã đọc một thông báo */
  @Post(':id/read')
  @HttpCode(200)
  markRead(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(user.id, id);
  }
}

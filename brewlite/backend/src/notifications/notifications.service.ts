import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Thông báo của từng tài khoản. Thông báo về đơn được tạo trong moveOrderStatus (cùng transaction với việc đổi trạng thái). */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 30 thông báo mới nhất kèm số chưa đọc */
  async findMine(userId: string) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unread };
  }

  /** Chỉ đánh dấu được thông báo của chính mình (điều kiện userId nằm ngay trong câu UPDATE) */
  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
    return this.findMine(userId);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return this.findMine(userId);
  }
}

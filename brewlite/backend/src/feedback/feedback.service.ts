import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import type { UpdateFeedbackDto } from './dto/update-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lưu góp ý; trả về mã ngắn để khách nhắc lại khi cần */
  async create(dto: CreateFeedbackDto) {
    const row = await this.prisma.feedback.create({ data: dto, select: { id: true, createdAt: true } });
    return { ref: row.id.slice(0, 8).toUpperCase(), createdAt: row.createdAt };
  }

  /** 50 góp ý mới nhất cho nhân viên */
  findLatest() {
    return this.prisma.feedback.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  /** Quản lý đổi trạng thái xử lý (mới / đang xử lý / đã xong) hoặc ghi chú nội bộ */
  async update(id: string, dto: UpdateFeedbackDto) {
    const res = await this.prisma.feedback.updateMany({ where: { id }, data: { ...dto, updatedAt: new Date() } });
    if (res.count === 0) throw new NotFoundException('Không tìm thấy góp ý này');
    return this.prisma.feedback.findUniqueOrThrow({ where: { id } });
  }
}

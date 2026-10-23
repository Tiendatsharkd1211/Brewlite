import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  // Giữ lại route mặc định để test có sẵn của NestJS không bị hỏng
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // GET /health: kiểm tra backend và kết nối PostgreSQL (trang Hello của Task 1)
  @Get('health')
  async health() {
    let db = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return { status: 'ok', message: 'Hello from BrewLite API', db };
  }
}

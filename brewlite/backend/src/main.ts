import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Ảnh món tải lên đi kèm JSON (tối đa ~1 MB sau khi mã hoá); mọi request khác vẫn nhỏ
  app.useBodyParser('json', { limit: '2mb' });

  // Header bảo mật (chặn nhúng iframe, đoán kiểu file, lộ tên framework...)
  app.use(helmet());

  // Cho phép frontend (khác cổng) gọi API
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  });

  // Validate toàn cục: mọi DTO ở các task sau tự được kiểm tra
  // whitelist: bỏ trường lạ; forbidNonWhitelisted: báo 400 nếu có trường lạ
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`BrewLite API chạy tại http://localhost:${port}`);
}
bootstrap();

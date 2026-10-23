import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('GET / trả về "Hello World!"', () => {
    expect(appController.getHello()).toBe('Hello World!');
  });

  it('GET /health báo backend và CSDL đều chạy', async () => {
    await expect(appController.health()).resolves.toEqual({ status: 'ok', message: 'Hello from BrewLite API', db: 'up' });
  });
});

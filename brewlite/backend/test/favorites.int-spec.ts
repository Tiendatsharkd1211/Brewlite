import { NotFoundException } from '@nestjs/common';
import { FavoritesService } from '../src/favorites/favorites.service';
import { createFixture, createServices } from './helpers';

// Món yêu thích lưu theo tài khoản trên PostgreSQL thật
describe('Món yêu thích theo tài khoản (PostgreSQL thật)', () => {
  let s: Awaited<ReturnType<typeof createServices>>;
  let favorites: FavoritesService;
  beforeAll(async () => {
    s = await createServices();
    favorites = new FavoritesService(s.prisma);
  });
  afterAll(async () => {
    await s.prisma.$disconnect();
  });

  it('lưu hai lần vẫn chỉ một dòng, bỏ thì mất; món không có thì báo 404', async () => {
    const fx = await createFixture(s.prisma, 5);
    try {
      expect(await favorites.add(fx.user.id, fx.product.id)).toEqual([fx.product.id]);
      expect(await favorites.add(fx.user.id, fx.product.id)).toEqual([fx.product.id]);
      await expect(favorites.add(fx.user.id, 'khong-co-mon-nay')).rejects.toBeInstanceOf(NotFoundException);
      expect(await favorites.remove(fx.user.id, fx.product.id)).toEqual([]);
    } finally {
      await fx.cleanup();
    }
  });

  it('mỗi người một danh sách riêng, không bỏ được món của người khác', async () => {
    const a = await createFixture(s.prisma, 5);
    const b = await createFixture(s.prisma, 5);
    try {
      await favorites.add(a.user.id, a.product.id);
      expect(await favorites.findMine(b.user.id)).toEqual([]);
      await favorites.remove(b.user.id, a.product.id);
      expect(await favorites.findMine(a.user.id)).toEqual([a.product.id]);
    } finally {
      await a.cleanup();
      await b.cleanup();
    }
  });
});

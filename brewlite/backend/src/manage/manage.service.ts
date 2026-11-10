import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Voucher } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueViolation } from '../prisma/prisma-errors';
import type { BulkProductsDto, CreateProductDto, SaveVoucherDto, SiteContentDto, UpdateProductDto } from './dto';

/** yyyy-mm-dd theo giờ Việt Nam -> đầu ngày / cuối ngày */
const startOfDay = (d: string) => (d ? new Date(`${d}T00:00:00+07:00`) : null);
const endOfDay = (d: string) => (d ? new Date(`${d}T23:59:59.999+07:00`) : null);
const toDay = (d: Date | null) => (d ? new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10) : '');

/** Bảng Voucher -> dạng giao diện dùng (title, ngày yyyy-mm-dd) */
export function voucherView(v: Voucher) {
  const { label, startsAt, endsAt, ...rest } = v;
  return { ...rest, title: label, startsAt: toDay(startsAt), endsAt: toDay(endsAt) };
}

/** "Cà phê muối" -> "ca-phe-muoi" */
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const DEFAULT_CONTENT = {
  heroKicker: 'Cà phê kiểu Sài Gòn xưa',
  heroTitle: 'Ly phin chậm rãi ngày xưa, nay đặt trước khỏi chờ',
  heroCaption: 'Bàn gỗ, ghế đệm, sàn gạch bông và tiếng phin nhỏ giọt, như một quán quen của Sài Gòn những năm 80.',
  heroLead: 'Đặt món trên điện thoại trước khi ra khỏi nhà, tới quầy là có ly. Mỗi 1.000đ bạn được tích 1 điểm, dùng để đổi bánh, nâng size hoặc trừ thẳng vào đơn sau.',
  heroImage: '1571851534298-1ffa72eab79e',
  notice: { on: false, text: 'Tuần này: cà phê muối giảm 10% cho đơn đặt trước 9 giờ sáng.', href: '/menu' },
  promo: { code: 'VNPAY20', badge: '−20%', title: 'Trả qua VNPay, giảm 20% mỗi đơn', text: 'Giảm tới 25.000đ cho mỗi đơn trả bằng thẻ ATM, thẻ quốc tế hoặc QR.' },
};

/**
 * Nghiệp vụ khu Quản lý cửa hàng ảnh hưởng tới khách: thực đơn (ẩn, báo hết, sửa, thêm món),
 * mã giảm giá, nội dung trang. Mọi thay đổi ghi thẳng CSDL nên phía khách thấy ngay và tải lại trang không mất.
 */
@Injectable()
export class ManageService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Thực đơn ----------

  /** Tất cả món kể cả món ẩn, kèm cờ hidden / soldOut và số tồn thật */
  async products() {
    const rows = await this.prisma.product.findMany({ include: { toppings: { orderBy: { price: 'asc' } } }, orderBy: { sold: 'desc' } });
    return rows.map(({ version: _v, ...p }) => p);
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    if (Object.keys(dto).length === 0) throw new BadRequestException('Không có gì để lưu');
    const res = await this.prisma.product.updateMany({ where: { id }, data: dto });
    if (res.count === 0) throw new NotFoundException(`Không tìm thấy món ${id}`);
    return this.product(id);
  }

  async bulkProducts(dto: BulkProductsDto) {
    const { ids, ...patch } = dto;
    if (!ids.length || Object.keys(patch).length === 0) throw new BadRequestException('Chọn món và thao tác cần làm');
    const res = await this.prisma.product.updateMany({ where: { id: { in: ids } }, data: patch });
    return { updated: res.count };
  }

  /** Món mới: lấy ảnh, màu, topping mẫu của một món cùng nhóm để hiện được ngay; quản lý sửa sau */
  async createProduct(dto: CreateProductDto) {
    const id = slug(dto.name);
    if (id.length < 2) throw new BadRequestException('Tên món cần có chữ hoặc số');
    const same = await this.prisma.product.findFirst({ where: { category: dto.category }, include: { toppings: true } });
    const food = dto.category === 'banh-ngot';
    try {
      await this.prisma.product.create({
        data: {
          id,
          name: dto.name,
          description: '',
          price: dto.price,
          imageUrl: same?.imageUrl ?? '1495474472287-4d71bcdd2085',
          stock: dto.stock ?? 100,
          category: dto.category,
          kind: food ? 'food' : 'drink',
          tag: 'new',
          rating: 5,
          hasIce: !food,
          color: same?.color ?? '#8a5634',
          keywords: [],
          toppings: { connect: (same?.toppings ?? []).map((t) => ({ id: t.id })) },
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Đã có món trùng tên');
      throw err;
    }
    return this.product(id);
  }

  private async product(id: string) {
    const { version: _v, ...p } = await this.prisma.product.findUniqueOrThrow({ where: { id }, include: { toppings: { orderBy: { price: 'asc' } } } });
    return p;
  }

  // ---------- Mã giảm giá ----------

  async vouchers() {
    return (await this.prisma.voucher.findMany({ orderBy: { code: 'asc' } })).map(voucherView);
  }

  /** Mã khách thấy trên trang Ưu đãi: đang bật, cho hiện, còn trong thời hạn */
  async publicVouchers() {
    const now = new Date();
    const rows = await this.prisma.voucher.findMany({
      where: { active: true, showOnSite: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      orderBy: { code: 'asc' },
    });
    return rows.map(voucherView);
  }

  /** Tạo mới (original rỗng) hoặc sửa mã `original`. Không đổi được mã đã có người dùng. */
  async saveVoucher(dto: SaveVoucherDto, original?: string) {
    const startsAt = startOfDay(dto.startsAt);
    const endsAt = endOfDay(dto.endsAt);
    if (startsAt && endsAt && endsAt < startsAt) throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    if (dto.type === 'PERCENT' && dto.percent < 1) throw new BadRequestException('Phần trăm giảm từ 1 đến 100');
    const data: Prisma.VoucherUncheckedCreateInput = {
      code: dto.code,
      type: dto.type,
      label: dto.title,
      terms: dto.terms,
      percent: dto.type === 'PERCENT' ? dto.percent : 0,
      maxDiscount: dto.type === 'PERCENT' ? dto.maxDiscount : 0,
      minOrder: dto.minOrder,
      requiredMethod: dto.requiredMethod,
      requiresDelivery: dto.requiresDelivery,
      usageLimit: dto.usageLimit,
      active: dto.active,
      showOnSite: dto.showOnSite,
      startsAt,
      endsAt,
    };
    try {
      if (!original) return voucherView(await this.prisma.voucher.create({ data }));
      const old = await this.prisma.voucher.findUnique({ where: { code: original } });
      if (!old) throw new NotFoundException(`Không tìm thấy mã ${original}`);
      if (old.code !== dto.code && old.usedCount > 0) throw new ConflictException(`Mã ${original} đã có ${old.usedCount} lượt dùng, không đổi tên mã được`);
      if (dto.usageLimit !== null && dto.usageLimit < old.usedCount) throw new BadRequestException(`Mã đã dùng ${old.usedCount} lượt, giới hạn phải từ ${old.usedCount} trở lên`);
      return voucherView(await this.prisma.voucher.update({ where: { code: original }, data }));
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(`Đã có mã ${dto.code}`);
      throw err;
    }
  }

  async setVoucherActive(code: string, active: boolean) {
    const res = await this.prisma.voucher.updateMany({ where: { code }, data: { active } });
    if (res.count === 0) throw new NotFoundException(`Không tìm thấy mã ${code}`);
    return voucherView(await this.prisma.voucher.findUniqueOrThrow({ where: { code } }));
  }

  /** Chỉ xoá được mã chưa ai dùng (đơn cũ còn ghi mã); mã đã dùng thì tạm dừng */
  async removeVoucher(code: string) {
    const res = await this.prisma.voucher.deleteMany({ where: { code, usedCount: 0 } });
    if (res.count === 0) {
      const v = await this.prisma.voucher.findUnique({ where: { code } });
      if (!v) throw new NotFoundException(`Không tìm thấy mã ${code}`);
      throw new ConflictException(`Mã ${code} đã có ${v.usedCount} lượt dùng, chỉ tạm dừng được, không xoá được`);
    }
    return { removed: code };
  }

  // ---------- Nội dung trang ----------

  async content() {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: 'content' } });
    return { ...DEFAULT_CONTENT, ...((row?.value as object | undefined) ?? {}) };
  }

  async saveContent(dto: SiteContentDto) {
    const value = JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonValue;
    await this.prisma.siteSetting.upsert({ where: { key: 'content' }, update: { value }, create: { key: 'content', value } });
    return this.content();
  }
}

import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export const CATEGORIES = ['truyen-thong', 'pha-may', 'tra-da-xay', 'banh-ngot'] as const;

/**
 * Ảnh món: link https, mã ảnh Unsplash, hoặc ảnh tải lên dạng data URL JPG/PNG/WEBP.
 * Không nhận SVG (có thể chứa mã độc), "javascript:" hay link http thường.
 */
export const IMAGE_RULE = /^(https:\/\/[^\s"'<>]+|[A-Za-z0-9-]{8,40}|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/;
const IMAGE_MSG = 'Ảnh phải là link https, mã ảnh Unsplash hoặc tệp JPG, PNG, WEBP';

// ---------- Thực đơn ----------

export class UpdateProductDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 60, { message: 'Tên món từ 2 đến 60 ký tự' })
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120, { message: 'Câu giới thiệu tối đa 120 ký tự' })
  tagline?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(600, { message: 'Mô tả tối đa 600 ký tự' })
  description?: string;

  @IsOptional()
  @IsInt({ message: 'Giá phải là số nguyên' })
  @Min(1000, { message: 'Giá tối thiểu 1.000đ' })
  @Max(1_000_000, { message: 'Giá tối đa 1.000.000đ' })
  price?: number;

  @IsOptional()
  @IsIn(CATEGORIES, { message: 'Nhóm món không hợp lệ' })
  category?: (typeof CATEGORIES)[number];

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsIn(['hot', 'new'], { message: 'Nhãn chỉ là hot, new hoặc bỏ trống' })
  tag?: 'hot' | 'new' | null;

  @IsOptional()
  @IsString()
  @MaxLength(1_500_000, { message: 'Ảnh quá lớn, tối đa khoảng 1 MB' })
  @Matches(IMAGE_RULE, { message: IMAGE_MSG })
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  keywords?: string[];

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsBoolean()
  soldOut?: boolean;
}

export class CreateProductDto {
  @Transform(trim)
  @IsString()
  @Length(2, 60, { message: 'Tên món từ 2 đến 60 ký tự' })
  name!: string;

  @IsInt({ message: 'Giá phải là số nguyên' })
  @Min(1000, { message: 'Giá tối thiểu 1.000đ' })
  @Max(1_000_000, { message: 'Giá tối đa 1.000.000đ' })
  price!: number;

  @IsIn(CATEGORIES, { message: 'Nhóm món không hợp lệ' })
  category!: (typeof CATEGORIES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  stock?: number;
}

/** Ẩn / hiện / báo hết / mở bán nhiều món một lúc */
export class BulkProductsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsBoolean()
  soldOut?: boolean;
}

// ---------- Mã giảm giá ----------

const DATE = /^(\d{4}-\d{2}-\d{2})?$/;

export class SaveVoucherDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9]{3,20}$/, { message: 'Mã gồm 3–20 chữ cái không dấu hoặc số' })
  code!: string;

  @IsIn(['PERCENT', 'FREESHIP'], { message: 'Loại mã không hợp lệ' })
  type!: 'PERCENT' | 'FREESHIP';

  @Transform(trim)
  @IsString()
  @Length(3, 80, { message: 'Tiêu đề từ 3 đến 80 ký tự' })
  title!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(300, { message: 'Điều kiện tối đa 300 ký tự' })
  terms!: string;

  @IsInt()
  @Min(0)
  @Max(100, { message: 'Phần trăm giảm từ 1 đến 100' })
  percent!: number;

  @IsInt()
  @Min(0, { message: 'Giảm tối đa không được âm' })
  @Max(1_000_000)
  maxDiscount!: number;

  @IsInt()
  @Min(0, { message: 'Đơn tối thiểu không được âm' })
  @Max(10_000_000)
  minOrder!: number;

  @ValidateIf((_o, v) => v !== null)
  @IsIn(['VNPAY', 'POINTS'], { message: 'Phương thức thanh toán không hợp lệ' })
  requiredMethod!: 'VNPAY' | 'POINTS' | null;

  @IsBoolean()
  requiresDelivery!: boolean;

  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(1, { message: 'Giới hạn lượt tối thiểu là 1, hoặc bỏ trống nếu không giới hạn' })
  @Max(1_000_000)
  usageLimit!: number | null;

  @IsBoolean()
  active!: boolean;

  @IsBoolean()
  showOnSite!: boolean;

  @Matches(DATE, { message: 'Ngày bắt đầu dạng yyyy-mm-dd' })
  startsAt!: string;

  @Matches(DATE, { message: 'Ngày kết thúc dạng yyyy-mm-dd' })
  endsAt!: string;
}

export class VoucherActiveDto {
  @IsBoolean()
  active!: boolean;
}

// ---------- Nội dung trang khách ----------

class NoticeDto {
  @IsBoolean()
  on!: boolean;

  @Transform(trim)
  @IsString()
  @MaxLength(160, { message: 'Dải thông báo tối đa 160 ký tự' })
  text!: string;

  /** Chỉ cho link nội bộ (bắt đầu bằng /) để không dẫn khách sang trang lạ */
  @Matches(/^\/[A-Za-z0-9\-/?=&#._]*$/, { message: 'Link của dải thông báo phải là trang trong BrewLite, bắt đầu bằng /' })
  href!: string;
}

class PromoDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9]{3,20}$/, { message: 'Mã quảng bá không hợp lệ' })
  code!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(12)
  badge!: string;

  @Transform(trim)
  @IsString()
  @Length(3, 80)
  title!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(200)
  text!: string;
}

export class SiteContentDto {
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  heroKicker!: string;

  @Transform(trim)
  @IsString()
  @Length(3, 120, { message: 'Tiêu đề trang nhất từ 3 đến 120 ký tự' })
  heroTitle!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(240)
  heroCaption!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(400)
  heroLead!: string;

  @IsString()
  @MaxLength(1_500_000, { message: 'Ảnh quá lớn, tối đa khoảng 1 MB' })
  @Matches(IMAGE_RULE, { message: IMAGE_MSG })
  heroImage!: string;

  @ValidateNested()
  @Type(() => NoticeDto)
  notice!: NoticeDto;

  @ValidateNested()
  @Type(() => PromoDto)
  promo!: PromoDto;
}

import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { LEVELS } from '../pricing';

/** VNPAY: trả qua cổng VNPay (sandbox). POINTS: trừ điểm BrewLite. */
export const PAYMENT_METHODS = ['VNPAY', 'POINTS'] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

/** Một dòng giỏ hàng. Chỉ gửi lựa chọn, KHÔNG gửi giá: giá do backend tính từ CSDL. */
export class OrderItemDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsIn(['S', 'M', 'L'], { message: 'Size phải là S, M hoặc L' })
  size?: 'S' | 'M' | 'L' | null;

  @IsOptional()
  @IsIn(LEVELS, { message: 'Mức đường phải là 0, 30, 50 hoặc 100' })
  sugar?: number | null;

  @IsOptional()
  @IsIn(LEVELS, { message: 'Mức đá phải là 0, 30, 50 hoặc 100' })
  ice?: number | null;

  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  toppingIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Ghi chú tối đa 120 ký tự' })
  note?: string;

  @IsInt()
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  @Max(20, { message: 'Số lượng tối đa 20 cho mỗi dòng' })
  qty!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Giỏ hàng đang trống' })
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsIn(['PICKUP', 'DELIVERY'])
  fulfillment!: 'PICKUP' | 'DELIVERY';

  @IsString()
  @MaxLength(40)
  pickupTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsIn(PAYMENT_METHODS, { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod!: PaymentMethodValue;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  voucherCode?: string;
}

import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';
import { OrderItemDto, PAYMENT_METHODS, type PaymentMethodValue } from './create-order.dto';

/**
 * Báo giá trước khi đặt (trang thanh toán gọi mỗi khi giỏ, cách nhận, phương thức, mã đổi):
 * máy chủ tính giá, mã giảm giá, còn hàng không. Không ghi gì vào CSDL.
 */
export class QuoteOrderDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsIn(['PICKUP', 'DELIVERY'])
  fulfillment!: 'PICKUP' | 'DELIVERY';

  @IsOptional()
  @IsIn(PAYMENT_METHODS, { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod?: PaymentMethodValue;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  voucherCode?: string;
}

/** Quầy huỷ đơn đã thanh toán (chưa pha): bắt buộc ghi lý do, gửi cho khách */
export class StaffCancelDto {
  @IsString()
  @Length(3, 200, { message: 'Ghi lý do huỷ từ 3 đến 200 ký tự' })
  reason!: string;
}

import { IsIn, IsOptional, IsString } from 'class-validator';
import { PAYMENT_METHODS, PaymentMethodValue } from '../../orders/dto/create-order.dto';

export class CreatePaymentDto {
  @IsString()
  orderId!: string;

  @IsIn(PAYMENT_METHODS, { message: 'Phương thức thanh toán không hợp lệ' })
  method!: PaymentMethodValue;

  /** Chỉ để demo: "fail" để xem nhánh PAYMENT_FAILED */
  @IsOptional()
  @IsIn(['success', 'fail'])
  simulate?: 'success' | 'fail';
}

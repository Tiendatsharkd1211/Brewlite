import { IsIn, IsString } from 'class-validator';
import { PAYMENT_METHODS, PaymentMethodValue } from '../../orders/dto/create-order.dto';

export class CreatePaymentDto {
  @IsString()
  orderId!: string;

  @IsIn(PAYMENT_METHODS, { message: 'Phương thức thanh toán không hợp lệ' })
  method!: PaymentMethodValue;
}

import { IsInt, Max, Min } from 'class-validator';
import { TOPUP_MAX, TOPUP_MIN } from '../wallet-rules';

/** POST /wallets/:id/topup: nạp thêm tiền vào tài khoản ảo */
export class TopupDto {
  @IsInt({ message: 'Số tiền nạp phải là số nguyên' })
  @Min(TOPUP_MIN, { message: `Mỗi lần nạp tối thiểu ${TOPUP_MIN.toLocaleString('vi-VN')}đ` })
  @Max(TOPUP_MAX, { message: `Mỗi lần nạp tối đa ${TOPUP_MAX.toLocaleString('vi-VN')}đ` })
  amount!: number;
}

import { Transform } from 'class-transformer';
import { Matches, ValidateIf } from 'class-validator';
import { PHONE_MESSAGE, PHONE_RE } from '../../common/phone';

/** Khách tự sửa số điện thoại; gửi chuỗi rỗng hoặc null để xoá số */
export class UpdateProfileDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s.-]/g, '') || null : value))
  @ValidateIf((_o, v) => v !== null)
  @Matches(PHONE_RE, { message: PHONE_MESSAGE })
  phone!: string | null;
}

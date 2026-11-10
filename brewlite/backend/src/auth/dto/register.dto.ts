import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { normalizePhone, PHONE_MESSAGE, PHONE_RE } from '../../common/phone';

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Họ tên cần ít nhất 2 ký tự' })
  @MaxLength(60, { message: 'Họ tên tối đa 60 ký tự' })
  fullName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  /** Không bắt buộc; quản lý dùng để tìm khách */
  @Transform(normalizePhone)
  @IsOptional()
  @Matches(PHONE_RE, { message: PHONE_MESSAGE })
  phone?: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu cần ít nhất 8 ký tự' })
  @MaxLength(64, { message: 'Mật khẩu tối đa 64 ký tự' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, { message: 'Mật khẩu cần có cả chữ và số' })
  password!: string;

  @IsString()
  confirmPassword!: string;
}

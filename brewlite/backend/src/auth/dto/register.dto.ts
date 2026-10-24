import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** DTO đăng ký tài khoản mới: kiểm tra hợp lệ họ tên, email và mật khẩu */
export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Họ tên cần ít nhất 2 ký tự' })
  @MaxLength(60, { message: 'Họ tên tối đa 60 ký tự' })
  fullName!: string;

  /** Chuẩn hóa email về chữ thường và cắt khoảng trắng */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  /** Mật khẩu tối thiểu 8 ký tự, phải gồm cả chữ và số */
  @IsString()
  @MinLength(8, { message: 'Mật khẩu cần ít nhất 8 ký tự' })
  @MaxLength(64, { message: 'Mật khẩu tối đa 64 ký tự' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, { message: 'Mật khẩu cần có cả chữ và số' })
  password!: string;

  /** Mật khẩu xác nhận (so sánh khớp với password trong AuthService) */
  @IsString()
  confirmPassword!: string;
}



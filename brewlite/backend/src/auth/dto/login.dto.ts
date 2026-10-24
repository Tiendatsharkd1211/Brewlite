import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

/** DTO đăng nhập: chuẩn hóa email và kiểm tra tính hợp lệ của dữ liệu đầu vào */
export class LoginDto {
  /** Chuẩn hóa trim và lowercase trước khi kiểm tra định dạng email */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Nhập mật khẩu' })
  password!: string;
}



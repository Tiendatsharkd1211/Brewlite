import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Nhập mật khẩu hiện tại' })
  @MaxLength(64)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới cần ít nhất 8 ký tự' })
  @MaxLength(64, { message: 'Mật khẩu mới tối đa 64 ký tự' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, { message: 'Mật khẩu mới cần có cả chữ và số' })
  newPassword!: string;

  @IsString()
  confirmPassword!: string;
}

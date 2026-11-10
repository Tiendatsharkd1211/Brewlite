import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { LOCK_REASONS, UNLOCK_REASONS, type LockReason, type UnlockReason } from './reasons';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Quản lý tạo tài khoản cho khách (ví dụ khách quen ở quầy). Khách đăng nhập bằng mật khẩu này rồi tự đổi sau. */
export class CreateCustomerDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Họ tên cần ít nhất 2 ký tự' })
  @MaxLength(60, { message: 'Họ tên tối đa 60 ký tự' })
  fullName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  /** Bỏ khoảng trắng, dấu chấm, gạch; để trống thì không lưu */
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s.-]/g, '') || undefined : value))
  @IsOptional()
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0' })
  phone?: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu cần ít nhất 8 ký tự' })
  @MaxLength(64, { message: 'Mật khẩu tối đa 64 ký tự' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, { message: 'Mật khẩu cần có cả chữ và số' })
  password!: string;
}

export class LockCustomerDto {
  @IsIn(Object.keys(LOCK_REASONS), { message: 'Hãy chọn lý do khoá' })
  reason!: LockReason;

  /** Ghi chú gửi kèm cho khách; bắt buộc khi chọn "Lý do khác" */
  @Transform(trim)
  @ValidateIf((o: LockCustomerDto) => o.reason === 'other' || (o.note ?? '') !== '')
  @Length(5, 300, { message: 'Ghi rõ lý do, từ 5 đến 300 ký tự' })
  @IsString({ message: 'Ghi rõ lý do, từ 5 đến 300 ký tự' })
  note?: string;
}

export class UnlockCustomerDto {
  @IsIn(Object.keys(UNLOCK_REASONS), { message: 'Hãy chọn lý do mở khoá' })
  reason!: UnlockReason;

  @Transform(trim)
  @ValidateIf((o: UnlockCustomerDto) => o.reason === 'other' || (o.note ?? '') !== '')
  @Length(5, 300, { message: 'Ghi rõ lý do, từ 5 đến 300 ký tự' })
  @IsString({ message: 'Ghi rõ lý do, từ 5 đến 300 ký tự' })
  note?: string;
}

/** Bộ lọc và phân trang danh sách khách: GET /staff/customers?q=&status=&sort=&page=&size= */
export class ListCustomersDto {
  /** Tìm trong họ tên, email, số điện thoại */
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsIn(['all', 'active', 'locked'])
  status: 'all' | 'active' | 'locked' = 'all';

  @IsOptional()
  @IsIn(['new', 'name'])
  sort: 'new' | 'name' = 'new';

  /** Trang tính từ 1 */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @IsIn([10, 20, 50])
  size = 10;
}

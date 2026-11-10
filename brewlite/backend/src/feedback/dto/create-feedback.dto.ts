import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { FEEDBACK_TOPICS } from '../topics';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateFeedbackDto {
  @Transform(trim)
  @IsString()
  @Length(2, 80, { message: 'Họ tên từ 2 đến 80 ký tự' })
  name!: string;

  @Transform(trim)
  @IsEmail({}, { message: 'Email chưa đúng định dạng' })
  @MaxLength(120)
  email!: string;

  @IsIn(FEEDBACK_TOPICS, { message: 'Chủ đề không hợp lệ' })
  topic!: (typeof FEEDBACK_TOPICS)[number];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() || undefined : value))
  @Matches(/^BL\d{6}$/, { message: 'Mã đơn có dạng BL và 6 chữ số, ví dụ BL123456' })
  orderCode?: string;

  @Transform(trim)
  @IsString()
  @Length(10, 2000, { message: 'Nội dung từ 10 đến 2.000 ký tự' })
  message!: string;
}

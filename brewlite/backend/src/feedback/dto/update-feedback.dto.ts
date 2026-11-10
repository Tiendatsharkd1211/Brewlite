import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFeedbackDto {
  @IsOptional()
  @IsIn(['new', 'doing', 'done'], { message: 'Trạng thái không hợp lệ' })
  status?: 'new' | 'doing' | 'done';

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000, { message: 'Ghi chú tối đa 1.000 ký tự' })
  note?: string;
}

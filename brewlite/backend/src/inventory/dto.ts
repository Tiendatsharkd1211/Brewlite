import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsString, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export const GROUPS = ['ca-phe', 'sua', 'tra', 'duong', 'banh', 'bao-bi'] as const;

/** Thêm / sửa nguyên liệu (kể cả số tồn; sửa tay không ghi lịch sử) */
export class SaveIngredientDto {
  @Transform(trim)
  @IsString()
  @Length(2, 60, { message: 'Tên nguyên liệu từ 2 đến 60 ký tự' })
  name!: string;

  @IsIn(GROUPS, { message: 'Nhóm nguyên liệu không hợp lệ' })
  group!: (typeof GROUPS)[number];

  @Transform(trim)
  @IsString()
  @Length(1, 12, { message: 'Đơn vị nhập từ 1 đến 12 ký tự' })
  unit!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 12, { message: 'Đơn vị pha chế từ 1 đến 12 ký tự' })
  sub!: string;

  @IsNumber({}, { message: 'Hệ số đổi phải là số' })
  @Min(0.001, { message: 'Hệ số đổi phải lớn hơn 0' })
  @Max(100_000)
  per!: number;

  @IsNumber({}, { message: 'Tồn kho phải là số' })
  @Min(0, { message: 'Tồn kho không được âm' })
  @Max(1_000_000)
  stock!: number;

  @IsNumber({}, { message: 'Mức tối thiểu phải là số' })
  @Min(0, { message: 'Mức tối thiểu không được âm' })
  @Max(1_000_000)
  min!: number;

  @IsInt({ message: 'Giá vốn phải là số nguyên' })
  @Min(0, { message: 'Giá vốn không được âm' })
  @Max(100_000_000)
  cost!: number;
}

class ReceiptLineDto {
  @IsString()
  @Matches(/^[a-z0-9-]{1,60}$/)
  ingredientId!: string;

  @IsNumber({}, { message: 'Số lượng nhập phải là số' })
  @Min(0.001, { message: 'Số lượng nhập phải lớn hơn 0' })
  @Max(100_000, { message: 'Số lượng nhập quá lớn' })
  qty!: number;

  @IsInt({ message: 'Giá mua phải là số nguyên' })
  @Min(0, { message: 'Giá mua không được âm' })
  @Max(100_000_000)
  price!: number;
}

export class CreateReceiptDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Phiếu nhập cần ít nhất một nguyên liệu' })
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineDto)
  lines!: ReceiptLineDto[];

  @Transform(trim)
  @IsString()
  @MaxLength(300, { message: 'Ghi chú tối đa 300 ký tự' })
  note!: string;
}

class RecipeLineDto {
  @IsString()
  @Matches(/^[a-z0-9-]{1,60}$/)
  ingredientId!: string;

  @IsNumber({}, { message: 'Định lượng phải là số' })
  @Min(0.001, { message: 'Định lượng phải lớn hơn 0' })
  @Max(10_000, { message: 'Định lượng quá lớn' })
  amount!: number;
}

export class SaveRecipeDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Công thức cần ít nhất một nguyên liệu' })
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => RecipeLineDto)
  lines!: RecipeLineDto[];
}

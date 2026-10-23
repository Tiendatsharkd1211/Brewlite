import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { WALLET_PROVIDERS, WalletProvider } from '../wallet-rules';

/** POST /wallets: liên kết một tài khoản ảo (ví điện tử hoặc thẻ) */
export class LinkWalletDto {
  @IsIn(WALLET_PROVIDERS, { message: 'Loại ví/thẻ không hợp lệ' })
  provider!: WalletProvider;

  /** Số điện thoại đăng ký ví, hoặc số thẻ 16 chữ số */
  @IsString()
  @MaxLength(30)
  accountNumber!: string;

  /** Tên chủ tài khoản; bỏ trống thì lấy họ tên của tài khoản BrewLite */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Tên chủ tài khoản cần ít nhất 2 ký tự' })
  @MaxLength(60, { message: 'Tên chủ tài khoản tối đa 60 ký tự' })
  holderName?: string;
}

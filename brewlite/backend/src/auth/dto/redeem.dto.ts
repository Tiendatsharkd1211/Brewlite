import { IsIn } from 'class-validator';
import { REWARDS } from '../rewards';

/** DTO đổi điểm lấy quà: kiểm tra mã quà hợp lệ trong danh mục phần thưởng */
export class RedeemDto {
  /** ID phần thưởng muốn đổi (phải tồn tại trong danh sách REWARDS) */
  @IsIn(REWARDS.map((r) => r.id), { message: 'Quà không tồn tại' })
  rewardId!: string;
}


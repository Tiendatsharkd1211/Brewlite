import { IsIn } from 'class-validator';
import { REWARDS } from '../rewards';

export class RedeemDto {
  @IsIn(REWARDS.map((r) => r.id), { message: 'Quà không tồn tại' })
  rewardId!: string;
}

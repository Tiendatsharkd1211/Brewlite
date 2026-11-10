import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RedeemDto } from './dto/redeem.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CustomerOnly } from './customer-only.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/register: tạo tài khoản (bcrypt), trả token đăng nhập luôn. Tối đa 10 lần/phút mỗi IP */
  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /** POST /auth/login: trả JWT. Tối đa 10 lần/phút mỗi IP để chống dò mật khẩu */
  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** GET /auth/me: tài khoản đang đăng nhập, kèm điểm tích luỹ */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return this.auth.profile(user.id);
  }

  /** PATCH /auth/me: khách tự sửa số điện thoại */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto.phone);
  }

  /** POST /auth/change-password: đổi mật khẩu, đăng xuất mọi máy khác; tối đa 10 lần/phút mỗi IP (chống dò mật khẩu cũ) */
  @Post('change-password')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }

  /** POST /auth/redeem: đổi điểm lấy quà */
  @Post('redeem')
  @HttpCode(200)
  @CustomerOnly()
  redeem(@CurrentUser() user: User, @Body() dto: RedeemDto) {
    return this.auth.redeem(user.id, dto.rewardId);
  }
}

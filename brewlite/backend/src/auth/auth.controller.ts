import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RedeemDto } from './dto/redeem.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

/** Controller xử lý các API liên quan đến xác thực và thông tin tài khoản */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/register: Đăng ký tài khoản mới và trả về token đăng nhập */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /** POST /auth/login: Đăng nhập bằng email và mật khẩu, trả về JWT */
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** GET /auth/me: Lấy thông tin tài khoản đang đăng nhập và lịch sử điểm */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return this.auth.profile(user.id);
  }

  /** POST /auth/redeem: Đổi điểm tích lũy lấy quà */
  @Post('redeem')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  redeem(@CurrentUser() user: User, @Body() dto: RedeemDto) {
    return this.auth.redeem(user.id, dto.rewardId);
  }
}


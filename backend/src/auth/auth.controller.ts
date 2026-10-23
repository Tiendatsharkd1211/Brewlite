import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RedeemDto } from './dto/redeem.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/register: tạo tài khoản (bcrypt), trả token đăng nhập luôn */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /** POST /auth/login: trả JWT */
  @Post('login')
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

  /** POST /auth/redeem: đổi điểm lấy quà */
  @Post('redeem')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  redeem(@CurrentUser() user: User, @Body() dto: RedeemDto) {
    return this.auth.redeem(user.id, dto.rewardId);
  }
}

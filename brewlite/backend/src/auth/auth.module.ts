import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DEV_JWT_SECRET, JwtStrategy } from './jwt.strategy';

/** Module cấu hình xác thực JWT, Passport và khai báo controller/providers cho Auth */
@Module({
  imports: [
    PassportModule,
    // Cấu hình JwtModule bất đồng bộ để đọc JWT_SECRET từ ConfigService
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? DEV_JWT_SECRET,
        signOptions: { expiresIn: 60 * 60 * 24 * 7 }, // Token có thời hạn 7 ngày
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}


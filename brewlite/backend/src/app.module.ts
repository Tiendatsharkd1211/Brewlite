import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { PromotionsModule } from './promotions/promotions.module';
import { CustomersModule } from './customers/customers.module';
import { ManageModule } from './manage/manage.module';
import { InventoryModule } from './inventory/inventory.module';
import { FavoritesModule } from './favorites/favorites.module';
import { FeedbackModule } from './feedback/feedback.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    // Đọc file .env, dùng được ở mọi module
    ConfigModule.forRoot({ isGlobal: true }),
    // Mỗi địa chỉ IP tối đa 300 request/phút cho mọi API; đăng nhập, đăng ký, đổi mật khẩu chặt hơn (10 lần/phút, xem AuthController).
    // 300 chứ không thấp hơn: khi demo, các cửa sổ khách, quầy, quản lý trên cùng một máy dùng chung một IP và tự làm mới định kỳ.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 300 }],
      errorMessage: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút',
    }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    PromotionsModule,
    OrdersModule,
    PaymentsModule,
    StaffModule,
    NotificationsModule,
    FavoritesModule,
    FeedbackModule,
    CustomersModule,
    ManageModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

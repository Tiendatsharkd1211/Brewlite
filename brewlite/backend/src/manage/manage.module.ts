import { Module } from '@nestjs/common';
import { ManageController, PublicContentController } from './manage.controller';
import { ManageService } from './manage.service';

@Module({
  controllers: [PublicContentController, ManageController],
  providers: [ManageService],
})
export class ManageModule {}

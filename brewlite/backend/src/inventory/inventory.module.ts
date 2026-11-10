import { Module } from '@nestjs/common';
import { InventoryAlertsController, InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  // Alerts khai báo trước để GET /staff/inventory/alerts không bị route khác bắt nhầm
  controllers: [InventoryAlertsController, InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}

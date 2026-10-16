import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import {
  PlatformActivity,
  PlatformActivitySchema,
} from './schemas/platform-activity.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Signal, SignalSchema } from '../signals/schemas/signal.schema';
import {
  AdminNotificationLog,
  AdminNotificationLogSchema,
} from '../alerts/schemas/admin-notification-log.schema';
import {
  DataIntegration,
  DataIntegrationSchema,
} from '../market-data/schemas/data-integration.schema';
import { MarketDataModule } from '../market-data/market-data.module';
import { SignalsModule } from '../signals/signals.module';
import { StockScannerModule } from '../stock-scanner/stock-scanner.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlatformActivity.name, schema: PlatformActivitySchema },
      { name: User.name, schema: UserSchema },
      { name: Signal.name, schema: SignalSchema },
      { name: AdminNotificationLog.name, schema: AdminNotificationLogSchema },
      { name: DataIntegration.name, schema: DataIntegrationSchema },
    ]),
    MarketDataModule,
    SignalsModule,
    StockScannerModule,
    AuthModule,
  ],
  controllers: [DashboardController, AdminDashboardController],
  providers: [DashboardService, AdminDashboardService],
  exports: [DashboardService, AdminDashboardService],
})
export class DashboardModule {}

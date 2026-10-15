import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { MarketDataModule } from '../market-data/market-data.module';
import { SignalsModule } from '../signals/signals.module';
import { StockScannerModule } from '../stock-scanner/stock-scanner.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MarketDataModule,
    SignalsModule,
    StockScannerModule,
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}


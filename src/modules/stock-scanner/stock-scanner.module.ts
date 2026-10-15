import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StockScannerController } from './stock-scanner.controller';
import { StockScannerService } from './stock-scanner.service';
import { MarketDataModule } from '../market-data/market-data.module';
import { SignalsModule } from '../signals/signals.module';
import { AuthModule } from '../auth/auth.module';
import { ScannerPreset, ScannerPresetSchema } from './schemas/scanner-preset.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScannerPreset.name, schema: ScannerPresetSchema },
    ]),
    MarketDataModule,
    SignalsModule,
    AuthModule,
  ],
  controllers: [StockScannerController],
  providers: [StockScannerService],
  exports: [StockScannerService],
})
export class StockScannerModule {}

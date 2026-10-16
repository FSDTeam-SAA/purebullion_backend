import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SignalsController } from './signals.controller';
import { AdminSignalsController } from './admin-signals.controller';
import { SignalsService } from './signals.service';
import { Signal, SignalSchema } from './schemas/signal.schema';
import { MarketDataModule } from '../market-data/market-data.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Signal.name, schema: SignalSchema }]),
    MarketDataModule,
    AuthModule,
  ],
  controllers: [SignalsController, AdminSignalsController],
  providers: [SignalsService],
  exports: [SignalsService, MongooseModule],
})

export class SignalsModule {}

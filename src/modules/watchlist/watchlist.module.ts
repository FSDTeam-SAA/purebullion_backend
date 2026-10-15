import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';
import { WatchlistItem, WatchlistItemSchema } from './schemas/watchlist-item.schema';
import { MarketDataModule } from '../market-data/market-data.module';
import { SignalsModule } from '../signals/signals.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WatchlistItem.name, schema: WatchlistItemSchema },
    ]),
    MarketDataModule,
    SignalsModule,
    AuthModule,
  ],
  controllers: [WatchlistController],
  providers: [WatchlistService],
  exports: [WatchlistService],
})

export class WatchlistModule {}


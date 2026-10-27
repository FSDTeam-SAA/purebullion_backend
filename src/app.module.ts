import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configs from './config';
import { LoggerModule } from './common/logger/logger.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { CommunityModule } from './modules/community/community.module';
import { SupportModule } from './modules/support/support.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { SignalsModule } from './modules/signals/signals.module';
import { StockScannerModule } from './modules/stock-scanner/stock-scanner.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { NewsModule } from './modules/news/news.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AnnouncementModule } from './modules/announcement/announcement.module';
import { AiDataModule } from './modules/ai-data/ai-data.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infrastructure/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: '.env',
    }),

    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('app.rateLimitWindow', 15) * 60 * 1000,
          limit: configService.get<number>('app.rateLimitMax', 100),
        },
      ],
      inject: [ConfigService],
    }),

    LoggerModule,
    DatabaseModule,
    AuthModule,
    UserModule,
    SubscriptionModule,
    CommunityModule,
    SupportModule,
    MarketDataModule,
    SignalsModule,
    StockScannerModule,
    DashboardModule,
    WatchlistModule,
    NewsModule,
    AlertsModule,
    AnnouncementModule,
    AiDataModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})

export class AppModule {}

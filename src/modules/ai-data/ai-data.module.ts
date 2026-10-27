import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import aiDataConfig from './ai-data.config';
import { AiDataController } from './ai-data.controller';
import { AiDataService } from './ai-data.service';
import { TwelveDataClient } from './twelve-data.client';
import { ServiceTokenGuard } from './guards/service-token.guard';
import { Signal, SignalSchema } from '../signals/schemas/signal.schema';
import {
  NewsArticle,
  NewsArticleSchema,
} from '../news/schemas/news-article.schema';

// Internal data API for the purebullion-ai service (/api/v1/internal/ai).
// Read-only; reuses the existing Signal and NewsArticle models (same collections).

@Module({
  imports: [
    ConfigModule.forFeature(aiDataConfig),
    MongooseModule.forFeature([
      { name: Signal.name, schema: SignalSchema },
      { name: NewsArticle.name, schema: NewsArticleSchema },
    ]),
  ],
  controllers: [AiDataController],
  providers: [AiDataService, TwelveDataClient, ServiceTokenGuard],
})
export class AiDataModule {}

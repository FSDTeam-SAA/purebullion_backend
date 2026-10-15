import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import {
  NewsArticle,
  NewsArticleSchema,
} from './schemas/news-article.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NewsArticle.name, schema: NewsArticleSchema },
    ]),
    AuthModule,
  ],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}


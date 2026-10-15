import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NewsArticleDocument = NewsArticle & Document;

export enum NewsCategory {
  ALL = 'all',
  TECHNOLOGY = 'technology',
  STOCKS = 'stocks',
  ETFS = 'etfs',
  ECONOMY = 'economy',
  EDUCATION = 'education',
}

@Schema({ timestamps: true, collection: 'news_articles' })
export class NewsArticle {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  summary: string;

  @Prop({ default: '' })
  content: string;

  @Prop({ required: true, default: 'Reuters' })
  source: string; // 'Reuters', 'Bloomberg', 'TechCrunch', 'PureBullion Desk', etc.

  @Prop({
    required: true,
    enum: ['all', 'technology', 'stocks', 'etfs', 'economy', 'education'],
    default: 'stocks',
    index: true,
  })
  category: string;

  @Prop({ default: '' })
  imageUrl: string;

  @Prop({ type: [String], default: [], index: true })
  relatedSymbols: string[]; // e.g. ['NVDA'], ['TSLA'], ['AAPL']

  @Prop({ default: '' })
  url: string;

  @Prop({ default: 'PureBullion Research Desk' })
  author: string;

  @Prop({ default: '3 min read' })
  readTime: string;

  @Prop({ default: Date.now, index: true })
  publishedAt: Date;

  @Prop({ default: false })
  isDeskPublication: boolean;

  @Prop({ default: 0 })
  viewsCount: number;
}

export const NewsArticleSchema = SchemaFactory.createForClass(NewsArticle);

NewsArticleSchema.index({ category: 1, publishedAt: -1 });
NewsArticleSchema.index({ title: 'text', summary: 'text' });


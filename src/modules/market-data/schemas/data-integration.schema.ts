import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DataIntegrationDocument = DataIntegration & Document;

@Schema({ timestamps: true, collection: 'data_integrations' })
export class DataIntegration {
  @Prop({ required: true, trim: true })
  service: string; // e.g. 'Market Data', 'News Feed', 'AI Assistant', 'Stripe Payments', 'Email Dispatcher'

  @Prop({ required: true, trim: true, default: 'Primary data provider' })
  provider: string; // e.g. 'Twelve Data', 'Primary data provider', 'OpenAI', 'Stripe', 'SMTP Mailer'

  @Prop({
    required: true,
    enum: ['market_data', 'news_feed', 'ai', 'payments', 'email'],
    default: 'market_data',
    index: true,
  })
  category: string;

  @Prop({
    required: true,
    enum: ['Active', 'Suspended'],
    default: 'Active',
    index: true,
  })
  connection: string; // 'Active' (green) | 'Suspended' (red)

  @Prop({
    required: true,
    enum: ['Live', 'Degraded', 'Offline'],
    default: 'Live',
  })
  dataStatus: string; // 'Live'

  @Prop({ default: '42 ms' })
  latency: string; // e.g. '42 ms'

  @Prop({ default: 'None' })
  recentErrors: string; // e.g. 'None', 'Rate limit 429'

  @Prop({ default: Date.now, index: true })
  lastSync: Date;

  @Prop({ type: Object, default: {} })
  config: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DataIntegrationSchema =
  SchemaFactory.createForClass(DataIntegration);

DataIntegrationSchema.index({ category: 1, createdAt: -1 });
DataIntegrationSchema.index({ connection: 1 });
DataIntegrationSchema.index({ service: 'text', provider: 'text' });

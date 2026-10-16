import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationTemplateDocument = NotificationTemplate & Document;

@Schema({ timestamps: true, collection: 'notification_templates' })
export class NotificationTemplate {
  @Prop({ required: true, trim: true })
  name: string; // e.g. 'Trade Signal Dispatch', 'Market Condition Alert'

  @Prop({
    required: true,
    enum: ['signals', 'market', 'community', 'system'],
    default: 'signals',
    index: true,
  })
  category: string;

  @Prop({ required: true, default: 'email' })
  channel: string; // 'email', 'push', 'in-platform', 'all'

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  bodyTemplate: string;

  @Prop({ type: [String], default: [] })
  variables: string[]; // e.g. ['symbol', 'entryPrice', 'targetPrice', 'stopLoss']

  @Prop({ default: true })
  isActive: boolean;
}

export const NotificationTemplateSchema =
  SchemaFactory.createForClass(NotificationTemplate);


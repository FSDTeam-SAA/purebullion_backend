import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AnnouncementDocument = Announcement & Document;

@Schema({ timestamps: true, collection: 'announcements' })
export class Announcement {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({
    required: true,
    enum: ['feature_release', 'scanner_update', 'market_alert', 'maintenance', 'general'],
    default: 'scanner_update',
    index: true,
  })
  type: string;

  @Prop({ type: [String], default: ['all'] })
  targetTiers: string[]; // ['all'] or ['free', 'pro', 'elite']

  @Prop({
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  priority: string;

  @Prop({ default: true, index: true })
  isPublished: boolean;

  @Prop({ default: Date.now, index: true })
  publishedAt: Date;

  @Prop({ type: Date, default: null })
  expiresAt: Date | null;

  @Prop({ default: 'PureBullion Admin' })
  author: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ default: 0 })
  viewsCount: number;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);

AnnouncementSchema.index({ isPublished: 1, publishedAt: -1 });
AnnouncementSchema.index({ title: 'text', message: 'text' });


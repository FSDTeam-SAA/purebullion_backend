import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class CommunityPost {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  author: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, index: true, trim: true })
  topic: string; // e.g. 'signals', 'education', 'market-discussion', 'platform-help', etc.

  @Prop({ type: [String], default: [] })
  media: string[];

  @Prop({ enum: ['image', 'video', 'audio', 'none'], default: 'none' })
  mediaType: string;

  @Prop({ default: 0, index: true })
  likesCount: number;

  @Prop({ default: 0, index: true })
  repliesCount: number;

  @Prop({ default: 0 })
  viewsCount: number;

  @Prop({ default: false, index: true })
  isReported: boolean;

  @Prop({ default: 0 })
  reportCount: number;

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({
    enum: ['active', 'hidden', 'deleted'],
    default: 'active',
    index: true,
  })
  status: string;
}

export const CommunityPostSchema = SchemaFactory.createForClass(CommunityPost);
export type CommunityPostDocument = HydratedDocument<CommunityPost>;

CommunityPostSchema.index({ status: 1, topic: 1, createdAt: -1 });
CommunityPostSchema.index({ status: 1, likesCount: -1, repliesCount: -1 });


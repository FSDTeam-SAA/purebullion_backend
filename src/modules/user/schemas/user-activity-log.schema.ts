import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserActivityLogDocument = UserActivityLog & Document;

@Schema({ timestamps: true, collection: 'user_activity_logs' })
export class UserActivityLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string; // e.g. 'Logged in', 'Viewed security', 'Updated watchlist', 'Created alert', 'AI conversation', 'Viewed article', 'Community reply'

  @Prop({ required: true, trim: true })
  detail: string; // e.g. 'Web · Chrome on macOS', 'NVDA · Nasdaq', 'Added META, removed GOOGL', 'AAPL · Alert when > $190'

  @Prop({ default: 'gray' })
  dotColor: string; // 'green' | 'gray' | 'yellow' | 'blue' | 'purple'

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserActivityLogSchema =
  SchemaFactory.createForClass(UserActivityLog);

UserActivityLogSchema.index({ user: 1, createdAt: -1 });


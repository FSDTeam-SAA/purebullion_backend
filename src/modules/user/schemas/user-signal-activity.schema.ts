import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserSignalActivityDocument = UserSignalActivity & Document;

@Schema({ timestamps: true, collection: 'user_signal_activities' })
export class UserSignalActivity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true, uppercase: true, trim: true })
  symbol: string; // e.g. 'NVDA', 'AAPL', 'META', 'TSLA'

  @Prop({ default: 'Momentum' })
  strategy: string; // 'Breakout' | 'Momentum' | 'Reversal'

  @Prop({ default: 'Bullish' })
  sentiment: string; // 'Bullish' | 'Bearish'

  @Prop({ default: 'Viewed' })
  actionTaken: string; // 'Followed' | 'Viewed' | 'Alert Set'

  @Prop({ default: () => new Date().toISOString().split('T')[0] })
  activityDate: string; // '2024-09-20'

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSignalActivitySchema =
  SchemaFactory.createForClass(UserSignalActivity);

UserSignalActivitySchema.index({ user: 1, createdAt: -1 });


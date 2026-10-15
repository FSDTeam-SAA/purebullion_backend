import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AlertDocument = Alert & Document;

export enum AlertCategory {
  ALL = 'all',
  SIGNALS = 'signals',
  MARKET = 'market',
  COMMUNITY = 'community',
  ANNOUNCEMENTS = 'announcements',
}

export enum AlertType {
  NEW_SIGNAL = 'new_signal',
  PROXIMITY = 'proximity',
  SIGNAL_CLOSED = 'signal_closed',
  MARKET_CONDITION = 'market_condition',
  WATCHLIST_MOVER = 'watchlist_mover',
  COMMUNITY_REPLY = 'community_reply',
  ANNOUNCEMENT = 'announcement',
}

@Schema({ timestamps: true, collection: 'alerts' })
export class Alert {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId: Types.ObjectId | null; // null for broadcast to all users

  @Prop({
    required: true,
    enum: ['signals', 'market', 'community', 'announcements'],
    index: true,
  })
  category: string;

  @Prop({
    required: true,
    enum: [
      'new_signal',
      'proximity',
      'signal_closed',
      'market_condition',
      'watchlist_mover',
      'community_reply',
      'announcement',
    ],
    index: true,
  })
  type: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  message: string;

  // Rich structured data payload for signals, prices, targets
  @Prop({ type: Object, default: {} })
  data: {
    symbol?: string;
    companyName?: string;
    entryPrice?: number;
    targetPrice?: number;
    stopLoss?: number;
    action?: string; // 'BUY' | 'SELL'
    status?: string; // 'Open signal' | 'Approaching entry' | 'Target reached'
    performance?: string; // '+6.73%' | '+3.25%' | '+2.80%'
    volumeRatio?: string; // '1.9x'
    distancePct?: string; // '0.96%'
    author?: string; // 'Rina K.'
    quoteText?: string;
    sessions?: number;
    linkUrl?: string;
  };

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop({ type: Date, default: null })
  readAt: Date | null;

  @Prop({ default: false })
  isHighlighted: boolean; // For prominent featured card (e.g. MSFT New Signal in screenshot)

  @Prop({ default: Date.now, index: true })
  createdAt: Date;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);

AlertSchema.index({ category: 1, createdAt: -1 });
AlertSchema.index({ isRead: 1, createdAt: -1 });
AlertSchema.index({ userId: 1, createdAt: -1 });


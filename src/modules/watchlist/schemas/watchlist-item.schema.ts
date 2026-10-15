import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WatchlistItemDocument = WatchlistItem & Document;

@Schema({ timestamps: true })
export class WatchlistItem {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, uppercase: true, trim: true })
  symbol: string; // e.g. "NVDA"

  @Prop({ type: String, trim: true })
  companyName?: string;

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: Date, default: Date.now })
  addedAt: Date;
}

export const WatchlistItemSchema = SchemaFactory.createForClass(WatchlistItem);

// Prevent duplicate symbols per user
WatchlistItemSchema.index({ userId: 1, symbol: 1 }, { unique: true });
WatchlistItemSchema.index({ userId: 1, createdAt: -1 });


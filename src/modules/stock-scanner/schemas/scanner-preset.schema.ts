import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScannerPresetDocument = ScannerPreset & Document;

@Schema({ timestamps: true })
export class ScannerPreset {
  @Prop({ type: String, required: true, trim: true })
  name: string; // e.g. "High Momentum Breakouts", "Gap Hold Setups"

  @Prop({ type: Object, required: true })
  filters: {
    marketCondition?: string;
    priceBehavior?: string;
    liquidity?: string;
    momentum?: string;
    technicalCondition?: string;
    entryCondition?: string;
    exitCondition?: string;
    maxStopDistance?: number;
    minRiskReward?: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;
}

export const ScannerPresetSchema = SchemaFactory.createForClass(ScannerPreset);


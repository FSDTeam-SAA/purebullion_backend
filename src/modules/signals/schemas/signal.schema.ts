import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SignalDocument = Signal & Document;

@Schema({ _id: false })
export class SignalTimelineItem {
  @Prop({ type: String, required: true })
  stage: string; // "Signal generated", "Members notified", "Entry reference confirmed", "Position tracking active", "Signal closed"

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: Date, default: Date.now })
  date: Date;
}

@Schema({ _id: false })
export class SignalConditionItem {
  @Prop({ type: String })
  marketConditionAtPublication: string; // e.g. "Risk-On · score 72"

  @Prop({ type: String })
  momentum: string; // e.g. "Accelerating across all three lookbacks"

  @Prop({ type: String })
  technicalConfirmation: string; // e.g. "Close above the prior range high on 1.9x average volume"

  @Prop({ type: String })
  relativeStrength: string; // e.g. "Accelerating across all three lookbacks"

  @Prop({ type: String })
  volatilityRegime: string; // e.g. "Contained · ATR 2.4% of price"

  @Prop({ type: String })
  liquidity: string; // e.g. "Median dollar volume 5.2x the minimum floor"
}

@Schema({ timestamps: true })
export class Signal {
  @Prop({ type: String, unique: true })
  signalId: string; // e.g. "PB-2481"

  @Prop({ type: String, enum: ['BUY', 'SELL'], required: true })
  type: string;

  @Prop({
    type: String,
    enum: ['NEW', 'OPEN', 'CLOSED'],
    default: 'OPEN',
  })
  status: string;

  @Prop({
    type: String,
    enum: ['Stock', 'ETF'],
    default: 'Stock',
  })
  assetType: string;

  @Prop({ type: String, required: true, uppercase: true, trim: true })
  symbol: string; // e.g. "NVDA"

  @Prop({ type: String, trim: true })
  companyName: string;

  @Prop({ type: Number, required: true })
  entry: number;

  @Prop({ type: Number, required: true })
  target: number;

  @Prop({ type: Number, required: true })
  stopLoss: number;

  @Prop({ type: Number })
  lastExit: number; // Exit price or last known price

  @Prop({ type: Number })
  returnPct: number; // Return percentage (+0.90, +1.76)

  @Prop({ type: String }) // e.g. "1 : 2.44"
  riskReward: string;

  @Prop({ type: String, enum: ['High', 'Moderate', 'Low'], default: 'High' })
  confidence: string;

  @Prop({ type: String }) // e.g. "3-10 sessions"
  typicalHold: string;

  @Prop({ type: String })
  rationaleTitle: string; // e.g. "Reversal attempt from a multi-month base with improving relative strength."

  @Prop({ type: String })
  signalRationale: string;

  @Prop({ type: SignalConditionItem })
  conditionDetails: SignalConditionItem;

  @Prop({ type: [SignalTimelineItem], default: [] })
  timeline: SignalTimelineItem[];

  // Macro & technical classification tags
  @Prop({ type: String, enum: ['Risk-On', 'Neutral', 'Risk-Off'], default: 'Risk-On' })
  marketCondition: string;

  @Prop({ type: String, enum: ['Breakout', 'Pullback', 'Reversal', 'Range'], default: 'Breakout' })
  priceBehavior: string;

  @Prop({ type: String, enum: ['Strong', 'Improving', 'Weak'], default: 'Strong' })
  momentum: string;

  @Prop({ type: String, enum: ['High', 'Medium', 'Low'], default: 'High' })
  liquidity: string;

  @Prop({ type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' })
  risk: string;

  @Prop({ type: String })
  setup: string; // e.g. "Retest hold", "Gap hold"

  // Dates
  @Prop({ type: Date, default: Date.now })
  openedAt: Date;

  @Prop({ type: Date })
  closedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const SignalSchema = SchemaFactory.createForClass(Signal);

// Auto-generate PB-XXXX signalId if not specified
SignalSchema.pre('save', async function (next) {
  if (!this.signalId) {
    const count = await (this.constructor as any).countDocuments();
    this.signalId = `PB-${String(count + 2480).padStart(4, '0')}`;
  }
  next();
});

// Indexes for fast filtering
SignalSchema.index({ status: 1 });
SignalSchema.index({ type: 1 });
SignalSchema.index({ assetType: 1 });
SignalSchema.index({ symbol: 1 });
SignalSchema.index({ openedAt: -1 });
SignalSchema.index({ createdAt: -1 });

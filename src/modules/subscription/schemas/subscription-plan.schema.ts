import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class PlanFeatures {
  @Prop({ default: true })
  marketOverview: boolean;

  @Prop({ default: 'basic', enum: ['none', 'basic', 'advanced'] })
  stockScreener: string;

  /** -1 means unlimited */
  @Prop({ default: 1 })
  watchlistLimit: number;

  @Prop({ default: false })
  unlimitedWatchlists: boolean;

  @Prop({ default: 'basic', enum: ['none', 'basic', 'advanced', 'custom'] })
  marketAlerts: string;

  @Prop({ default: false })
  aiMarketAnalysis: boolean;

  @Prop({ default: false })
  premiumResearchAccess: boolean;

  @Prop({ default: false })
  advancedAiResearchTools: boolean;

  @Prop({ default: false })
  exclusiveMarketInsights: boolean;

  @Prop({ default: false })
  priorityCommunityAccess: boolean;

  @Prop({ default: false })
  customAlertPreferences: boolean;

  @Prop({ type: Object, default: {} })
  customLimits: Record<string, any>;
}

export const PlanFeaturesSchema = SchemaFactory.createForClass(PlanFeatures);

@Schema({ timestamps: true })
export class SubscriptionPlan {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, default: '' })
  description: string;

  @Prop({ required: true, min: 0 })
  monthlyPrice: number;

  @Prop({ required: true, min: 0 })
  yearlyPrice: number;

  @Prop({ default: 'USD', uppercase: true })
  currency: string;

  @Prop({ type: [String], default: [] })
  benefits: string[];

  @Prop({ type: PlanFeaturesSchema, default: () => ({}) })
  features: PlanFeatures;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isPopular: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const SubscriptionPlanSchema =
  SchemaFactory.createForClass(SubscriptionPlan);
export type SubscriptionPlanDocument = HydratedDocument<SubscriptionPlan>;

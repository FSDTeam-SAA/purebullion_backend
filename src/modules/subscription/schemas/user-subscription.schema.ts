import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BillingCycle, SubscriptionStatus } from '../enums/subscription.enum';

@Schema({ timestamps: true })
export class UserSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true,
    index: true,
  })
  plan: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(BillingCycle),
    default: BillingCycle.MONTHLY,
  })
  billingCycle: BillingCycle;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 'USD', uppercase: true })
  currency: string;

  @Prop({
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.ACTIVE,
    index: true,
  })
  status: SubscriptionStatus;

  @Prop({ required: true, default: Date.now })
  startDate: Date;

  @Prop({ required: true })
  renewalDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: null })
  cancelledAt?: Date;

  @Prop({ default: null })
  suspendedAt?: Date;

  @Prop({ default: true })
  autoRenew: boolean;

  @Prop({ default: 'paid' })
  paymentStatus: string;

  @Prop({ default: 'card' })
  paymentMethod?: string;

  @Prop({ default: null })
  transactionId?: string;

  @Prop({ default: null, index: true })
  invoiceNumber?: string;

  @Prop({ default: '' })
  notes?: string;
}

export const UserSubscriptionSchema =
  SchemaFactory.createForClass(UserSubscription);
export type UserSubscriptionDocument = HydratedDocument<UserSubscription>;

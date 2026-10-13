import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SupportMessage {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ default: '', trim: true })
  phoneNumber: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({
    enum: ['pending', 'resolved'],
    default: 'pending',
    index: true,
  })
  status: string;

  @Prop({ default: '', trim: true })
  replyMessage?: string;

  @Prop({ default: null })
  resolvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  resolvedBy?: Types.ObjectId;
}

export const SupportMessageSchema =
  SchemaFactory.createForClass(SupportMessage);
export type SupportMessageDocument = HydratedDocument<SupportMessage>;

SupportMessageSchema.index({ status: 1, createdAt: -1 });


import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdminNotificationLogDocument = AdminNotificationLog & Document;

@Schema({ timestamps: true, collection: 'admin_notification_logs' })
export class AdminNotificationLog {
  @Prop({ required: true, trim: true })
  type: string; // e.g. 'Signal Alert', 'Luca Moretti', 'Ben Okafor', 'Market Alert'

  @Prop({ required: true, trim: true })
  recipient: string; // e.g. 'Subscribed users', 'A closer look at GLD support..', 'Does anyone track central bank..'

  @Prop({ required: true, trim: true })
  channel: string; // e.g. 'Email', 'Technical analysis', 'General', 'In-platform', 'Browser push'

  @Prop({
    required: true,
    enum: ['active', 'suspended'],
    default: 'active',
    index: true,
  })
  status: string; // 'active' (green) | 'suspended' (red)

  @Prop({ default: '1' })
  delivered: string; // e.g. '09:43', '62', '21'

  @Prop({ default: '1' })
  read: string; // e.g. '68%', '62', '21'

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: Date.now, index: true })
  createdAt: Date;
}

export const AdminNotificationLogSchema =
  SchemaFactory.createForClass(AdminNotificationLog);

AdminNotificationLogSchema.index({ status: 1, createdAt: -1 });
AdminNotificationLogSchema.index({ type: 'text', recipient: 'text' });


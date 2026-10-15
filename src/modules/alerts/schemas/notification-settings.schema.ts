import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationSettingsDocument = NotificationSettings & Document;

@Schema({ _id: false })
export class NotificationToggles {
  @Prop({ default: true })
  newSignals: boolean;

  @Prop({ default: true })
  signalProximity: boolean;

  @Prop({ default: true })
  signalClosed: boolean;

  @Prop({ default: true })
  marketConditionChange: boolean;

  @Prop({ default: true })
  watchlistMovers: boolean;

  @Prop({ default: true })
  communityReplies: boolean;

  @Prop({ default: true })
  announcements: boolean;

  @Prop({ default: true })
  weeklyWrapEmail: boolean;
}

@Schema({ _id: false })
export class NotificationChannels {
  @Prop({ default: true })
  inPlatform: boolean;

  @Prop({ default: true })
  email: boolean;

  @Prop({ default: true })
  browserPush: boolean;

  @Prop({ default: true })
  sms: boolean; // Marked [Soon] in UI
}

@Schema({ _id: false })
export class QuietHours {
  @Prop({ default: true })
  enabled: boolean;

  @Prop({ default: '20:00' })
  from: string;

  @Prop({ default: '06:30' })
  to: string;

  @Prop({
    default: 'Alerts outside these hours are queued and delivered at the open.',
  })
  description: string;
}

@Schema({ timestamps: true, collection: 'notification_settings' })
export class NotificationSettings {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: NotificationToggles, default: () => ({}) })
  toggles: NotificationToggles;

  @Prop({ type: NotificationChannels, default: () => ({}) })
  channels: NotificationChannels;

  @Prop({ type: QuietHours, default: () => ({}) })
  quietHours: QuietHours;
}

export const NotificationSettingsSchema =
  SchemaFactory.createForClass(NotificationSettings);


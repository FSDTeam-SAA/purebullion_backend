import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlatformActivityDocument = PlatformActivity & Document;

@Schema({ timestamps: true, collection: 'platform_activities' })
export class PlatformActivity {
  @Prop({ required: true, trim: true })
  actorName: string; // e.g. 'Liam Morgan', 'Amara Cole', 'Signal Engine', 'Moderation'

  @Prop({
    required: true,
    enum: ['user', 'system', 'moderation', 'admin'],
    default: 'user',
  })
  actorType: string;

  @Prop({ required: true, trim: true })
  action: string; // e.g. 'subscription activated', 'signal published', 'alert broadcasted'

  @Prop({ required: true, trim: true })
  detail: string; // e.g. 'subscription activated · Plan B'

  @Prop({ default: 'Plan B' })
  target: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PlatformActivitySchema =
  SchemaFactory.createForClass(PlatformActivity);

PlatformActivitySchema.index({ createdAt: -1 });
PlatformActivitySchema.index({ actorType: 1 });


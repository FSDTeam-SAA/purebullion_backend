import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class CommunityReport {
  @Prop({ required: true, enum: ['post', 'comment'], default: 'post', index: true })
  targetType: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  targetId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reporter: Types.ObjectId;

  @Prop({ type: [String], required: true, default: [] })
  reasons: string[];

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({
    enum: ['pending', 'reviewed', 'dismissed', 'resolved'],
    default: 'pending',
    index: true,
  })
  status: string;

  @Prop({ default: '' })
  adminNotes?: string;
}

export const CommunityReportSchema =
  SchemaFactory.createForClass(CommunityReport);
export type CommunityReportDocument = HydratedDocument<CommunityReport>;

CommunityReportSchema.index({ targetType: 1, targetId: 1, reporter: 1 });


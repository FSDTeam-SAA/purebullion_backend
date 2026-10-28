import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'briefing_drafts', timestamps: true, strict: false })
export class BriefingDraft {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true }) briefing_type: string;
  @Prop({
    required: true,
    enum: ['draft', 'needs_review', 'approved', 'rejected', 'published'],
  })
  status: string;
  @Prop() title: string;
  @Prop() markdown: string;
  @Prop() disclaimer: string;
}
export type BriefingDraftDocument = HydratedDocument<BriefingDraft>;
export const BriefingDraftSchema = SchemaFactory.createForClass(BriefingDraft);

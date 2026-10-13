import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class CommunityLike {
  @Prop({ type: Types.ObjectId, ref: 'CommunityPost', required: true, index: true })
  post: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;
}

export const CommunityLikeSchema = SchemaFactory.createForClass(CommunityLike);
export type CommunityLikeDocument = HydratedDocument<CommunityLike>;

CommunityLikeSchema.index({ post: 1, user: 1 }, { unique: true });


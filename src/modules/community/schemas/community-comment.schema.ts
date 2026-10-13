import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class CommunityComment {
  @Prop({ type: Types.ObjectId, ref: 'CommunityPost', required: true, index: true })
  post: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  author: Types.ObjectId;

  @Prop({ required: true, trim: true })
  content: string;

  /** Null for top-level comments, or parent comment ObjectId for replies */
  @Prop({
    type: Types.ObjectId,
    ref: 'CommunityComment',
    default: null,
    index: true,
  })
  parentComment?: Types.ObjectId;

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: 0 })
  repliesCount: number;

  @Prop({ default: false })
  isReported: boolean;

  @Prop({
    enum: ['active', 'hidden', 'deleted'],
    default: 'active',
    index: true,
  })
  status: string;
}

export const CommunityCommentSchema =
  SchemaFactory.createForClass(CommunityComment);
export type CommunityCommentDocument = HydratedDocument<CommunityComment>;

CommunityCommentSchema.index({ post: 1, parentComment: 1, createdAt: -1 });


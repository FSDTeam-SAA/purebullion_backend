import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'ai_conversations', timestamps: true })
export class AiConversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;
  @Prop({ required: true, unique: true }) conversationId: string;
  @Prop({ required: true }) title: string;
  @Prop({ default: 0 }) messageCount: number;
  @Prop({ type: Date, default: Date.now }) lastMessageAt: Date;
  @Prop({ default: false }) isDeleted: boolean;
}
export type AiConversationDocument = HydratedDocument<AiConversation>;
export const AiConversationSchema =
  SchemaFactory.createForClass(AiConversation);
AiConversationSchema.index({ user: 1, isDeleted: 1, lastMessageAt: -1 });

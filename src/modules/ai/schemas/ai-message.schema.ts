import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'ai_messages', timestamps: true })
export class AiMessage {
  @Prop({ required: true }) conversationId: string;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
  @Prop({ required: true, enum: ['user', 'assistant'] }) role:
    | 'user'
    | 'assistant';
  @Prop({ type: String, default: '' }) content: string;
  @Prop({ type: [String], default: [] }) toolsUsed: string[];
  @Prop({ enum: ['complete', 'error', 'incomplete'], default: 'complete' })
  status: string;
  @Prop({ type: String, default: null }) errorCode: string | null;
  @Prop({ type: Number, default: null }) aiMessageId: number | null;
  @Prop({ default: false }) replaced: boolean;
  @Prop({ type: { inputTokens: Number, outputTokens: Number }, default: null })
  usage: { inputTokens: number; outputTokens: number } | null;
}
export type AiMessageDocument = HydratedDocument<AiMessage>;
export const AiMessageSchema = SchemaFactory.createForClass(AiMessage);
AiMessageSchema.index({ conversationId: 1, createdAt: 1 });

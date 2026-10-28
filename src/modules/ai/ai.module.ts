import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import aiConfig from './ai.config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiClientService } from './ai-client.service';
import {
  AiConversation,
  AiConversationSchema,
} from './schemas/ai-conversation.schema';
import { AiMessage, AiMessageSchema } from './schemas/ai-message.schema';
import {
  BriefingDraft,
  BriefingDraftSchema,
} from './schemas/briefing-draft.schema';
import {
  UserSubscription,
  UserSubscriptionSchema,
} from '../subscription/schemas/user-subscription.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule.forFeature(aiConfig),
    AuthModule,
    MongooseModule.forFeature([
      { name: AiConversation.name, schema: AiConversationSchema },
      { name: AiMessage.name, schema: AiMessageSchema },
      { name: BriefingDraft.name, schema: BriefingDraftSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService, AiClientService],
  exports: [AiService, AiClientService],
})
export class AiModule {}

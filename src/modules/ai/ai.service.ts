import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Response } from 'express';
import { AiClientService } from './ai-client.service';
import { AiSseParser, AiEvent, AiEventData } from './sse-parser';
import {
  AiConversation,
  AiConversationDocument,
} from './schemas/ai-conversation.schema';
import { AiMessage, AiMessageDocument } from './schemas/ai-message.schema';
import {
  BriefingDraft,
  BriefingDraftDocument,
} from './schemas/briefing-draft.schema';
import {
  UserSubscription,
  UserSubscriptionDocument,
} from '../subscription/schemas/user-subscription.schema';
import { SubscriptionStatus } from '../subscription/enums/subscription.enum';
import {
  ChatDto,
  IngestKnowledgeDto,
  RenameConversationDto,
} from './dto/ai.dto';

@Injectable()
export class AiService {
  constructor(
    private readonly client: AiClientService,
    @InjectModel(AiConversation.name)
    private readonly conversations: Model<AiConversationDocument>,
    @InjectModel(AiMessage.name)
    private readonly messages: Model<AiMessageDocument>,
    @InjectModel(BriefingDraft.name)
    private readonly drafts: Model<BriefingDraftDocument>,
    @InjectModel(UserSubscription.name)
    private readonly subscriptions: Model<UserSubscriptionDocument>,
  ) {}

  private async plan(userId: string): Promise<string> {
    const subscription = await this.subscriptions
      .findOne({
        user: userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { $gt: new Date() },
      })
      .sort({ startDate: -1 })
      .populate<{ plan: { slug: string } }>('plan', 'slug')
      .lean();
    const slug = subscription?.plan?.slug?.toLowerCase();
    if (!slug)
      throw new ForbiddenException(
        'An active subscription is required for AI chat',
      );
    return slug;
  }

  private async owned(userId: string, conversationId: string) {
    const conversation = await this.conversations.findOne({
      user: userId,
      conversationId,
      isDeleted: false,
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async chat(
    userId: string,
    dto: ChatDto,
    res: Response,
    testPlanSlug?: string,
  ): Promise<void> {
    const plan = testPlanSlug ?? (await this.plan(userId));
    if (dto.conversationId) await this.owned(userId, dto.conversationId);
    const abort = new AbortController();
    let disconnected = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        disconnected = true;
        abort.abort();
      }
    });
    const upstream = await this.client.request(
      '/v1/chat',
      'POST',
      {
        message: dto.message,
        ...(dto.conversationId ? { conversation_id: dto.conversationId } : {}),
      },
      userId,
      plan,
      true,
      abort.signal,
    );
    if (
      !upstream.body ||
      !upstream.headers.get('content-type')?.includes('text/event-stream')
    ) {
      throw new Error('AI service did not return an event stream');
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const parser = new AiSseParser();
    const reader = upstream.body.getReader();
    let conversationId: string | undefined;
    let reply = '';
    let terminal = false;
    const tools = new Set<string>();
    const user = new Types.ObjectId(userId);
    const saveAssistant = async (
      status: 'complete' | 'error' | 'incomplete',
      data: AiEventData = {},
    ) => {
      if (!conversationId || terminal) return;
      terminal = true;
      await this.messages.create({
        conversationId,
        user,
        role: 'assistant',
        content: reply,
        toolsUsed: [...tools],
        status,
        errorCode: data.code || null,
        aiMessageId: data.message_id ?? null,
        replaced: data.replaced ?? false,
        usage: data.usage
          ? {
              inputTokens: data.usage.input_tokens,
              outputTokens: data.usage.output_tokens,
            }
          : null,
      });
      await this.conversations.updateOne(
        { conversationId, user },
        { $inc: { messageCount: 2 }, $set: { lastMessageAt: new Date() } },
      );
    };
    const handle = async ({ event, data }: AiEvent) => {
      if (event === 'meta') {
        if (
          conversationId ||
          typeof data.conversation_id !== 'string' ||
          (dto.conversationId && dto.conversationId !== data.conversation_id)
        )
          throw new Error('Invalid AI conversation metadata');
        conversationId = data.conversation_id;
        if (!dto.conversationId)
          await this.conversations.create({
            user,
            conversationId,
            title: dto.message.trim().slice(0, 60),
            messageCount: 0,
            lastMessageAt: new Date(),
          });
        await this.messages.create({
          conversationId,
          user,
          role: 'user',
          content: dto.message,
          status: 'complete',
        });
      } else if (event === 'token') reply += data.text ?? '';
      else if (event === 'replace') reply = data.text ?? '';
      else if (
        event === 'tool_call' &&
        data.status === 'completed' &&
        typeof data.name === 'string'
      )
        tools.add(data.name);
      else if (event === 'done') await saveAssistant('complete', data);
      else if (event === 'error') await saveAssistant('error', data);
    };
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const event of parser.push(value)) await handle(event);
        if (!disconnected) res.write(Buffer.from(value));
        if (terminal) break;
      }
      if (!terminal) await saveAssistant('incomplete');
    } catch {
      await saveAssistant('incomplete').catch(() => undefined);
      if (!disconnected && !res.writableEnded) {
        res.write(
          `event: error\ndata: ${JSON.stringify({ code: 'STREAM_ERROR', message: 'AI stream interrupted' })}\n\n`,
        );
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      if (!res.writableEnded) res.end();
    }
  }

  async list(userId: string, page = 1, limit = 20) {
    page = Number.isFinite(+page) ? Math.max(1, +page) : 1;
    limit = Number.isFinite(+limit) ? Math.min(100, Math.max(1, +limit)) : 20;
    const filter = { user: new Types.ObjectId(userId), isDeleted: false };
    const [data, total] = await Promise.all([
      this.conversations
        .find(filter)
        .sort({ lastMessageAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.conversations.countDocuments(filter),
    ]);
    return {
      message: 'Conversations fetched',
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async history(userId: string, conversationId: string) {
    await this.owned(userId, conversationId);
    const data = await this.messages
      .find({ user: userId, conversationId })
      .sort({ createdAt: 1, _id: 1 })
      .lean();
    return { message: 'Messages fetched', data };
  }

  async rename(
    userId: string,
    conversationId: string,
    dto: RenameConversationDto,
  ) {
    const conversation = await this.owned(userId, conversationId);
    conversation.title = dto.title.trim();
    await conversation.save();
    return { message: 'Conversation renamed', data: conversation };
  }

  async remove(userId: string, conversationId: string) {
    const conversation = await this.owned(userId, conversationId);
    conversation.isDeleted = true;
    await conversation.save();
    return { message: 'Conversation deleted', data: null };
  }

  async generateBriefing(briefing_type: string) {
    const response = await this.client.request(
      '/v1/briefings/generate',
      'POST',
      { briefing_type },
    );
    const draft = (await response.json()) as Record<string, unknown>;
    const saved = await this.drafts.create(draft);
    return { message: 'Briefing draft generated', data: saved };
  }

  async listBriefings(publishedOnly: boolean) {
    const data = await this.drafts
      .find(publishedOnly ? { status: 'published' } : {})
      .sort({ createdAt: -1 })
      .lean();
    return { message: 'Briefings fetched', data };
  }

  async reviewBriefing(id: string, action: 'approve' | 'reject' | 'publish') {
    const from =
      action === 'publish' ? ['approved'] : ['draft', 'needs_review'];
    const status =
      action === 'approve'
        ? 'approved'
        : action === 'reject'
          ? 'rejected'
          : 'published';
    const draft = await this.drafts.findOneAndUpdate(
      { id, status: { $in: from } },
      { $set: { status } },
      { new: true },
    );
    if (!draft)
      throw new NotFoundException(
        'Briefing draft not found or invalid status transition',
      );
    return { message: `Briefing ${status}`, data: draft };
  }

  async ingestKnowledge(dto: IngestKnowledgeDto) {
    const response = await this.client.request(
      '/v1/knowledge/ingest',
      'POST',
      dto,
    );
    const data: unknown = await response.json();
    return { message: 'Knowledge ingested', data };
  }

  async rationale(signal_id: string): Promise<{
    rationale: string;
    sms_line: string;
    model: string;
    prompt_version: string;
  }> {
    const response = await this.client.request(
      '/v1/signals/rationale',
      'POST',
      { signal_id },
    );
    return (await response.json()) as {
      rationale: string;
      sms_line: string;
      model: string;
      prompt_version: string;
    };
  }
}

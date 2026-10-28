import { EventEmitter } from 'events';
import { HttpException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AiService } from './ai.service';

const userId = new Types.ObjectId().toString();
const conversationId = 'e888d7a5-e9a0-4633-9f2c-4767358189e0';
const frame = (event: string, data: object) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const stream = (...parts: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      parts.forEach((part) => controller.enqueue(Buffer.from(part)));
      controller.close();
    },
  });

function setup(existing = false) {
  const client = { request: jest.fn() };
  const conversations = {
    findOne: jest
      .fn()
      .mockResolvedValue(existing ? { conversationId, user: userId } : null),
    create: jest.fn().mockResolvedValue({ conversationId }),
    updateOne: jest.fn().mockResolvedValue({}),
  };
  const messages = { create: jest.fn().mockResolvedValue({}) };
  const drafts = {};
  const subscriptions = {
    findOne: jest.fn().mockReturnValue({
      sort: () => ({
        populate: () => ({ lean: async () => ({ plan: { slug: 'pro' } }) }),
      }),
    }),
  };
  const res = Object.assign(new EventEmitter(), {
    writableEnded: false,
    chunks: [] as string[],
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write(chunk: Buffer | string) {
      this.chunks.push(chunk.toString());
      return true;
    },
    end() {
      this.writableEnded = true;
    },
  });
  const service = new AiService(
    client as any,
    conversations as any,
    messages as any,
    drafts as any,
    subscriptions as any,
  );
  return { service, client, conversations, messages, res };
}

describe('AiService.chat', () => {
  it('stores a new conversation and exact replaced answer', async () => {
    const t = setup();
    const sse =
      frame('meta', { conversation_id: conversationId }) +
      frame('token', { text: 'unsafe' }) +
      frame('replace', { text: 'Safe answer\n\n---\nDisclaimer' }) +
      frame('done', {
        conversation_id: conversationId,
        message_id: 2,
        replaced: true,
        usage: { input_tokens: 10, output_tokens: 5 },
      });
    t.client.request.mockResolvedValue({
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body: stream(sse.slice(0, 80), sse.slice(80)),
    });
    await t.service.chat(userId, { message: 'question' }, t.res as any);
    expect(t.conversations.create).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId, title: 'question' }),
    );
    expect(t.messages.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        role: 'assistant',
        content: 'Safe answer\n\n---\nDisclaimer',
        status: 'complete',
        replaced: true,
      }),
    );
    expect(t.res.chunks.join('')).toBe(sse);
  });

  it('continues an owned conversation and stores midstream error', async () => {
    const t = setup(true);
    t.client.request.mockResolvedValue({
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body: stream(
        frame('meta', { conversation_id: conversationId }) +
          frame('token', { text: 'partial' }) +
          frame('error', { code: 'LLM_UNAVAILABLE', message: 'failed' }),
      ),
    });
    await t.service.chat(
      userId,
      { message: 'again', conversationId },
      t.res as any,
    );
    expect(t.conversations.create).not.toHaveBeenCalled();
    expect(t.messages.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 'error',
        errorCode: 'LLM_UNAVAILABLE',
        content: 'partial',
      }),
    );
  });

  it('stores an error even when the assistant produced no tokens', async () => {
    const t = setup();
    t.client.request.mockResolvedValue({
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body: stream(
        frame('meta', { conversation_id: conversationId }) +
          frame('error', { code: 'LLM_UNAVAILABLE' }),
      ),
    });
    await t.service.chat(userId, { message: 'question' }, t.res as any);
    expect(t.messages.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'error', content: '' }),
    );
  });

  it('rejects an unowned conversation before calling the AI service', async () => {
    const t = setup();
    await expect(
      t.service.chat(
        userId,
        { message: 'again', conversationId },
        t.res as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(t.client.request).not.toHaveBeenCalled();
  });

  it('passes prestream 429 through without storing anything', async () => {
    const t = setup();
    t.client.request.mockRejectedValue(new HttpException('rate limited', 429));
    await expect(
      t.service.chat(userId, { message: 'question' }, t.res as any),
    ).rejects.toMatchObject({ status: 429 });
    expect(t.messages.create).not.toHaveBeenCalled();
  });

  it('saves an incomplete answer when the client disconnects', async () => {
    const t = setup();
    let source: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        source = controller;
        controller.enqueue(
          Buffer.from(
            frame('meta', { conversation_id: conversationId }) +
              frame('token', { text: 'partial' }),
          ),
        );
      },
    });
    t.client.request.mockResolvedValue({
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body,
    });
    const pending = t.service.chat(
      userId,
      { message: 'question' },
      t.res as any,
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    t.res.emit('close');
    source.error(new Error('aborted'));
    await pending;
    expect(t.messages.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'incomplete', content: 'partial' }),
    );
  });
});

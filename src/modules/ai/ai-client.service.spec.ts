import { AiClientService } from './ai-client.service';

describe('AiClientService', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });
  const client = () =>
    new AiClientService({
      get: (key: string) =>
        ({
          'ai.url': 'http://localhost:8000',
          'ai.token': 'shared-token',
          'ai.timeoutMs': 1000,
        })[key],
    } as any);

  it('uses the shared token and member headers', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('{}', { status: 200 }));
    await client().request(
      '/v1/chat',
      'POST',
      { message: 'hello' },
      'user-1',
      'pro',
      true,
    );
    expect(global.fetch).toHaveBeenCalledWith(
      new URL('http://localhost:8000/v1/chat'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Service-Token': 'shared-token',
          'X-User-Id': 'user-1',
          'X-User-Plan': 'pro',
        }),
      }),
    );
  });

  it('preserves Retry-After on rate limits', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'RATE_LIMITED', message: 'Message limit reached' },
        }),
        { status: 429, headers: { 'Retry-After': '123' } },
      ),
    );
    await expect(
      client().request(
        '/v1/chat',
        'POST',
        { message: 'hello' },
        'user-1',
        'pro',
        true,
      ),
    ).rejects.toMatchObject({ status: 429, retryAfter: '123' });
  });

  it('maps a rejected service token to 502', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'UNAUTHORIZED', message: 'bad token' },
        }),
        { status: 401 },
      ),
    );
    await expect(
      client().request('/v1/chat', 'POST', {}, 'user-1', 'pro', true),
    ).rejects.toMatchObject({ status: 502 });
  });
});

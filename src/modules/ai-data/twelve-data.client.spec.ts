import { ConfigService } from '@nestjs/config';
import { TwelveDataClient } from './twelve-data.client';
import { AiDataException } from './ai-data.exception';

const makeClient = (apiKey = 'secret-key') =>
  new TwelveDataClient({
    get: (key: string) => (key === 'twelvedata.apiKey' ? apiKey : 'https://api.twelvedata.com'),
  } as unknown as ConfigService);

const mockFetch = (impl: () => Promise<any>) =>
  jest.spyOn(global, 'fetch').mockImplementation(impl as any);

const jsonResponse = (body: any, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

describe('TwelveDataClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns the payload on success', async () => {
    mockFetch(() => jsonResponse({ symbol: 'AAPL', close: '1' }));
    await expect(makeClient().get('/quote', { symbol: 'AAPL' })).resolves.toEqual({ symbol: 'AAPL', close: '1' });
  });

  it.each([
    ['rate limit', { code: 429, message: 'limit', status: 'error' }],
    ['plan restriction', { code: 403, message: 'upgrade', status: 'error' }],
    ['bad key', { code: 401, message: 'bad key', status: 'error' }],
  ])('throws DATA_UNAVAILABLE on %s payload', async (_name, body) => {
    mockFetch(() => jsonResponse(body));
    await expect(makeClient().get('/quote', { symbol: 'AAPL' }, 'AAPL')).rejects.toMatchObject({
      code: 'DATA_UNAVAILABLE',
      status: 503,
    });
  });

  it('throws DATA_UNAVAILABLE on HTTP error and network failure', async () => {
    mockFetch(() => jsonResponse({}, 500));
    await expect(makeClient().get('/quote', {})).rejects.toMatchObject({ code: 'DATA_UNAVAILABLE' });
    mockFetch(() => Promise.reject(new TypeError('fetch failed')));
    await expect(makeClient().get('/quote', {})).rejects.toMatchObject({ code: 'DATA_UNAVAILABLE' });
  });

  it('maps upstream 404 to SYMBOL_NOT_FOUND only when a symbol is given', async () => {
    const body = { code: 404, message: '**symbol** not found: ZZZZ', status: 'error' };
    mockFetch(() => jsonResponse(body));
    await expect(makeClient().get('/quote', { symbol: 'ZZZZ' }, 'ZZZZ')).rejects.toMatchObject({
      code: 'SYMBOL_NOT_FOUND',
      status: 404,
    });
    await expect(makeClient().get('/market_state', {})).rejects.toMatchObject({ code: 'DATA_UNAVAILABLE' });
  });

  it('fails without calling upstream when no API key is configured', async () => {
    const spy = mockFetch(() => jsonResponse({}));
    await expect(makeClient('').get('/quote', {})).rejects.toBeInstanceOf(AiDataException);
    expect(spy).not.toHaveBeenCalled();
  });

  it('never logs the API key or full URL', async () => {
    const logs: string[] = [];
    const client = makeClient('super-secret');
    jest.spyOn((client as any).logger, 'warn').mockImplementation((m: string) => logs.push(m));
    mockFetch(() => jsonResponse({ code: 429, message: 'x', status: 'error' }));
    await client.get('/quote', { symbol: 'AAPL' }).catch(() => undefined);
    mockFetch(() => Promise.reject(new Error('request to https://api.twelvedata.com/quote?apikey=super-secret failed')));
    await client.get('/quote', { symbol: 'AAPL' }).catch(() => undefined);
    expect(logs.length).toBe(2);
    expect(logs.join('\n')).not.toMatch(/super-secret|apikey|https?:\/\//);
  });
});

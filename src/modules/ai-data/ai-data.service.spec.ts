import { AiDataService } from './ai-data.service';
import { AiDataException } from './ai-data.exception';
import { TwelveDataClient } from './twelve-data.client';

const rawQuote = (symbol: string, close: string, extra: Record<string, any> = {}) => ({
  symbol,
  name: `${symbol} Inc.`,
  exchange: 'NASDAQ',
  datetime: '2026-10-26',
  timestamp: 1793021400,
  last_quote_at: 1793044740,
  open: '10',
  high: '11',
  low: '9',
  close,
  volume: '1000',
  previous_close: '9.5',
  change: '0.5',
  percent_change: '5.26',
  average_volume: '900',
  is_market_open: false,
  fifty_two_week: { low: '5', high: '12' },
  ...extra,
});

const makeService = (tdGet: jest.Mock, config: Partial<{ isDelayed: boolean; moversUniverse: string }> = {}) => {
  const td = { get: tdGet } as unknown as TwelveDataClient;
  const cfg = { serviceToken: 't', isDelayed: true, moversUniverse: '', ...config };
  return new AiDataService(td, cfg as any, {} as any, {} as any);
};

describe('AiDataService', () => {
  describe('quotes', () => {
    it('normalises a quote with asOf from last_quote_at and freshness fields', async () => {
      const svc = makeService(jest.fn().mockResolvedValue(rawQuote('AAPL', '343.91')));
      const q = await svc.getQuote('AAPL');
      expect(q).toMatchObject({
        symbol: 'AAPL',
        price: 343.91,
        fiftyTwoWeekHigh: 12,
        isMarketOpen: false,
        asOf: new Date(1793044740 * 1000).toISOString(),
        isDelayed: true,
        source: 'twelvedata',
      });
    });

    it('falls back to timestamp, then UTC bar datetime, for asOf', async () => {
      const svc = makeService(
        jest.fn()
          .mockResolvedValueOnce(rawQuote('AAA', '1', { last_quote_at: undefined }))
          .mockResolvedValueOnce(rawQuote('BBB', '1', { last_quote_at: undefined, timestamp: undefined })),
      );
      expect((await svc.getQuote('AAA')).asOf).toBe(new Date(1793021400 * 1000).toISOString());
      expect((await svc.getQuote('BBB')).asOf).toBe('2026-10-26T00:00:00.000Z');
    });

    it('returns 503 (never zeros) when price is missing', async () => {
      const svc = makeService(jest.fn().mockResolvedValue(rawQuote('AAPL', '')));
      await expect(svc.getQuote('AAPL')).rejects.toMatchObject({ code: 'DATA_UNAVAILABLE' });
    });

    it('maps not-found to 404 and does not cache errors', async () => {
      const get = jest.fn()
        .mockRejectedValueOnce(AiDataException.symbolNotFound('ZZZZ'))
        .mockResolvedValueOnce(rawQuote('ZZZZ', '2'));
      const svc = makeService(get);
      await expect(svc.getQuote('ZZZZ')).rejects.toMatchObject({ code: 'SYMBOL_NOT_FOUND', status: 404 });
      await expect(svc.getQuote('ZZZZ')).resolves.toMatchObject({ price: 2 });
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('caches successful quotes under its own key', async () => {
      const get = jest.fn().mockResolvedValue(rawQuote('AAPL', '1'));
      const svc = makeService(get);
      await svc.getQuote('AAPL');
      await svc.getQuote('AAPL');
      expect(get).toHaveBeenCalledTimes(1);
    });

    it('batch: one upstream call, missing symbols listed, not faked', async () => {
      const get = jest.fn().mockResolvedValue({
        AAPL: rawQuote('AAPL', '1'),
        ZZZZ: { code: 404, message: 'not found', status: 'error' },
      });
      const svc = makeService(get);
      const res = await svc.getQuotes('AAPL, zzzz,AAPL');
      expect(get).toHaveBeenCalledTimes(1);
      expect(get.mock.calls[0][1].symbol).toBe('AAPL,ZZZZ');
      expect(res.items.map((i) => i.symbol)).toEqual(['AAPL']);
      expect(res.missing).toEqual(['ZZZZ']);
    });

    it('batch: rejects invalid tickers and more than 20 symbols', async () => {
      const svc = makeService(jest.fn());
      await expect(svc.getQuotes('AAPL,12AB')).rejects.toMatchObject({ code: 'INVALID_SYMBOL', status: 400 });
      const many = Array.from({ length: 21 }, (_, i) => `A${String.fromCharCode(65 + i)}`).join(',');
      await expect(svc.getQuotes(many)).rejects.toMatchObject({ status: 400 });
    });

    it('batch: 503 when every symbol is unavailable', async () => {
      const get = jest.fn().mockResolvedValue({
        AAPL: { code: 429, message: 'limit', status: 'error' },
        MSFT: { code: 429, message: 'limit', status: 'error' },
      });
      await expect(makeService(get).getQuotes('AAPL,MSFT')).rejects.toMatchObject({ code: 'DATA_UNAVAILABLE' });
    });
  });

  describe('market overview', () => {
    it('omits missing symbols and lists them in missing[]', async () => {
      const get = jest.fn().mockImplementation((endpoint: string, params: any) => {
        if (endpoint === '/market_state') {
          return Promise.resolve([
            { name: 'NYSE', code: 'XASE', is_market_open: true },
            { name: 'NYSE', code: 'XNYS', is_market_open: false, time_to_open: '09:47:38', time_to_close: '00:00:00' },
          ]);
        }
        const symbols: string[] = params.symbol.split(',');
        return Promise.resolve(
          Object.fromEntries(symbols.filter((s) => s !== 'VXX').map((s) => [s, rawQuote(s, '100')])),
        );
      });
      const res = await makeService(get).getMarketOverview();
      expect(res.indices.map((i) => i.symbol)).toEqual(['SPY', 'QQQ', 'DIA', 'IWM', 'TLT']);
      expect(res.sectors).toHaveLength(11);
      expect(res.missing).toEqual(['VXX']);
      expect(res.marketStatus).toEqual({ isOpen: false, exchange: 'NYSE', timeToOpen: '09:47:38', timeToClose: '00:00:00' });
      expect(get).toHaveBeenCalledTimes(3);
    });

    it('propagates 503 when a quote batch fails', async () => {
      const get = jest.fn().mockRejectedValue(AiDataException.dataUnavailable());
      await expect(makeService(get).getMarketOverview()).rejects.toMatchObject({ code: 'DATA_UNAVAILABLE' });
    });
  });

  describe('history', () => {
    it('returns bars with asOf from the latest bar and no synthetic fill', async () => {
      const get = jest.fn().mockResolvedValue({
        meta: { symbol: 'AAPL', currency: 'USD', exchange_timezone: 'America/New_York' },
        values: [
          { datetime: '2026-10-26', open: '1', high: '2', low: '0.5', close: '1.5', volume: '10' },
          { datetime: '2026-10-23', open: '1', high: '2', low: '0.5', close: '1.2', volume: '9' },
        ],
      });
      const res = await makeService(get).getHistory('AAPL', '1day', 2);
      expect(res.bars).toHaveLength(2);
      expect(res.asOf).toBe('2026-10-26T00:00:00.000Z');
      expect(get.mock.calls[0][1]).toMatchObject({ timezone: 'UTC', outputsize: '2' });
    });

    it('503 when upstream returns no bars', async () => {
      const get = jest.fn().mockResolvedValue({ meta: {}, values: [] });
      await expect(makeService(get).getHistory('AAPL', '1day', 5)).rejects.toMatchObject({ code: 'DATA_UNAVAILABLE' });
    });
  });

  describe('profile', () => {
    it('returns marketCap null when statistics fail, but 503 when profile fails', async () => {
      const ok = jest.fn().mockImplementation((endpoint: string) =>
        endpoint === '/profile'
          ? Promise.resolve({ symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' })
          : Promise.reject(AiDataException.dataUnavailable()),
      );
      await expect(makeService(ok).getProfile('AAPL')).resolves.toMatchObject({ symbol: 'AAPL', marketCap: null });

      const bad = jest.fn().mockRejectedValue(AiDataException.dataUnavailable());
      await expect(makeService(bad).getProfile('AAPL')).rejects.toMatchObject({ code: 'DATA_UNAVAILABLE' });
    });
  });

  describe('movers', () => {
    it('503 when the universe is not configured', async () => {
      await expect(makeService(jest.fn()).getMovers('gainers', 10)).rejects.toMatchObject({ code: 'DATA_UNAVAILABLE' });
    });

    it('ranks real quotes from the configured universe and echoes the universe', async () => {
      const get = jest.fn().mockResolvedValue({
        AAA: rawQuote('AAA', '1', { percent_change: '3', volume: '10' }),
        BBB: rawQuote('BBB', '1', { percent_change: '-2', volume: '30' }),
        CCC: rawQuote('CCC', '1', { percent_change: '1', volume: '20' }),
      });
      const svc = makeService(get, { moversUniverse: 'aaa, BBB,CCC' });
      const gainers = await svc.getMovers('gainers', 10);
      expect(gainers.universe).toEqual(['AAA', 'BBB', 'CCC']);
      expect(gainers.items.map((i) => i.symbol)).toEqual(['AAA', 'CCC']);
      expect((await svc.getMovers('losers', 10)).items.map((i) => i.symbol)).toEqual(['BBB']);
      expect((await svc.getMovers('active', 2)).items.map((i) => i.symbol)).toEqual(['BBB', 'CCC']);
      expect(get).toHaveBeenCalledTimes(1); // later calls served from per-symbol quote cache
    });
  });

  describe('earnings', () => {
    it('normalises time to BMO / AMC / UNKNOWN', () => {
      expect(AiDataService.normalizeEarningsTime('Pre Market')).toBe('BMO');
      expect(AiDataService.normalizeEarningsTime('After Hours')).toBe('AMC');
      expect(AiDataService.normalizeEarningsTime('Time Not Supplied')).toBe('UNKNOWN');
      expect(AiDataService.normalizeEarningsTime(undefined)).toBe('UNKNOWN');
    });

    it('requires exactly one of symbol or from/to', async () => {
      const svc = makeService(jest.fn());
      await expect(svc.getEarnings({})).rejects.toMatchObject({ status: 400 });
      await expect(svc.getEarnings({ symbol: 'AAPL', from: '2026-10-01', to: '2026-10-02' })).rejects.toMatchObject({ status: 400 });
      await expect(svc.getEarnings({ from: '2026-10-01' })).rejects.toMatchObject({ status: 400 });
    });

    it('flattens the calendar and returns 503 (not a hardcoded list) on plan errors', async () => {
      const ok = jest.fn().mockResolvedValue({
        earnings: { '2026-10-28': [{ symbol: 'MSFT', name: 'Microsoft Corp', time: 'After Hours', eps_estimate: 3.1, eps_actual: null }] },
      });
      const res: any = await makeService(ok).getEarnings({ from: '2026-10-27', to: '2026-10-30' });
      expect(res.items).toEqual([
        { symbol: 'MSFT', companyName: 'Microsoft Corp', date: '2026-10-28', time: 'AMC', epsEstimate: 3.1, epsActual: null, revenueEstimate: null },
      ]);

      const denied = jest.fn().mockRejectedValue(AiDataException.dataUnavailable('plan'));
      await expect(makeService(denied).getEarnings({ from: '2026-10-27', to: '2026-10-30' })).rejects.toMatchObject({ code: 'DATA_UNAVAILABLE' });
    });
  });
});

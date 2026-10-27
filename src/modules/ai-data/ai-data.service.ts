import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import aiDataConfig from './ai-data.config';
import { Signal, SignalDocument } from '../signals/schemas/signal.schema';
import {
  NewsArticle,
  NewsArticleDocument,
} from '../news/schemas/news-article.schema';
import {
  CACHE_TTL,
  DATA_SOURCE,
  INDEX_PROXIES,
  MAX_BATCH_SYMBOLS,
  MAX_EARNINGS_RANGE_DAYS,
  MAX_MOVERS_UNIVERSE,
  SECTOR_ETFS,
  SYMBOL_REGEX,
} from './ai-data.constants';
import { AiDataException } from './ai-data.exception';
import { TwelveDataClient } from './twelve-data.client';
import {
  TdEarning,
  TdEarnings,
  TdEarningsCalendar,
  TdMarketState,
  TdProfile,
  TdQuote,
  TdQuoteBatch,
  TdStatistics,
  TdTimeSeries,
} from './twelve-data.types';
import { parseSymbol } from './pipes/symbol.pipe';
import {
  AiEarningsQueryDto,
  AiNewsQueryDto,
  AiSignalsQueryDto,
} from './dto/ai-data.dto';

// Data layer for the internal AI API.
// Rules: no fallback values, no synthetic data, no reuse of MarketDataService caches.
// Missing upstream data → 503 DATA_UNAVAILABLE; unknown ticker → 404 SYMBOL_NOT_FOUND.

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

export interface AiQuote {
  symbol: string;
  name: string | null;
  exchange: string | null;
  price: number;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  change: number | null;
  percentChange: number | null;
  volume: number | null;
  avgVolume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  isMarketOpen: boolean | null;
  asOf: string;
}

export interface AiEarningsItem {
  symbol: string | null;
  companyName: string | null;
  date: string | null;
  time: 'BMO' | 'AMC' | 'UNKNOWN';
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
}

interface QuoteBatchResult {
  quotes: Map<string, AiQuote>;
  notFound: string[];
  unavailable: string[];
}

export interface Bar {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

type LeanSignal = Signal & { _id: Types.ObjectId; updatedAt?: Date };
type LeanNews = NewsArticle & { _id: Types.ObjectId };

const MAX_CACHE_ENTRIES = 2000;

// Parse a Twelve Data numeric field. Missing / non-numeric → null, never 0.
const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

const unixToIso = (value: unknown): string | null => {
  const n = num(value);
  return n !== null && n > 0 ? new Date(n * 1000).toISOString() : null;
};

// Twelve Data datetimes are requested with timezone=UTC: "YYYY-MM-DD" or "YYYY-MM-DD HH:mm:ss"
const utcDatetimeToIso = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?$/.exec(
    value.trim(),
  );
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2] ?? '00:00:00'}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const toIso = (value: Date | string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// Oldest timestamp wins, so an aggregate never overstates freshness
const oldestAsOf = (items: { asOf: string }[]): string | null =>
  items.length ? items.map((i) => i.asOf).sort()[0] : null;

const parseSince = (value: string | undefined, field: string): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw AiDataException.badRequest(`${field} must be an ISO-8601 date`);
  }
  return d;
};

const orNull = <T>(value: T | undefined): T | null =>
  value === undefined ? null : value;

@Injectable()
export class AiDataService {
  private readonly logger = new Logger(AiDataService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly td: TwelveDataClient,
    @Inject(aiDataConfig.KEY)
    private readonly config: ConfigType<typeof aiDataConfig>,
    @InjectModel(Signal.name)
    private readonly signalModel: Model<SignalDocument>,
    @InjectModel(NewsArticle.name)
    private readonly newsModel: Model<NewsArticleDocument>,
  ) {}

  // ─── Cache (own "ai:" namespace; only successful results are stored) ───

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttlSeconds: number): void {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (v.expiresAt < now) this.cache.delete(k);
      }
      if (this.cache.size >= MAX_CACHE_ENTRIES) this.cache.clear();
    }
    this.cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  private async cached<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<T> {
    const hit = this.getCache<T>(key);
    if (hit !== null) return hit;
    const data = await load(); // throws on failure → nothing cached
    this.setCache(key, data, ttlSeconds);
    return data;
  }

  private async fromDb<T>(query: Promise<T>): Promise<T> {
    try {
      return await query;
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : 'Error';
      this.logger.error(`MongoDB query failed: ${name}`);
      throw AiDataException.dataUnavailable(
        'Database is currently unavailable',
      );
    }
  }

  private freshness() {
    return { source: DATA_SOURCE, isDelayed: this.config.isDelayed };
  }

  // ─── Quotes ────────────────────────────────────────────────

  private normalizeQuote(raw: TdQuote, requested: string): AiQuote | null {
    const price = num(raw.close);
    const asOf =
      unixToIso(raw.last_quote_at) ??
      unixToIso(raw.timestamp) ??
      utcDatetimeToIso(raw.datetime);
    if (price === null || asOf === null) return null;

    return {
      symbol: requested,
      name: str(raw.name),
      exchange: str(raw.exchange),
      price,
      open: num(raw.open),
      high: num(raw.high),
      low: num(raw.low),
      previousClose: num(raw.previous_close),
      change: num(raw.change),
      percentChange: num(raw.percent_change),
      volume: num(raw.volume),
      avgVolume: num(raw.average_volume),
      fiftyTwoWeekHigh: num(raw.fifty_two_week?.high),
      fiftyTwoWeekLow: num(raw.fifty_two_week?.low),
      isMarketOpen:
        typeof raw.is_market_open === 'boolean' ? raw.is_market_open : null,
      asOf,
    };
  }

  /**
   * Quotes for validated symbols, served from the per-symbol "ai:quote:" cache where fresh.
   * Uncached symbols are fetched in ONE batch /quote call. A whole-call failure throws 503;
   * per-symbol problems are reported in notFound / unavailable.
   */
  async fetchQuotes(symbols: string[]): Promise<QuoteBatchResult> {
    const quotes = new Map<string, AiQuote>();
    const notFound: string[] = [];
    const unavailable: string[] = [];

    const toFetch = symbols.filter((s) => {
      const hit = this.getCache<AiQuote>(`ai:quote:${s}`);
      if (hit) quotes.set(s, hit);
      return !hit;
    });

    if (toFetch.length === 1) {
      const [symbol] = toFetch;
      try {
        const raw = await this.td.get<TdQuote>(
          '/quote',
          { symbol, timezone: 'UTC' },
          symbol,
        );
        const quote = this.normalizeQuote(raw, symbol);
        if (quote) quotes.set(symbol, quote);
        else unavailable.push(symbol);
      } catch (err) {
        if (err instanceof AiDataException && err.code === 'SYMBOL_NOT_FOUND') {
          notFound.push(symbol);
        } else {
          throw err;
        }
      }
    } else if (toFetch.length > 1) {
      const raw = await this.td.get<TdQuoteBatch>('/quote', {
        symbol: toFetch.join(','),
        timezone: 'UTC',
      });
      for (const symbol of toFetch) {
        const entry = Array.isArray(raw)
          ? raw.find((r) => r?.symbol === symbol)
          : raw?.[symbol];
        if (!entry) {
          unavailable.push(symbol);
        } else if (TwelveDataClient.isErrorPayload(entry)) {
          if (TwelveDataClient.isNotFoundPayload(entry)) notFound.push(symbol);
          else unavailable.push(symbol);
        } else {
          const quote = this.normalizeQuote(entry, symbol);
          if (quote) quotes.set(symbol, quote);
          else unavailable.push(symbol);
        }
      }
    }

    for (const symbol of toFetch) {
      const quote = quotes.get(symbol);
      if (quote) this.setCache(`ai:quote:${symbol}`, quote, CACHE_TTL.quote);
    }

    return { quotes, notFound, unavailable };
  }

  async getQuote(symbol: string) {
    const { quotes, notFound } = await this.fetchQuotes([symbol]);
    if (notFound.length) throw AiDataException.symbolNotFound(symbol);
    const quote = quotes.get(symbol);
    if (!quote) {
      throw AiDataException.dataUnavailable(
        `Quote data unavailable for ${symbol}`,
      );
    }
    return { ...quote, ...this.freshness() };
  }

  async getQuotes(rawSymbols: string) {
    const symbols = [
      ...new Set(
        rawSymbols
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map(parseSymbol),
      ),
    ];
    if (symbols.length === 0) {
      throw AiDataException.badRequest(
        'symbols must contain at least one ticker',
      );
    }
    if (symbols.length > MAX_BATCH_SYMBOLS) {
      throw AiDataException.badRequest(
        `symbols accepts at most ${MAX_BATCH_SYMBOLS} tickers`,
      );
    }

    const { quotes, notFound, unavailable } = await this.fetchQuotes(symbols);
    const items = symbols
      .map((s) => quotes.get(s))
      .filter((q): q is AiQuote => !!q);
    if (items.length === 0 && unavailable.length > 0) {
      throw AiDataException.dataUnavailable();
    }

    return {
      items,
      missing: symbols.filter(
        (s) => notFound.includes(s) || unavailable.includes(s),
      ),
      ...this.freshness(),
      asOf: oldestAsOf(items),
    };
  }

  // ─── Market Overview ───────────────────────────────────────

  private async getQuoteGroup(symbols: string[], groupName: string) {
    return this.cached(
      `ai:overview:${groupName}`,
      CACHE_TTL.overview,
      async () => {
        const { quotes } = await this.fetchQuotes(symbols);
        if (quotes.size === 0) {
          throw AiDataException.dataUnavailable(
            `No ${groupName} data available`,
          );
        }
        return {
          quotes: Object.fromEntries(quotes),
          missing: symbols.filter((s) => !quotes.has(s)),
        };
      },
    );
  }

  private async getMarketStatus() {
    return this.cached(
      'ai:overview:market-state',
      CACHE_TTL.overview,
      async () => {
        const raw = await this.td.get<TdMarketState[]>('/market_state', {
          exchange: 'NYSE',
        });
        const rows = Array.isArray(raw) ? raw : [];
        const nyse =
          rows.find((r) => r?.code === 'XNYS') ??
          rows.find((r) => r?.name === 'NYSE');
        if (!nyse || typeof nyse.is_market_open !== 'boolean') {
          throw AiDataException.dataUnavailable('Market status unavailable');
        }
        return {
          isOpen: nyse.is_market_open,
          exchange: 'NYSE',
          timeToOpen: str(nyse.time_to_open),
          timeToClose: str(nyse.time_to_close),
        };
      },
    );
  }

  async getMarketOverview() {
    const [indexGroup, sectorGroup, marketStatus] = await Promise.all([
      this.getQuoteGroup(
        INDEX_PROXIES.map((i) => i.symbol),
        'indices',
      ),
      this.getQuoteGroup(
        SECTOR_ETFS.map((s) => s.symbol),
        'sectors',
      ),
      this.getMarketStatus(),
    ]);

    const indices = INDEX_PROXIES.flatMap(({ symbol, label }) => {
      const q = indexGroup.quotes[symbol];
      if (!q) return [];
      return [
        {
          symbol,
          label,
          price: q.price,
          change: q.change,
          percentChange: q.percentChange,
          volume: q.volume,
          asOf: q.asOf,
        },
      ];
    });

    const sectors = SECTOR_ETFS.flatMap(({ symbol, sectorName }) => {
      const q = sectorGroup.quotes[symbol];
      if (!q) return [];
      return [
        {
          symbol,
          sectorName,
          price: q.price,
          change: q.change,
          percentChange: q.percentChange,
          asOf: q.asOf,
        },
      ];
    });

    return {
      indices,
      sectors,
      marketStatus,
      missing: [...indexGroup.missing, ...sectorGroup.missing],
      ...this.freshness(),
      asOf: oldestAsOf([...indices, ...sectors]),
    };
  }

  // ─── History (OHLCV) ───────────────────────────────────────

  async getHistory(symbol: string, interval: string, outputsize: number) {
    return this.cached(
      `ai:history:${symbol}:${interval}:${outputsize}`,
      CACHE_TTL.history,
      async () => {
        const raw = await this.td.get<TdTimeSeries>(
          '/time_series',
          { symbol, interval, outputsize: String(outputsize), timezone: 'UTC' },
          symbol,
        );

        // Bars with any missing OHLC value are dropped, never filled
        const bars: Bar[] = [];
        for (const v of Array.isArray(raw?.values) ? raw.values : []) {
          const [open, high, low, close] = [
            v?.open,
            v?.high,
            v?.low,
            v?.close,
          ].map(num);
          if (
            utcDatetimeToIso(v?.datetime) === null ||
            open === null ||
            high === null ||
            low === null ||
            close === null
          ) {
            continue;
          }
          bars.push({
            datetime: v.datetime,
            open,
            high,
            low,
            close,
            volume: num(v.volume),
          });
        }

        if (bars.length === 0) {
          throw AiDataException.dataUnavailable(
            `No price history available for ${symbol}`,
          );
        }

        // Twelve Data returns newest first
        const asOf = bars
          .map((b) => utcDatetimeToIso(b.datetime))
          .sort()
          .pop();

        return {
          symbol: str(raw.meta?.symbol) ?? symbol,
          interval,
          currency: str(raw.meta?.currency),
          exchangeTimezone: str(raw.meta?.exchange_timezone),
          bars,
          ...this.freshness(),
          asOf,
        };
      },
    );
  }

  // ─── Company Profile ───────────────────────────────────────

  async getProfile(symbol: string) {
    const profile = await this.cached(
      `ai:profile:${symbol}`,
      CACHE_TTL.profile,
      async () => {
        const raw = await this.td.get<TdProfile>(
          '/profile',
          { symbol },
          symbol,
        );
        const resolved = str(raw?.symbol);
        if (!resolved) {
          throw AiDataException.dataUnavailable(
            `Profile unavailable for ${symbol}`,
          );
        }
        return {
          symbol: resolved,
          name: str(raw.name),
          sector: str(raw.sector),
          industry: str(raw.industry),
          description: str(raw.description),
          exchange: str(raw.exchange),
          country: str(raw.country),
          website: str(raw.website),
          retrievedAt: new Date().toISOString(),
        };
      },
    );

    // Statistics failure is non-fatal: marketCap is null, and the null is not cached
    let marketCap: number | null = null;
    try {
      marketCap = await this.cached(
        `ai:profile-marketcap:${symbol}`,
        CACHE_TTL.profile,
        async () => {
          const stats = await this.td.get<TdStatistics>(
            '/statistics',
            { symbol },
            symbol,
          );
          const value = num(
            stats?.statistics?.valuations_metrics?.market_capitalization,
          );
          if (value === null) throw AiDataException.dataUnavailable();
          return value;
        },
      );
    } catch {
      marketCap = null;
    }

    return { ...profile, marketCap, source: DATA_SOURCE };
  }

  // ─── Movers (computed from a configured universe) ──────────

  private getMoversUniverse(): string[] {
    const all = this.config.moversUniverse
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const invalid = all.filter((s) => !SYMBOL_REGEX.test(s));
    if (invalid.length) {
      this.logger.warn(
        `AI_MOVERS_UNIVERSE: ignoring invalid tickers ${invalid.join(',')}`,
      );
    }
    return [...new Set(all.filter((s) => SYMBOL_REGEX.test(s)))];
  }

  async getMovers(direction: 'gainers' | 'losers' | 'active', limit: number) {
    const universe = this.getMoversUniverse();
    if (universe.length === 0) {
      throw AiDataException.dataUnavailable(
        'Movers universe is not configured (AI_MOVERS_UNIVERSE)',
      );
    }
    if (universe.length > MAX_MOVERS_UNIVERSE) {
      this.logger.warn(
        `AI_MOVERS_UNIVERSE has ${universe.length} tickers; max is ${MAX_MOVERS_UNIVERSE}`,
      );
      throw AiDataException.dataUnavailable('Movers universe is misconfigured');
    }

    const { quotes } = await this.fetchQuotes(universe);
    if (quotes.size === 0) throw AiDataException.dataUnavailable();

    const all = [...quotes.values()];
    const pct = (q: AiQuote) => q.percentChange ?? 0;
    let ranked: AiQuote[];
    if (direction === 'gainers') {
      ranked = all
        .filter((q) => q.percentChange !== null && q.percentChange > 0)
        .sort((a, b) => pct(b) - pct(a));
    } else if (direction === 'losers') {
      ranked = all
        .filter((q) => q.percentChange !== null && q.percentChange < 0)
        .sort((a, b) => pct(a) - pct(b));
    } else {
      ranked = all
        .filter((q) => q.volume !== null)
        .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    }

    const items = ranked.slice(0, limit).map((q) => ({
      symbol: q.symbol,
      name: q.name,
      price: q.price,
      change: q.change,
      percentChange: q.percentChange,
      volume: q.volume,
      asOf: q.asOf,
    }));

    return {
      direction,
      universe,
      universeSize: universe.length,
      items,
      missing: universe.filter((s) => !quotes.has(s)),
      ...this.freshness(),
      asOf: oldestAsOf(items),
    };
  }

  // ─── Earnings ──────────────────────────────────────────────

  static normalizeEarningsTime(value: unknown): 'BMO' | 'AMC' | 'UNKNOWN' {
    const t = typeof value === 'string' ? value.toLowerCase() : '';
    if (/pre[ -]?market|before|bmo/.test(t)) return 'BMO';
    if (/after|post[ -]?market|amc/.test(t)) return 'AMC';
    return 'UNKNOWN';
  }

  private toEarningsItem(
    e: TdEarning,
    symbol: string | null,
    companyName: string | null,
  ): AiEarningsItem {
    return {
      symbol: str(e?.symbol) ?? symbol,
      companyName: str(e?.name) ?? companyName,
      date: str(e?.date),
      time: AiDataService.normalizeEarningsTime(e?.time),
      epsEstimate: num(e?.eps_estimate),
      epsActual: num(e?.eps_actual),
      revenueEstimate: num(e?.revenue_estimate), // not provided by Twelve Data /earnings → null
    };
  }

  async getEarnings(query: AiEarningsQueryDto) {
    const hasRange = !!(query.from || query.to);
    if (query.symbol && hasRange) {
      throw AiDataException.badRequest(
        'Use either symbol or from/to, not both',
      );
    }
    if (!query.symbol && !hasRange) {
      throw AiDataException.badRequest('Provide symbol, or both from and to');
    }

    if (query.symbol) {
      const symbol = parseSymbol(query.symbol);
      return this.cached(
        `ai:earnings:symbol:${symbol}`,
        CACHE_TTL.earnings,
        async () => {
          const raw = await this.td.get<TdEarnings>(
            '/earnings',
            { symbol },
            symbol,
          );
          if (!Array.isArray(raw?.earnings)) {
            throw AiDataException.dataUnavailable(
              `Earnings unavailable for ${symbol}`,
            );
          }
          const companyName = str(raw.meta?.name);
          const items = raw.earnings
            .map((e) => this.toEarningsItem(e, symbol, companyName))
            .filter((i) => i.date !== null)
            .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
          return {
            mode: 'symbol',
            symbol,
            items,
            source: DATA_SOURCE,
            retrievedAt: new Date().toISOString(),
          };
        },
      );
    }

    const { from, to } = query;
    if (!from || !to) {
      throw AiDataException.badRequest(
        'Both from and to are required for a date range',
      );
    }
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw AiDataException.badRequest(
        'from/to must be valid YYYY-MM-DD dates',
      );
    }
    if (fromDate > toDate) {
      throw AiDataException.badRequest('from must be on or before to');
    }
    if (
      (toDate.getTime() - fromDate.getTime()) / 86400000 >
      MAX_EARNINGS_RANGE_DAYS
    ) {
      throw AiDataException.badRequest(
        `Date range may span at most ${MAX_EARNINGS_RANGE_DAYS} days`,
      );
    }

    return this.cached(
      `ai:earnings:range:${from}:${to}`,
      CACHE_TTL.earnings,
      async () => {
        const raw = await this.td.get<TdEarningsCalendar>(
          '/earnings_calendar',
          { start_date: from, end_date: to },
        );
        const byDate = raw?.earnings;
        if (!byDate || typeof byDate !== 'object' || Array.isArray(byDate)) {
          throw AiDataException.dataUnavailable(
            'Earnings calendar unavailable',
          );
        }
        const items = Object.entries(byDate)
          .flatMap(([date, rows]) =>
            (Array.isArray(rows) ? rows : []).map((e) =>
              this.toEarningsItem({ date, ...e }, null, null),
            ),
          )
          .filter((i) => i.symbol !== null && i.date !== null)
          .sort(
            (a, b) =>
              (a.date ?? '').localeCompare(b.date ?? '') ||
              (a.symbol ?? '').localeCompare(b.symbol ?? ''),
          );
        return {
          mode: 'range',
          from,
          to,
          items,
          source: DATA_SOURCE,
          retrievedAt: new Date().toISOString(),
        };
      },
    );
  }

  // ─── News (news_articles collection only) ──────────────────

  async getNews(query: AiNewsQueryDto) {
    const symbol = query.symbol ? parseSymbol(query.symbol) : null;
    const category =
      query.category && query.category !== 'all' ? query.category : null;
    const since = parseSince(query.since, 'since');
    const limit = query.limit ?? 20;

    const key = `ai:news:${symbol ?? ''}:${category ?? ''}:${since?.toISOString() ?? ''}:${limit}`;
    return this.cached(key, CACHE_TTL.news, async () => {
      const filter: Record<string, unknown> = {};
      if (symbol) filter.relatedSymbols = symbol;
      if (category) filter.category = category;
      if (since) filter.publishedAt = { $gte: since };

      const docs = await this.fromDb(
        this.newsModel
          .find(filter)
          .select(
            'title source url publishedAt summary category relatedSymbols isDeskPublication',
          )
          .sort({ publishedAt: -1, _id: -1 })
          .limit(limit)
          .lean<LeanNews[]>()
          .exec(),
      );

      const items = docs.map((d) => ({
        id: String(d._id),
        title: orNull(d.title),
        source: orNull(d.source),
        url: str(d.url),
        publishedAt: toIso(d.publishedAt),
        summary: orNull(d.summary),
        category: orNull(d.category),
        relatedSymbols: Array.isArray(d.relatedSymbols) ? d.relatedSymbols : [],
        isDeskPublication: d.isDeskPublication === true,
      }));

      return { items, count: items.length };
    });
  }

  // ─── Signals (adminStatus: "active" only, values as stored) ─

  private toAiSignal(s: LeanSignal) {
    return {
      signalId: orNull(s.signalId),
      symbol: orNull(s.symbol),
      companyName: orNull(s.companyName),
      assetType: orNull(s.assetType),
      type: orNull(s.type),
      direction: orNull(s.direction),
      status: orNull(s.status),
      entry: orNull(s.entry),
      target: orNull(s.target),
      stopLoss: orNull(s.stopLoss),
      lastExit: orNull(s.lastExit),
      returnPct: orNull(s.returnPct),
      riskReward: orNull(s.riskReward),
      typicalHold: orNull(s.typicalHold),
      openedAt: toIso(s.openedAt),
      closedAt: toIso(s.closedAt),
      updatedAt: toIso(s.updatedAt),
      rationaleTitle: orNull(s.rationaleTitle),
      signalRationale: orNull(s.signalRationale),
      ruleHits: {
        conditionDetails: orNull(s.conditionDetails),
        marketCondition: orNull(s.marketCondition),
        priceBehavior: orNull(s.priceBehavior),
        momentum: orNull(s.momentum),
        liquidity: orNull(s.liquidity),
        risk: orNull(s.risk),
        setup: orNull(s.setup),
      },
    };
  }

  async getSignals(query: AiSignalsQueryDto) {
    const base: Record<string, unknown> = { adminStatus: 'active' };
    if (query.symbol) base.symbol = parseSymbol(query.symbol);
    const openedSince = parseSince(query.openedSince, 'openedSince');
    const closedSince = parseSince(query.closedSince, 'closedSince');
    if (openedSince) base.openedAt = { $gte: openedSince };
    if (closedSince) base.closedAt = { $gte: closedSince };

    const filter = query.status ? { ...base, status: query.status } : base;

    const [docs, grouped] = await Promise.all([
      this.fromDb(
        this.signalModel
          .find(filter)
          .sort({ openedAt: -1, _id: -1 })
          .limit(query.limit ?? 50)
          .lean<LeanSignal[]>()
          .exec(),
      ),
      // counts use every filter except status, so the AI sees the full NEW/OPEN/CLOSED split
      this.fromDb(
        this.signalModel
          .aggregate<{
            _id: string;
            count: number;
          }>([
            { $match: base },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ])
          .exec(),
      ),
    ]);

    const countOf = (status: string) =>
      grouped.find((g) => g._id === status)?.count ?? 0;

    return {
      items: docs.map((d) => this.toAiSignal(d)),
      counts: {
        new: countOf('NEW'),
        open: countOf('OPEN'),
        closed: countOf('CLOSED'),
      },
    };
  }

  async getSignal(signalId: string) {
    const doc = await this.fromDb(
      this.signalModel
        .findOne({ signalId: String(signalId), adminStatus: 'active' })
        .lean<LeanSignal>()
        .exec(),
    );
    if (!doc) throw AiDataException.signalNotFound(signalId);
    return this.toAiSignal(doc);
  }
}

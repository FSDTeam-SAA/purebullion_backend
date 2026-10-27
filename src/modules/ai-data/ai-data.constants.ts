// Static reference lists for the internal AI data API. These are labels only —
// every number returned to the AI comes from Twelve Data or MongoDB.

export const DATA_SOURCE = 'twelvedata';

export const SYMBOL_REGEX = /^[A-Z][A-Z.-]{0,9}$/;

// Same whitelist as GetChartDto in the market-data module
export const HISTORY_INTERVALS = [
  '1min',
  '5min',
  '15min',
  '30min',
  '1h',
  '2h',
  '4h',
  '1day',
  '1week',
  '1month',
] as const;

export const MAX_BATCH_SYMBOLS = 20;
export const MAX_HISTORY_OUTPUTSIZE = 500;
export const MAX_MOVERS_UNIVERSE = 120; // Twelve Data batch /quote limit
export const MAX_EARNINGS_RANGE_DAYS = 31;

// Same six ETF proxies the existing /market-data/indices endpoint uses
export const INDEX_PROXIES = [
  { symbol: 'SPY', label: 'S&P 500 (SPY)' },
  { symbol: 'QQQ', label: 'NASDAQ 100 (QQQ)' },
  { symbol: 'DIA', label: 'DOW Jones (DIA)' },
  { symbol: 'IWM', label: 'Russell 2000 (IWM)' },
  { symbol: 'VXX', label: 'VIX Volatility (VXX)' },
  { symbol: 'TLT', label: '20Y Treasury (TLT)' },
];

// SPDR Select Sector ETFs
export const SECTOR_ETFS = [
  { symbol: 'XLK', sectorName: 'Technology' },
  { symbol: 'XLF', sectorName: 'Financials' },
  { symbol: 'XLV', sectorName: 'Health Care' },
  { symbol: 'XLY', sectorName: 'Consumer Discretionary' },
  { symbol: 'XLP', sectorName: 'Consumer Staples' },
  { symbol: 'XLE', sectorName: 'Energy' },
  { symbol: 'XLI', sectorName: 'Industrials' },
  { symbol: 'XLB', sectorName: 'Materials' },
  { symbol: 'XLU', sectorName: 'Utilities' },
  { symbol: 'XLRE', sectorName: 'Real Estate' },
  { symbol: 'XLC', sectorName: 'Communication Services' },
];

// Cache TTLs in seconds (keys are all prefixed with "ai:")
export const CACHE_TTL = {
  quote: 30,
  overview: 60,
  history: 15 * 60,
  profile: 24 * 60 * 60,
  earnings: 60 * 60,
  news: 5 * 60,
};

export const AI_ERROR = {
  DATA_UNAVAILABLE: 'DATA_UNAVAILABLE',
  SYMBOL_NOT_FOUND: 'SYMBOL_NOT_FOUND',
  SIGNAL_NOT_FOUND: 'SIGNAL_NOT_FOUND',
  INVALID_SYMBOL: 'INVALID_SYMBOL',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type AiErrorCode = (typeof AI_ERROR)[keyof typeof AI_ERROR];

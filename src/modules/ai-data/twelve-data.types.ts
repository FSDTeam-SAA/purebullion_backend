// Raw Twelve Data payload shapes (only the fields the AI data API reads).
// Numeric values arrive as strings or numbers, so they are typed loosely and
// parsed with num() in the service.

export type TdScalar = string | number | null | undefined;

export interface TdErrorPayload {
  code?: number;
  message?: string;
  status?: string;
}

export interface TdQuote {
  symbol?: string;
  name?: string;
  exchange?: string;
  datetime?: string;
  timestamp?: TdScalar;
  last_quote_at?: TdScalar;
  open?: TdScalar;
  high?: TdScalar;
  low?: TdScalar;
  close?: TdScalar;
  volume?: TdScalar;
  previous_close?: TdScalar;
  change?: TdScalar;
  percent_change?: TdScalar;
  average_volume?: TdScalar;
  is_market_open?: unknown;
  fifty_two_week?: { low?: TdScalar; high?: TdScalar };
}

export type TdQuoteBatch = Record<string, TdQuote | TdErrorPayload> | TdQuote[];

export interface TdMarketState {
  name?: string;
  code?: string;
  is_market_open?: unknown;
  time_to_open?: string;
  time_to_close?: string;
}

export interface TdBar {
  datetime?: string;
  open?: TdScalar;
  high?: TdScalar;
  low?: TdScalar;
  close?: TdScalar;
  volume?: TdScalar;
}

export interface TdTimeSeries {
  meta?: { symbol?: string; currency?: string; exchange_timezone?: string };
  values?: TdBar[];
}

export interface TdProfile {
  symbol?: string;
  name?: string;
  sector?: string;
  industry?: string;
  description?: string;
  exchange?: string;
  country?: string;
  website?: string;
}

export interface TdStatistics {
  statistics?: { valuations_metrics?: { market_capitalization?: TdScalar } };
}

export interface TdEarning {
  symbol?: string;
  name?: string;
  date?: string;
  time?: string;
  eps_estimate?: TdScalar;
  eps_actual?: TdScalar;
  revenue_estimate?: TdScalar;
}

export interface TdEarnings {
  meta?: { name?: string };
  earnings?: TdEarning[];
}

export interface TdEarningsCalendar {
  earnings?: Record<string, TdEarning[]>;
}

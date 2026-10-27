import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiDataException } from './ai-data.exception';
import { TdErrorPayload } from './twelve-data.types';

// Strict Twelve Data client for the AI data API.
// Unlike MarketDataService.fetchTD it never returns null or fallback data:
// any failure throws DATA_UNAVAILABLE (503) or SYMBOL_NOT_FOUND (404).
// Logs carry the endpoint path only — never the URL, query string or API key.

const REQUEST_TIMEOUT_MS = 8000;

@Injectable()
export class TwelveDataClient {
  private readonly logger = new Logger(TwelveDataClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('twelvedata.baseUrl') ||
      'https://api.twelvedata.com';
    this.apiKey = this.configService.get<string>('twelvedata.apiKey') || '';
  }

  // True when the payload is a Twelve Data error object ({ code, message, status: 'error' })
  static isErrorPayload(payload: unknown): payload is TdErrorPayload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return false;
    }
    const p = payload as Record<string, unknown>;
    if (p.status === 'error') return true;
    return typeof p.code === 'number' && p.code >= 400 && !('symbol' in p);
  }

  // Twelve Data reports unknown tickers as code 404 (or 400 "... not found")
  static isNotFoundPayload(payload: TdErrorPayload): boolean {
    if (payload.code === 404) return true;
    return payload.code === 400 && /not found/i.test(payload.message ?? '');
  }

  /**
   * GET a Twelve Data endpoint.
   * @param notFoundSymbol when set, an upstream "not found" error becomes 404 SYMBOL_NOT_FOUND
   */
  async get<T>(
    endpoint: string,
    params: Record<string, string>,
    notFoundSymbol?: string,
  ): Promise<T> {
    if (!this.apiKey) {
      this.logger.warn(
        `Twelve Data ${endpoint} skipped: TWELVE_DATA_API_KEY is not configured`,
      );
      throw AiDataException.dataUnavailable(
        'Market data provider is not configured',
      );
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('apikey', this.apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let payload: unknown;
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        this.logger.warn(`Twelve Data ${endpoint} returned HTTP ${res.status}`);
        throw AiDataException.dataUnavailable();
      }
      payload = await res.json();
    } catch (err: unknown) {
      if (err instanceof AiDataException) throw err;
      // Only the error name is logged: fetch error messages/causes can echo the request URL
      const name = err instanceof Error ? err.name : 'Error';
      this.logger.warn(`Twelve Data ${endpoint} request failed: ${name}`);
      throw AiDataException.dataUnavailable();
    } finally {
      clearTimeout(timeout);
    }

    if (TwelveDataClient.isErrorPayload(payload)) {
      if (notFoundSymbol && TwelveDataClient.isNotFoundPayload(payload)) {
        throw AiDataException.symbolNotFound(notFoundSymbol);
      }
      this.logger.warn(
        `Twelve Data ${endpoint} returned error payload (code ${payload.code ?? 'n/a'})`,
      );
      throw AiDataException.dataUnavailable(
        payload.code === 403
          ? 'Market data provider plan does not include this data'
          : 'Market data is currently unavailable',
      );
    }

    return payload as T;
  }
}

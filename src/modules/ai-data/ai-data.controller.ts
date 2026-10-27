import {
  Controller,
  Get,
  Param,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AiDataService } from './ai-data.service';
import { ServiceTokenGuard } from './guards/service-token.guard';
import { AiDataExceptionFilter } from './filters/ai-data-exception.filter';
import { SymbolPipe } from './pipes/symbol.pipe';
import {
  AiEarningsQueryDto,
  AiHistoryQueryDto,
  AiMoversQueryDto,
  AiNewsQueryDto,
  AiQuotesQueryDto,
  AiSignalsQueryDto,
} from './dto/ai-data.dto';

// Internal, read-only data API for the purebullion-ai service.
// Auth: Bearer AI_SERVICE_TOKEN (not the user JWT). Global throttler skipped —
// the service token is the access control here.

@Controller('internal/ai')
@SkipThrottle()
@UseGuards(ServiceTokenGuard)
@UseFilters(AiDataExceptionFilter)
export class AiDataController {
  constructor(private readonly aiDataService: AiDataService) {}

  // ─── Indices + Sectors + Market Status ───────────────────────
  @Get('market-overview')
  async getMarketOverview() {
    return {
      message: 'Market overview fetched successfully',
      data: await this.aiDataService.getMarketOverview(),
    };
  }

  // ─── Batch Quotes ─────────────────────────────────────────────
  @Get('quotes')
  async getQuotes(@Query() query: AiQuotesQueryDto) {
    return {
      message: 'Quotes fetched successfully',
      data: await this.aiDataService.getQuotes(query.symbols),
    };
  }

  // ─── Single Quote ─────────────────────────────────────────────
  @Get('quote/:symbol')
  async getQuote(@Param('symbol', SymbolPipe) symbol: string) {
    return {
      message: 'Quote fetched successfully',
      data: await this.aiDataService.getQuote(symbol),
    };
  }

  // ─── OHLCV History ────────────────────────────────────────────
  @Get('history/:symbol')
  async getHistory(
    @Param('symbol', SymbolPipe) symbol: string,
    @Query() query: AiHistoryQueryDto,
  ) {
    const data = await this.aiDataService.getHistory(
      symbol,
      query.interval ?? '1day',
      query.outputsize ?? 90,
    );
    return { message: 'History fetched successfully', data };
  }

  // ─── Company Profile (+ market cap) ───────────────────────────
  @Get('profile/:symbol')
  async getProfile(@Param('symbol', SymbolPipe) symbol: string) {
    return {
      message: 'Profile fetched successfully',
      data: await this.aiDataService.getProfile(symbol),
    };
  }

  // ─── Movers over the configured universe ──────────────────────
  @Get('movers')
  async getMovers(@Query() query: AiMoversQueryDto) {
    const data = await this.aiDataService.getMovers(
      query.direction,
      query.limit ?? 10,
    );
    return { message: 'Movers fetched successfully', data };
  }

  // ─── Earnings (by symbol or date range) ───────────────────────
  @Get('earnings')
  async getEarnings(@Query() query: AiEarningsQueryDto) {
    return {
      message: 'Earnings fetched successfully',
      data: await this.aiDataService.getEarnings(query),
    };
  }

  // ─── News (news_articles collection) ──────────────────────────
  @Get('news')
  async getNews(@Query() query: AiNewsQueryDto) {
    return {
      message: 'News fetched successfully',
      data: await this.aiDataService.getNews(query),
    };
  }

  // ─── Signals (active only, as stored) ─────────────────────────
  @Get('signals')
  async getSignals(@Query() query: AiSignalsQueryDto) {
    return {
      message: 'Signals fetched successfully',
      data: await this.aiDataService.getSignals(query),
    };
  }

  @Get('signals/:signalId')
  async getSignal(@Param('signalId') signalId: string) {
    return {
      message: 'Signal fetched successfully',
      data: await this.aiDataService.getSignal(signalId),
    };
  }
}

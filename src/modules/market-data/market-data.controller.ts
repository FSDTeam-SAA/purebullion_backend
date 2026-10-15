import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { GetChartDto, GetNewsDto, GetEarningsDto } from './dto/market-data.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('market-data')
@UseGuards(JwtAuthGuard)
@Public()
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  // ─── Indices (Top 6 cards: S&P 500, NASDAQ, DOW, RUSSELL, VIX, Treasury) ───
  @Get('indices')
  getIndices() {
    return this.marketDataService.getIndices();
  }

  // ─── Market State (Open / Closed) ────────────────────────────
  @Get('market-state')
  getMarketState() {
    return this.marketDataService.getMarketState();
  }

  // ─── Market News ─────────────────────────────────────────────
  @Get('news')
  getNews(@Query() query: GetNewsDto) {
    return this.marketDataService.getNews(query.symbol, Number(query.limit || 20));
  }

  // ─── Top Gainers ─────────────────────────────────────────────
  @Get('gainers')
  getGainers() {
    return this.marketDataService.getMovers('gainers');
  }

  // ─── Top Losers ──────────────────────────────────────────────
  @Get('losers')
  getLosers() {
    return this.marketDataService.getMovers('losers');
  }

  // ─── Most Active ─────────────────────────────────────────────
  @Get('most-active')
  getMostActive() {
    return this.marketDataService.getMovers('volume');
  }

  // ─── Upcoming Earnings ────────────────────────────────────────
  @Get('earnings')
  getEarnings(@Query() query: GetEarningsDto) {
    return this.marketDataService.getEarnings(
      query.symbol,
      String(query.outputsize || '20'),
    );
  }

  // ─── Candlestick Chart ────────────────────────────────────────
  @Get('chart/:symbol')
  getChart(@Param('symbol') symbol: string, @Query() query: GetChartDto) {
    return this.marketDataService.getChart(
      symbol,
      query.interval || '1day',
      String(query.outputsize || '90'),
    );
  }

  // ─── Full Quote ───────────────────────────────────────────────
  @Get('quote/:symbol')
  getQuote(@Param('symbol') symbol: string) {
    return this.marketDataService.getQuote(symbol);
  }

  // ─── Company Profile ──────────────────────────────────────────
  @Get('profile/:symbol')
  getProfile(@Param('symbol') symbol: string) {
    return this.marketDataService.getProfile(symbol);
  }

  // ─── Key Statistics (Market Cap, P/E, EPS, Shares, Dividend) ─
  @Get('statistics/:symbol')
  getStatistics(@Param('symbol') symbol: string) {
    return this.marketDataService.getStatistics(symbol);
  }

  // ─── Technical Indicators (RSI, MACD, SMA20, SMA50) ─────────
  @Get('indicators/:symbol')
  getTechnicalIndicators(
    @Param('symbol') symbol: string,
    @Query('interval') interval?: string,
  ) {
    return this.marketDataService.getTechnicalIndicators(
      symbol,
      interval || '1day',
    );
  }
}

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { WatchlistService } from './watchlist.service';
import {
  AddWatchlistDto,
  GetWatchlistQueryDto,
  SearchUniverseQueryDto,
} from './dto/watchlist.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { UserDocument } from '../auth/schemas/user.schema';

@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  // ─── 1. Header Stats (Screenshot 1: Tickers tracked, Open signals, Up today, Average move) ──
  @Public()
  @Get('stats')
  getStats(@CurrentUser() user?: UserDocument) {
    return this.watchlistService.getStats(user?._id);
  }

  // ─── 2. Suggestions from Scanner Matches (Screenshot 2 Modal: AVGO, UNH, CAT, LLY) ──
  @Public()
  @Get('suggestions')
  getSuggestions(@CurrentUser() user?: UserDocument) {
    return this.watchlistService.getSuggestions(user?._id);
  }

  // ─── 3. Search Covered Universe (Screenshot 2 Modal Search Bar) ─────────────────────
  @Public()
  @Get('search')
  searchUniverse(@Query() dto: SearchUniverseQueryDto) {
    return this.watchlistService.searchUniverse(dto);
  }

  // ─── 4. Export Watchlist Data (Screenshot 1 "Export" Button) ────────────────────────
  @Public()
  @Get('export')
  async exportWatchlist(
    @Query('format') format = 'json',
    @CurrentUser() user?: UserDocument,
    @Res() res?: Response,
  ) {
    const result = await this.watchlistService.exportWatchlist(user?._id, format);
    if (format === 'csv' && res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="purebullion_watchlist.csv"',
      );
      return res.send(result.data);
    }
    if (res) {
      return res.json(result);
    }
    return result;
  }

  // ─── 5. List Watchlist Items (Screenshot 1 Table with tabs & search) ────────────────
  @Public()
  @Get()
  getWatchlist(
    @CurrentUser() user?: UserDocument,
    @Query() query?: GetWatchlistQueryDto,
  ) {
    return this.watchlistService.getWatchlist(user?._id, query);
  }

  // ─── 6. Add Ticker to Watchlist (Screenshot 2 Modal "+ Add" button) ────────────────
  @Public()
  @Post()
  addTicker(
    @Body() dto: AddWatchlistDto,
    @CurrentUser() user?: UserDocument,
  ) {
    return this.watchlistService.addTicker(user?._id, dto);
  }

  // ─── 7. Remove Ticker from Watchlist (Delete action) ───────────────────────────────
  @Public()
  @Delete(':symbol')
  removeTicker(
    @Param('symbol') symbol: string,
    @CurrentUser() user?: UserDocument,
  ) {
    return this.watchlistService.removeTicker(user?._id, symbol);
  }
}


import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { UserDocument } from '../auth/schemas/user.schema';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ─── Master Dashboard Overview (Aggregates all components) ───
  @Public()
  @Get('overview')
  getDashboardOverview(@CurrentUser() user?: UserDocument) {
    return this.dashboardService.getDashboardOverview(user);
  }

  // ─── Daily Market Briefing ───────────────────────────────────
  @Public()
  @Get('briefing')
  getMarketBriefing() {
    return this.dashboardService.getMarketBriefing();
  }

  // ─── Approaching Entry Setups ────────────────────────────────
  @Public()
  @Get('approaching-entry')
  getApproachingEntry() {
    return this.dashboardService.getApproachingEntry();
  }

  // ─── Watchlist Movement ──────────────────────────────────────
  @Public()
  @Get('watchlist-movement')
  getWatchlistMovement() {
    return this.dashboardService.getWatchlistMovement();
  }

  // ─── Recently Closed Trades ──────────────────────────────────
  @Public()
  @Get('recently-closed')
  getRecentlyClosed() {
    return this.dashboardService.getRecentlyClosed();
  }
}


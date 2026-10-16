import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import {
  GetAdminDashboardQueryDto,
  GetAuditTrailQueryDto,
  ExportDashboardQueryDto,
  CreatePlatformActivityDto,
} from './dto/admin-dashboard.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller(['admin/dashboard', 'admin/statistics'])
@UseGuards(JwtAuthGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  // ─── 1. Complete Master Admin Dashboard Overview ─────────────────────────────
  // Returns all cards, charts, market regime, plans, audit trail, and system status in 1 call
  @Public()
  @Get('overview')
  getOverview(@Query() query: GetAdminDashboardQueryDto): Promise<any> {
    return this.adminDashboardService.getOverview(query);
  }

  // ─── 2. Top 4 KPI Metric Cards (Total Users, Subscription Revenue, Active Signals, Open Alerts) ───
  @Public()
  @Get('kpis')
  getKpiCards(@Query() query: GetAdminDashboardQueryDto): Promise<any> {
    return this.adminDashboardService.getKpiCards(query);
  }

  // ─── 3. Market Regime / Conditions Banner (Risk-On, Score 72) ─────────────────
  @Public()
  @Get('market-conditions')
  getMarketConditions(): Promise<any> {
    return this.adminDashboardService.getMarketConditions();
  }

  // ─── 4. User Growth Analytics Chart (New Users vs Active Users) ──────────────
  @Public()
  @Get('user-growth')
  getUserGrowth(@Query() query: GetAdminDashboardQueryDto): Promise<any> {
    return this.adminDashboardService.getUserGrowth(query);
  }

  // ─── 5. Revenue Overview Chart & Metrics ($184,620, Successful/Failed Payments) ───
  @Public()
  @Get('revenue-overview')
  getRevenueOverview(
    @Query() query: GetAdminDashboardQueryDto,
  ): Promise<any> {
    return this.adminDashboardService.getRevenueOverview(query);
  }

  // ─── 6. Paid Plan Performance (Plan A, Plan B, Plan C Breakdown) ─────────────
  @Public()
  @Get('plan-performance')
  getPlanPerformance(): Promise<any> {
    return this.adminDashboardService.getPlanPerformance();
  }

  // ─── 7. Recent Platform Activity (Audit Trail) ───────────────────────────────
  @Public()
  @Get('recent-activity')
  getRecentActivity(@Query() query: GetAuditTrailQueryDto): Promise<any> {
    return this.adminDashboardService.getRecentActivity(query);
  }

  // ─── 8. System Status (1 Service Degraded, Latency Table & Warning Alert) ────
  @Public()
  @Get('system-status')
  getSystemStatus(): Promise<any> {
    return this.adminDashboardService.getSystemStatus();
  }

  // ─── 9. Export Dashboard Data (Export Button in Top Right) ───────────────────
  @Public()
  @Get('export')
  exportDashboard(@Query() query: ExportDashboardQueryDto): Promise<any> {
    return this.adminDashboardService.exportDashboard(query);
  }

  // ─── 10. Record New Platform Activity Event ──────────────────────────────────
  @Public()
  @Post('activity')
  createActivity(@Body() dto: CreatePlatformActivityDto): Promise<any> {
    return this.adminDashboardService.createActivity(dto);
  }
}


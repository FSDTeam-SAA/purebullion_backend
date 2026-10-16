import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAlertsService } from './admin-alerts.service';
import {
  GetAdminAlertsQueryDto,
  UpdateAdminAlertStatusDto,
  CreateNotificationTemplateDto,
  BroadcastAlertDto,
} from './dto/admin-alerts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('admin/alerts')
@UseGuards(JwtAuthGuard)
export class AdminAlertsController {
  constructor(private readonly adminAlertsService: AdminAlertsService) {}

  // ─── 1. Top 3 KPI Cards (Delivered today: 18,420, Read rate: 72.8%, Failed: 38) ───
  @Public()
  @Get('stats')
  getStats(): Promise<any> {
    return this.adminAlertsService.getStats();
  }

  // ─── 2. Notification Dispatch History Table (Matching Screenshot) ─────────────────
  // Supports ?tab=all|notification-history|templates & ?status=active|suspended & ?page=1 & ?limit=9
  @Public()
  @Get('history')
  getNotificationHistory(
    @Query() query: GetAdminAlertsQueryDto,
  ): Promise<any> {
    return this.adminAlertsService.getNotificationHistory(query);
  }

  // ─── 3. Suspend / Activate Alert (Status Toggle) ───────────────────────────────────
  @Public()
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAdminAlertStatusDto,
  ): Promise<any> {
    return this.adminAlertsService.updateStatus(id, dto.status);
  }

  // ─── 4. Reusable Notification Templates ───────────────────────────────────────────
  @Public()
  @Get('templates')
  getTemplates(): Promise<any> {
    return this.adminAlertsService.getTemplates();
  }

  @Public()
  @Post('templates')
  createTemplate(
    @Body() dto: CreateNotificationTemplateDto,
  ): Promise<any> {
    return this.adminAlertsService.createTemplate(dto);
  }

  // ─── 5. Manual Broadcast Dispatch ─────────────────────────────────────────────────
  @Public()
  @Post('broadcast')
  broadcast(@Body() dto: BroadcastAlertDto): Promise<any> {
    return this.adminAlertsService.broadcast(dto);
  }
}


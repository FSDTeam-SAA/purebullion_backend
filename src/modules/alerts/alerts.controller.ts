import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import {
  GetAlertsQueryDto,
  CreateAlertDto,
  UpdateNotificationSettingsDto,
} from './dto/alerts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { UserDocument } from '../auth/schemas/user.schema';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // ─── 1. List Alerts (Matches UI Table & Tabs) ───────────────────────
  // Supports ?tab=all|signals|market|community|announcements
  // Supports ?search=... & ?page=1 & ?limit=9 & ?unreadOnly=true
  @Public()
  @Get()
  getAlerts(
    @Query() query: GetAlertsQueryDto,
    @CurrentUser() user?: UserDocument,
  ): Promise<any> {
    return this.alertsService.getAlerts(user?._id, query);
  }

  // ─── 2. Header Unread Count & Subtitle Badge (e.g. "3 unread") ──────
  @Public()
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user?: UserDocument): Promise<any> {
    return this.alertsService.getUnreadCount(user?._id);
  }

  // ─── 3. Mark All Alerts as Read (Top "Mark all as read" button) ─────
  @Public()
  @Patch('read-all')
  markAllAsRead(@CurrentUser() user?: UserDocument): Promise<any> {
    return this.alertsService.markAllAsRead(user?._id);
  }

  // ─── 4. Notification Settings & Quiet Hours (Right Drawer) ─────────
  @Public()
  @Get('settings')
  getSettings(@CurrentUser() user?: UserDocument): Promise<any> {
    return this.alertsService.getSettings(user?._id);
  }

  // ─── 5. Update Notification Settings & Quiet Hours ─────────────────
  @Public()
  @Put('settings')
  updateSettings(
    @Body() dto: UpdateNotificationSettingsDto,
    @CurrentUser() user?: UserDocument,
  ): Promise<any> {
    return this.alertsService.updateSettings(user?._id, dto);
  }

  // ─── 6. Mark Single Alert as Read ──────────────────────────────────
  @Public()
  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user?: UserDocument,
  ): Promise<any> {
    return this.alertsService.markAsRead(user?._id, id);
  }

  // ─── 7. Dismiss / Delete Alert ─────────────────────────────────────
  @Public()
  @Delete(':id')
  deleteAlert(
    @Param('id') id: string,
    @CurrentUser() user?: UserDocument,
  ): Promise<any> {
    return this.alertsService.deleteAlert(user?._id, id);
  }

  // ─── 8. Test Trigger Live Alert (Real-Time WebSocket Emission) ─────
  @Public()
  @Post('test-trigger')
  createAlert(
    @Body() dto: CreateAlertDto,
    @CurrentUser() user?: UserDocument,
  ): Promise<any> {
    const payload = {
      ...dto,
      userId: dto.userId || user?._id?.toString(),
    };
    return this.alertsService.createAlert(payload);
  }
}

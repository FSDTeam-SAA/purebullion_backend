import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionAdminService } from '../services/subscription-admin.service';
import { GetSubscribersQueryDto } from '../dto/subscription-query.dto';
import { UpdateSubscriberStatusDto } from '../dto/update-subscriber-status.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleType } from '../../../common/enums/role.enum';

@Controller('subscription/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
export class SubscriptionAdminController {
  constructor(private readonly adminService: SubscriptionAdminService) {}

  /**
   * Get subscribers list with filters (all, active, suspended, expired, cancelled),
   * search, pagination, AND merged overview statistics (total subscribers, revenue, growth)
   */
  @Get('subscribers')
  getSubscribers(@Query() query: GetSubscribersQueryDto) {
    return this.adminService.getSubscribersWithStats(query);
  }

  /**
   * Dedicated endpoint for overview statistics
   */
  @Get('statistics')
  getStatistics() {
    return this.adminService.getStatistics();
  }

  /**
   * Eye icon in active subscribers table:
   * View all details about the user, subscription, plan features, and history
   */
  @Get('subscribers/:id')
  getSubscriberDetail(@Param('id') id: string) {
    return this.adminService.getSubscriberDetail(id);
  }

  /**
   * Update subscriber status (ACTIVE, SUSPENDED, EXPIRED, CANCELLED)
   */
  @Patch('subscribers/:id/status')
  updateSubscriberStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriberStatusDto,
  ) {
    return this.adminService.updateSubscriberStatus(id, dto);
  }

  /**
   * Delete subscriber record (trash icon in table)
   */
  @Delete('subscribers/:id')
  deleteSubscription(@Param('id') id: string) {
    return this.adminService.deleteSubscription(id);
  }
}

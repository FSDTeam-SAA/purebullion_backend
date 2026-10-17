import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import {
  GetAdminUsersQueryDto,
  SuspendUserDto,
  SendUserEmailDto,
} from './dto/admin-users.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller(['admin/users', 'admin/user-management'])
@UseGuards(JwtAuthGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  // ─── 1. Admin Users List Table (Matching Image 1) ───────────────────────────
  // Supports ?status=all|active|suspended|inactive & ?search= & ?page=1 & ?limit=9
  @Public()
  @Get()
  getUsers(@Query() query: GetAdminUsersQueryDto): Promise<any> {
    return this.adminUsersService.getUsers(query);
  }

  // ─── 2. User Detail: Overview Tab (Matching Image 2) ────────────────────────
  @Public()
  @Get(':id/overview')
  getUserOverview(@Param('id') id: string): Promise<any> {
    return this.adminUsersService.getUserOverview(id);
  }

  // ─── 3. User Detail: Default Route (Alias to Overview) ──────────────────────
  @Public()
  @Get(':id')
  getUserDetail(@Param('id') id: string): Promise<any> {
    return this.adminUsersService.getUserOverview(id);
  }

  // ─── 4. User Detail: Activity Timeline Tab (Matching Image 3) ───────────────
  @Public()
  @Get(':id/activity')
  getUserActivity(@Param('id') id: string): Promise<any> {
    return this.adminUsersService.getUserActivity(id);
  }

  // ─── 5. User Detail: Subscription Tab (User Requirement) ────────────────────
  @Public()
  @Get(':id/subscription')
  getUserSubscription(@Param('id') id: string): Promise<any> {
    return this.adminUsersService.getUserSubscription(id);
  }

  // ─── 6. User Detail: Watchlist Tab (User Requirement) ───────────────────────
  @Public()
  @Get(':id/watchlist')
  getUserWatchlist(@Param('id') id: string): Promise<any> {
    return this.adminUsersService.getUserWatchlist(id);
  }

  // ─── 7. User Detail: Signal Activity's Tab (Matching Image 4) ───────────────
  @Public()
  @Get(':id/signals')
  getUserSignalActivity(@Param('id') id: string): Promise<any> {
    return this.adminUsersService.getUserSignalActivity(id);
  }

  // ─── 8. User Detail: Community Tab (Matching Image 5) ───────────────────────
  @Public()
  @Get(':id/community')
  getUserCommunityActivity(@Param('id') id: string): Promise<any> {
    return this.adminUsersService.getUserCommunityActivity(id);
  }

  // ─── 9. Suspend / Unsuspend User (Action Button) ────────────────────────────
  @Public()
  @Patch(':id/suspend')
  suspendUser(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
  ): Promise<any> {
    return this.adminUsersService.suspendUser(id, dto);
  }

  // ─── 10. Send Direct Email from Website to User (Action Button) ─────────────
  @Public()
  @Post(':id/email')
  sendEmailToUser(
    @Param('id') id: string,
    @Body() dto: SendUserEmailDto,
  ): Promise<any> {
    return this.adminUsersService.sendEmailToUser(id, dto);
  }

  // ─── 11. Delete User (Action Trash Icon) ────────────────────────────────────
  @Public()
  @Delete(':id')
  deleteUser(@Param('id') id: string): Promise<any> {
    return this.adminUsersService.deleteUser(id);
  }
}


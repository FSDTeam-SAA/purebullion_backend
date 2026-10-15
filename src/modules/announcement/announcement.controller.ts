import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  GetAnnouncementsQueryDto,
} from './dto/announcement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { UserDocument } from '../auth/schemas/user.schema';

// ─── ADMIN: Full CRUD for Admin Announcements ─────────────────────────
@Controller('admin/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Roles(RoleType.ADMIN)
  @Post()
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() admin?: UserDocument,
  ): Promise<any> {
    return this.announcementService.create(dto, admin?._id);
  }

  @Roles(RoleType.ADMIN)
  @Get()
  findAll(@Query() query: GetAnnouncementsQueryDto): Promise<any> {
    return this.announcementService.findAll(query);
  }

  @Roles(RoleType.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<any> {
    return this.announcementService.findOne(id);
  }

  @Roles(RoleType.ADMIN)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ): Promise<any> {
    return this.announcementService.update(id, dto);
  }

  @Roles(RoleType.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<any> {
    return this.announcementService.remove(id);
  }
}

// ─── USER: View Active Announcements ──────────────────────────────────
@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Public()
  @Get()
  getActiveAnnouncements(@Query('tier') tier = 'all'): Promise<any> {
    return this.announcementService.getActiveAnnouncements(tier);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string): Promise<any> {
    return this.announcementService.findOne(id);
  }
}


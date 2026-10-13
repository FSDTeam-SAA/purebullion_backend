import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import {
  CreateContactDto,
  GetSupportQueryDto,
  ResolveSupportDto,
} from './dto/support.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '../../common/enums/role.enum';
import type { UserDocument } from '../auth/schemas/user.schema';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ─── Public Contact Us Form (No Auth Required - Screenshot 1) ─
  @Public()
  @Post('contact')
  submitContactMessage(@Body() dto: CreateContactDto) {
    return this.supportService.submitContactMessage(dto);
  }

  // ─── Admin Support Dashboard (Screenshots 2 & 3) ────────────
  @Get('admin/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  getAllSupportMessages(@Query() query: GetSupportQueryDto) {
    return this.supportService.getAllSupportMessages(query);
  }

  @Get('admin/messages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  getSupportMessageById(@Param('id') id: string) {
    return this.supportService.getSupportMessageById(id);
  }

  @Patch('admin/messages/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  resolveSupportMessage(
    @Param('id') id: string,
    @Body() dto: ResolveSupportDto,
    @CurrentUser() admin?: UserDocument,
  ) {
    return this.supportService.resolveSupportMessage(id, dto, admin?._id);
  }

  @Delete('admin/messages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  deleteSupportMessage(@Param('id') id: string) {
    return this.supportService.deleteSupportMessage(id);
  }
}


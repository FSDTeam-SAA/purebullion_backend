import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AiService } from './ai.service';
import {
  ChatDto,
  GenerateBriefingDto,
  IngestKnowledgeDto,
  RenameConversationDto,
} from './dto/ai.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '../../common/enums/role.enum';
import type { UserDocument } from '../auth/schemas/user.schema';
import { SKIP_RESPONSE_ENVELOPE } from '../../common/interceptors/response.interceptor';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('chat')
  @SetMetadata(SKIP_RESPONSE_ENVELOPE, true)
  chat(
    @CurrentUser() user: UserDocument,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    return this.ai.chat(user._id.toString(), dto, res);
  }

  @Get('conversations')
  conversations(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ai.list(user._id.toString(), page, limit);
  }

  @Get('conversations/:conversationId/messages')
  messages(
    @CurrentUser() user: UserDocument,
    @Param('conversationId') id: string,
  ) {
    return this.ai.history(user._id.toString(), id);
  }

  @Patch('conversations/:conversationId')
  rename(
    @CurrentUser() user: UserDocument,
    @Param('conversationId') id: string,
    @Body() dto: RenameConversationDto,
  ) {
    return this.ai.rename(user._id.toString(), id, dto);
  }

  @Delete('conversations/:conversationId')
  remove(
    @CurrentUser() user: UserDocument,
    @Param('conversationId') id: string,
  ) {
    return this.ai.remove(user._id.toString(), id);
  }

  @Post('admin/briefings/generate')
  @Roles(RoleType.ADMIN)
  generateBriefing(@Body() dto: GenerateBriefingDto) {
    return this.ai.generateBriefing(dto.briefing_type);
  }

  @Get('briefings')
  publishedBriefings() {
    return this.ai.listBriefings(true);
  }

  @Get('admin/briefings')
  @Roles(RoleType.ADMIN)
  adminBriefings() {
    return this.ai.listBriefings(false);
  }

  @Patch('admin/briefings/:id/approve')
  @Roles(RoleType.ADMIN)
  approveBriefing(@Param('id') id: string) {
    return this.ai.reviewBriefing(id, 'approve');
  }

  @Patch('admin/briefings/:id/reject')
  @Roles(RoleType.ADMIN)
  rejectBriefing(@Param('id') id: string) {
    return this.ai.reviewBriefing(id, 'reject');
  }

  @Patch('admin/briefings/:id/publish')
  @Roles(RoleType.ADMIN)
  publishBriefing(@Param('id') id: string) {
    return this.ai.reviewBriefing(id, 'publish');
  }

  @Post('admin/knowledge/ingest')
  @Roles(RoleType.ADMIN)
  ingestKnowledge(@Body() dto: IngestKnowledgeDto) {
    return this.ai.ingestKnowledge(dto);
  }
}

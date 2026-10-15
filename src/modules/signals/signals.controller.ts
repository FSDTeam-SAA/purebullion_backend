import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SignalsService } from './signals.service';
import { CreateSignalDto, UpdateSignalDto, GetSignalsQueryDto } from './dto/signal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RoleType } from '../../common/enums/role.enum';
import type { UserDocument } from '../auth/schemas/user.schema';

@Controller('signals')
@UseGuards(JwtAuthGuard)
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  // ─── Stats (Top counters: New 2 | Open 5 | Closed 143) ───────
  @Public()
  @Get('stats')
  getStats() {
    return this.signalsService.getStats();
  }

  // ─── List All Signals (User + Admin with filters) ───────────
  @Public()
  @Get()
  getSignals(@Query() query: GetSignalsQueryDto) {
    return this.signalsService.getSignals(query);
  }

  // ─── Signal Detail (Matching Screenshot 3 & 4) ───────────────
  @Public()
  @Get(':id')
  getSignalById(@Param('id') id: string) {
    return this.signalsService.getSignalById(id);
  }

  // ─── Admin / Dev: Seed Default Platform Signals ──────────────
  @Post('seed')
  @Public()
  seedSignals() {
    return this.signalsService.seedDefaultSignals();
  }

  // ─── Admin: Create Signal ─────────────────────────────────────
  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleType.ADMIN)
  createSignal(
    @Body() dto: CreateSignalDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.signalsService.createSignal(dto, user?._id);
  }

  // ─── Admin: Update Signal ─────────────────────────────────────
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleType.ADMIN)
  updateSignal(@Param('id') id: string, @Body() dto: UpdateSignalDto) {
    return this.signalsService.updateSignal(id, dto);
  }

  // ─── Admin: Delete Signal ─────────────────────────────────────
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleType.ADMIN)
  deleteSignal(@Param('id') id: string) {
    return this.signalsService.deleteSignal(id);
  }
}

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
import { SignalsService } from './signals.service';
import {
  CreateSignalDto,
  UpdateSignalDto,
  GetAdminSignalsQueryDto,
  UpdateAdminSignalStatusDto,
} from './dto/signal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('admin/signals')
@UseGuards(JwtAuthGuard)
export class AdminSignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  // ─── 1. Top 3 KPI Cards (Active signals: 24, Target reached: 68.4%, Reward: 1 : 2.8) ───
  @Public()
  @Get('stats')
  getAdminStats(): Promise<any> {
    return this.signalsService.getAdminStats();
  }

  // ─── 2. Admin Signals Table (Matching Screenshot) ──────────────────────────────────
  // Supports ?tab=all|performance|archived & ?status=active|suspended & ?search= & ?page=1 & ?limit=9
  @Public()
  @Get()
  getAdminSignals(
    @Query() query: GetAdminSignalsQueryDto,
  ): Promise<any> {
    return this.signalsService.getAdminSignals(query);
  }

  // ─── 3. Toggle Signal Status (Active ↔ Suspended) ───────────────────────────────────
  @Public()
  @Patch(':id/status')
  updateAdminSignalStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAdminSignalStatusDto,
  ): Promise<any> {
    return this.signalsService.updateAdminSignalStatus(id, dto.status);
  }

  // ─── 4. Admin Create / Publish Signal ──────────────────────────────────────────────
  @Public()
  @Post()
  createSignal(@Body() dto: CreateSignalDto): Promise<any> {
    return this.signalsService.createSignal(dto);
  }

  // ─── 5. Admin Update Signal ────────────────────────────────────────────────────────
  @Public()
  @Put(':id')
  updateSignal(
    @Param('id') id: string,
    @Body() dto: UpdateSignalDto,
  ): Promise<any> {
    return this.signalsService.updateSignal(id, dto);
  }

  // ─── 6. Admin Delete Signal ────────────────────────────────────────────────────────
  @Public()
  @Delete(':id')
  deleteSignal(@Param('id') id: string): Promise<any> {
    return this.signalsService.deleteSignal(id);
  }
}


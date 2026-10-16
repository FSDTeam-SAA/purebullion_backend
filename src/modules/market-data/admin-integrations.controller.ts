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
import { AdminIntegrationsService } from './admin-integrations.service';
import {
  GetAdminIntegrationsQueryDto,
  UpdateIntegrationStatusDto,
  CreateDataIntegrationDto,
} from './dto/admin-integrations.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller(['admin/market-data', 'admin/data-integrations'])
@UseGuards(JwtAuthGuard)
export class AdminIntegrationsController {
  constructor(
    private readonly adminIntegrationsService: AdminIntegrationsService,
  ) {}

  // ─── 1. Top 3 KPI Cards (Connected services: 5 of 6, Average latency: 84 ms, Errors today: 3) ───
  @Public()
  @Get('stats')
  getStats(): Promise<any> {
    return this.adminIntegrationsService.getStats();
  }

  // ─── 2. List Integrations Table (Matching Screenshot Table) ─────────────────────────────────
  // Supports ?tab=all|market-data|news-feed|ai|payments|email & ?connection=Active|Suspended & ?search= & ?page=1 & ?limit=9
  @Public()
  @Get()
  getIntegrations(
    @Query() query: GetAdminIntegrationsQueryDto,
  ): Promise<any> {
    return this.adminIntegrationsService.getIntegrations(query);
  }

  // ─── 3. Get Single Integration Detail ───────────────────────────────────────────────────────
  @Public()
  @Get(':id')
  getIntegrationById(@Param('id') id: string): Promise<any> {
    return this.adminIntegrationsService.getIntegrationById(id);
  }

  // ─── 4. Suspend / Activate Service Toggle (Active ↔ Suspended) ──────────────────────────────
  @Public()
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationStatusDto,
  ): Promise<any> {
    return this.adminIntegrationsService.updateStatus(id, dto.connection);
  }

  // ─── 5. Trigger Health Check / Sync Test ────────────────────────────────────────────────────
  @Public()
  @Post(':id/sync')
  testSync(@Param('id') id: string): Promise<any> {
    return this.adminIntegrationsService.testSync(id);
  }

  // ─── 6. Register / Add Custom Service Integration ──────────────────────────────────────────
  @Public()
  @Post()
  createIntegration(@Body() dto: CreateDataIntegrationDto): Promise<any> {
    return this.adminIntegrationsService.createIntegration(dto);
  }

  // ─── 7. Delete Integration ─────────────────────────────────────────────────────────────────
  @Public()
  @Delete(':id')
  deleteIntegration(@Param('id') id: string): Promise<any> {
    return this.adminIntegrationsService.deleteIntegration(id);
  }
}


import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StockScannerService } from './stock-scanner.service';
import { RunScanDto, SavePresetDto } from './dto/scanner.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { UserDocument } from '../auth/schemas/user.schema';

@Controller('stock-scanner')
@UseGuards(JwtAuthGuard)
export class StockScannerController {
  constructor(private readonly stockScannerService: StockScannerService) {}

  // ─── Header Stats (Securities scanned, Matches, New since open, Last run) ──
  @Public()
  @Get('stats')
  getStats() {
    return this.stockScannerService.getStats();
  }

  // ─── Run Scan with Multi-Parameter Filters (Screenshot 1) ──────
  @Public()
  @Get('run')
  runScan(@Query() dto: RunScanDto) {
    return this.stockScannerService.runScan(dto);
  }

  // ─── Single Stock Scanner Detail (Screenshot 2 & 3) ────────────
  @Public()
  @Get('stock/:symbol')
  getStockDetail(@Param('symbol') symbol: string) {
    return this.stockScannerService.getStockDetail(symbol);
  }

  // ─── Presets: Save Preset (Screenshot 1 "Save preset" button) ──
  @Post('presets')
  savePreset(
    @Body() dto: SavePresetDto,
    @CurrentUser() user?: UserDocument,
  ) {
    return this.stockScannerService.savePreset(dto, user?._id);
  }

  // ─── Presets: List Saved Presets ───────────────────────────────
  @Get('presets')
  getPresets(@CurrentUser() user?: UserDocument) {
    return this.stockScannerService.getPresets(user?._id);
  }

  // ─── Presets: Delete Preset ────────────────────────────────────
  @Delete('presets/:id')
  deletePreset(@Param('id') id: string) {
    return this.stockScannerService.deletePreset(id);
  }
}

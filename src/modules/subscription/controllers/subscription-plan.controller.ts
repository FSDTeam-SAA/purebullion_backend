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
import { SubscriptionPlanService } from '../services/subscription-plan.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { RoleType } from '../../../common/enums/role.enum';

@Controller('subscription/plans')
export class SubscriptionPlanController {
  constructor(private readonly planService: SubscriptionPlanService) {}

  // ─── Public / User: View Plans ─────────────────────────────
  @Public()
  @Get()
  getAllPlans(@Query('includeInactive') includeInactive?: string) {
    const shouldInclude = includeInactive === 'true';
    return this.planService.getAllPlans(shouldInclude);
  }

  @Public()
  @Get(':id')
  getPlanById(@Param('id') id: string) {
    return this.planService.getPlanById(id);
  }

  // ─── Admin: Plan Management ────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  createPlan(@Body() dto: CreatePlanDto) {
    return this.planService.createPlan(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.planService.updatePlan(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  deletePlan(@Param('id') id: string) {
    return this.planService.deletePlan(id);
  }
}

import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlanFeaturesDto {
  @IsOptional()
  @IsBoolean()
  marketOverview?: boolean;

  @IsOptional()
  @IsString()
  stockScreener?: string; // 'none' | 'basic' | 'advanced'

  @IsOptional()
  @IsNumber()
  watchlistLimit?: number; // -1 for unlimited

  @IsOptional()
  @IsBoolean()
  unlimitedWatchlists?: boolean;

  @IsOptional()
  @IsString()
  marketAlerts?: string; // 'none' | 'basic' | 'custom'

  @IsOptional()
  @IsBoolean()
  aiMarketAnalysis?: boolean;

  @IsOptional()
  @IsBoolean()
  premiumResearchAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  advancedAiResearchTools?: boolean;

  @IsOptional()
  @IsBoolean()
  exclusiveMarketInsights?: boolean;

  @IsOptional()
  @IsBoolean()
  priorityCommunityAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  customAlertPreferences?: boolean;

  @IsOptional()
  customLimits?: Record<string, any>;
}

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @IsNumber()
  @Min(0)
  yearlyPrice: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PlanFeaturesDto)
  features?: PlanFeaturesDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

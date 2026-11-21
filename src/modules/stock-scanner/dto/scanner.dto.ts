import {
  IsOptional,
  IsIn,
  IsNumberString,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RunScanDto {
  @IsOptional()
  @IsString()
  marketCondition?: string; // single value, 'Any', or comma-separated list

  @IsOptional()
  @IsString()
  priceBehavior?: string; // single value, 'Any', or comma-separated list

  @IsOptional()
  @IsString()
  liquidity?: string; // single value, 'Any', or comma-separated list

  @IsOptional()
  @IsString()
  momentum?: string; // single value, 'Any', or comma-separated list

  @IsOptional()
  @IsString()
  technicalCondition?: string; // single value, 'Any', or comma-separated list

  @IsOptional()
  @IsString()
  entryCondition?: string; // single value, 'Any', or comma-separated list

  @IsOptional()
  @IsString()
  exitCondition?: string; // e.g. "Target / stop", "+ RS deterioration"

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  maxStopDistance?: number; // %

  @IsOptional()
  @IsString()
  minRiskReward?: string; // "1 : 1.80", "1 : 2.00"

  @IsOptional()
  @IsIn(['Momentum', 'Liquidity', 'Trend', 'Score', 'Price', 'Change'])
  sort?: string = 'Momentum';

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class SavePresetDto {
  @IsString()
  name: string; // e.g. "High Momentum Breakouts"

  @IsOptional()
  filters?: {
    marketCondition?: string;
    priceBehavior?: string;
    liquidity?: string;
    momentum?: string;
    technicalCondition?: string;
    entryCondition?: string;
    exitCondition?: string;
    maxStopDistance?: number;
    minRiskReward?: string;
  };
}

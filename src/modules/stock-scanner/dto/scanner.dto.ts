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
  @IsIn(['Any', 'Risk-On', 'Neutral', 'Risk-Off'])
  marketCondition?: string;

  @IsOptional()
  @IsIn(['Any', 'Breakout', 'Pullback', 'Reversal', 'Range'])
  priceBehavior?: string;

  @IsOptional()
  @IsIn(['Any', 'High', 'Medium', 'Low'])
  liquidity?: string;

  @IsOptional()
  @IsIn(['Any', 'Strong', 'Improving', 'Neutral', 'Weak'])
  momentum?: string;

  @IsOptional()
  @IsIn(['Any', 'Above 20-DMA', 'Above 50-DMA', 'RS new high'])
  technicalCondition?: string;

  @IsOptional()
  @IsIn(['Any', 'Retest hold', 'Gap hold', 'Level reclaim'])
  entryCondition?: string;

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
  @IsIn(['Momentum', 'Trend', 'Score', 'Price', 'Change'])
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

import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  IsEnum,
  Min,
  IsNumberString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSignalDto {
  @IsEnum(['BUY', 'SELL'])
  type: string;

  @IsString()
  symbol: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsIn(['Stock', 'ETF'])
  assetType?: string = 'Stock';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  entry: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  target: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stopLoss: number;

  @IsOptional()
  @IsString()
  riskReward?: string;

  @IsOptional()
  @IsEnum(['High', 'Moderate', 'Low'])
  confidence?: string;

  @IsOptional()
  @IsString()
  typicalHold?: string;

  @IsOptional()
  @IsString()
  rationaleTitle?: string;

  @IsOptional()
  @IsString()
  signalRationale?: string;

  @IsOptional()
  conditionDetails?: {
    marketConditionAtPublication?: string;
    momentum?: string;
    technicalConfirmation?: string;
    relativeStrength?: string;
    volatilityRegime?: string;
    liquidity?: string;
  };

  @IsOptional()
  timeline?: Array<{
    stage: string;
    description: string;
    date?: Date;
  }>;

  @IsOptional()
  @IsEnum(['Risk-On', 'Neutral', 'Risk-Off'])
  marketCondition?: string;

  @IsOptional()
  @IsEnum(['Breakout', 'Pullback', 'Reversal', 'Range'])
  priceBehavior?: string;

  @IsOptional()
  @IsEnum(['Strong', 'Improving', 'Weak'])
  momentum?: string;

  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'])
  liquidity?: string;

  @IsOptional()
  @IsEnum(['Low', 'Medium', 'High'])
  risk?: string;

  @IsOptional()
  @IsString()
  setup?: string;
}

export class UpdateSignalDto {
  @IsOptional()
  @IsEnum(['BUY', 'SELL'])
  type?: string;

  @IsOptional()
  @IsEnum(['NEW', 'OPEN', 'CLOSED', 'Active'])
  status?: string;

  @IsOptional()
  @IsIn(['Stock', 'ETF'])
  assetType?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  entry?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  target?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stopLoss?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lastExit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  returnPct?: number;

  @IsOptional()
  @IsString()
  riskReward?: string;

  @IsOptional()
  @IsEnum(['High', 'Moderate', 'Low'])
  confidence?: string;

  @IsOptional()
  @IsString()
  typicalHold?: string;

  @IsOptional()
  @IsString()
  rationaleTitle?: string;

  @IsOptional()
  @IsString()
  signalRationale?: string;

  @IsOptional()
  conditionDetails?: {
    marketConditionAtPublication?: string;
    momentum?: string;
    technicalConfirmation?: string;
    relativeStrength?: string;
    volatilityRegime?: string;
    liquidity?: string;
  };

  @IsOptional()
  timeline?: Array<{
    stage: string;
    description: string;
    date?: Date;
  }>;

  @IsOptional()
  @IsEnum(['Risk-On', 'Neutral', 'Risk-Off'])
  marketCondition?: string;

  @IsOptional()
  @IsEnum(['Breakout', 'Pullback', 'Reversal', 'Range'])
  priceBehavior?: string;

  @IsOptional()
  @IsEnum(['Strong', 'Improving', 'Weak'])
  momentum?: string;

  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'])
  liquidity?: string;

  @IsOptional()
  @IsEnum(['Low', 'Medium', 'High'])
  risk?: string;

  @IsOptional()
  @IsString()
  setup?: string;
}

export class GetSignalsQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  status?: string; // NEW, OPEN, CLOSED, Active, all

  @IsOptional()
  type?: string; // BUY, SELL, all

  @IsOptional()
  assetType?: string; // Stock, ETF, all

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsIn(['newest', 'oldest'])
  sort?: string;
}

export class GetAdminSignalsQueryDto {
  @IsOptional()
  @IsString()
  tab?: string = 'all'; // 'all' | 'performance' | 'archived'

  @IsOptional()
  @IsString()
  status?: string; // 'active' | 'suspended' | 'archived'

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 9; // Matches "Showing 1 to 9 of 120 results"
}

export class UpdateAdminSignalStatusDto {
  @IsEnum(['active', 'suspended', 'archived'])
  status: string;
}

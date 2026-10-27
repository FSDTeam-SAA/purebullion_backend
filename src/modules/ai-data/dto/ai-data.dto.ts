import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  HISTORY_INTERVALS,
  MAX_HISTORY_OUTPUTSIZE,
} from '../ai-data.constants';

// Query DTOs for /internal/ai. Ticker params are validated with parseSymbol()
// (strict regex, no default symbol) rather than class-validator.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class AiQuotesQueryDto {
  @IsString()
  @IsNotEmpty()
  symbols: string;
}

export class AiHistoryQueryDto {
  @IsOptional()
  @IsIn(HISTORY_INTERVALS)
  interval?: string = '1day';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_HISTORY_OUTPUTSIZE)
  outputsize?: number = 90;
}

export class AiMoversQueryDto {
  @IsIn(['gainers', 'losers', 'active'])
  direction: 'gainers' | 'losers' | 'active';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class AiEarningsQueryDto {
  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @Matches(DATE_ONLY, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DATE_ONLY, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}

export class AiNewsQueryDto {
  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsIn(['all', 'technology', 'stocks', 'etfs', 'economy', 'education'])
  category?: string;

  @IsOptional()
  @IsISO8601()
  since?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class AiSignalsQueryDto {
  @IsOptional()
  @IsIn(['NEW', 'OPEN', 'CLOSED'])
  status?: 'NEW' | 'OPEN' | 'CLOSED';

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsISO8601()
  openedSince?: string;

  @IsOptional()
  @IsISO8601()
  closedSince?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

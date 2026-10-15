import { IsOptional, IsString, IsIn, IsNumberString } from 'class-validator';

export class GetChartDto {
  @IsOptional()
  @IsIn(['1min', '5min', '15min', '30min', '1h', '2h', '4h', '1day', '1week', '1month'])
  interval?: string = '1day';

  @IsOptional()
  @IsNumberString()
  outputsize?: string = '90';
}

export class GetQuoteDto {
  @IsOptional()
  @IsString()
  symbol?: string;
}

export class GetNewsDto {
  @IsOptional()
  @IsNumberString()
  limit?: string = '20';

  @IsOptional()
  @IsString()
  symbol?: string;
}

export class GetEarningsDto {
  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsNumberString()
  outputsize?: string = '20';
}


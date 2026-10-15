import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumberString,
} from 'class-validator';

export class AddWatchlistDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetWatchlistQueryDto {
  @IsOptional()
  @IsIn(['all', 'with_signal', 'movers'])
  tab?: string = 'all';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class SearchUniverseQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}


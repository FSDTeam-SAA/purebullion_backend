import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetAdminIntegrationsQueryDto {
  @IsOptional()
  @IsString()
  tab?: string = 'all'; // 'all' | 'market-data' | 'news-feed' | 'ai' | 'payments' | 'email'

  @IsOptional()
  @IsString()
  connection?: string; // 'Active' | 'Suspended'

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
  @Max(100)
  limit?: number = 9; // Matches "Showing 1 to 9 of 120 results"
}

export class UpdateIntegrationStatusDto {
  @IsEnum(['Active', 'Suspended'])
  connection: string;
}

export class CreateDataIntegrationDto {
  @IsString()
  service: string;

  @IsString()
  provider: string;

  @IsEnum(['market_data', 'news_feed', 'ai', 'payments', 'email'])
  category: string;

  @IsOptional()
  @IsEnum(['Active', 'Suspended'])
  connection?: string = 'Active';

  @IsOptional()
  @IsEnum(['Live', 'Degraded', 'Offline'])
  dataStatus?: string = 'Live';

  @IsOptional()
  @IsString()
  latency?: string = '42 ms';

  @IsOptional()
  @IsString()
  recentErrors?: string = 'None';

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}


import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAdminDashboardQueryDto {
  @IsOptional()
  @IsString()
  timeframe?: string = '30d'; // 'today' | '7d' | '30d' | '90d' | 'custom'

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class GetAuditTrailQueryDto {
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
  limit?: number = 10;

  @IsOptional()
  @IsString()
  actorType?: string; // 'user' | 'system' | 'moderation'

  @IsOptional()
  @IsString()
  action?: string;
}

export class ExportDashboardQueryDto {
  @IsOptional()
  @IsString()
  timeframe?: string = '30d';

  @IsOptional()
  @IsEnum(['json', 'csv'])
  format?: string = 'json';
}

export class CreatePlatformActivityDto {
  @IsString()
  actorName: string; // e.g. 'Liam Morgan', 'Amara Cole', 'Signal Engine', 'Moderation'

  @IsOptional()
  @IsString()
  actorType?: string = 'user'; // 'user' | 'system' | 'moderation'

  @IsString()
  action: string; // e.g. 'subscription activated', 'published signal'

  @IsString()
  detail: string; // e.g. 'subscription activated · Plan B'

  @IsOptional()
  @IsString()
  target?: string = 'Plan B';
}


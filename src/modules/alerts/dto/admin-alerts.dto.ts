import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetAdminAlertsQueryDto {
  @IsOptional()
  @IsString()
  tab?: string = 'all'; // 'all' | 'notification-history' | 'templates'

  @IsOptional()
  @IsString()
  status?: string; // 'active' | 'suspended'

  @IsOptional()
  @IsString()
  channel?: string; // 'Email', 'Technical analysis', 'General'

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

export class UpdateAdminAlertStatusDto {
  @IsEnum(['active', 'suspended'])
  status: string;
}

export class CreateNotificationTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string = 'signals';

  @IsOptional()
  @IsString()
  channel?: string = 'email';

  @IsString()
  subject: string;

  @IsString()
  bodyTemplate: string;

  @IsOptional()
  @IsArray()
  variables?: string[] = ['symbol', 'entryPrice', 'targetPrice', 'stopLoss'];
}

export class BroadcastAlertDto {
  @IsString()
  type: string; // e.g. 'Signal Alert', 'Market Alert'

  @IsString()
  recipient: string; // e.g. 'Subscribed users', 'All members'

  @IsString()
  channel: string; // e.g. 'Email', 'In-platform', 'Push'

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  targetTiers?: string[] = ['all'];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}


import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetAlertsQueryDto {
  @IsOptional()
  @IsString()
  tab?: string = 'all'; // 'all' | 'signals' | 'market' | 'community' | 'announcements'

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
  limit?: number = 9; // Matches UI: "Showing 1 to 9 of 120 results"

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;
}

export class CreateAlertDto {
  @IsString()
  category: string; // 'signals' | 'market' | 'community' | 'announcements'

  @IsString()
  type: string; // 'new_signal' | 'proximity' | 'signal_closed' | 'market_condition' | 'watchlist_mover' | 'community_reply' | 'announcement'

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isHighlighted?: boolean = false;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class NotificationTogglesDto {
  @IsOptional()
  @IsBoolean()
  newSignals?: boolean;

  @IsOptional()
  @IsBoolean()
  signalProximity?: boolean;

  @IsOptional()
  @IsBoolean()
  signalClosed?: boolean;

  @IsOptional()
  @IsBoolean()
  marketConditionChange?: boolean;

  @IsOptional()
  @IsBoolean()
  watchlistMovers?: boolean;

  @IsOptional()
  @IsBoolean()
  communityReplies?: boolean;

  @IsOptional()
  @IsBoolean()
  announcements?: boolean;

  @IsOptional()
  @IsBoolean()
  dailyBriefingEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklyWrapEmail?: boolean;
}

export class NotificationChannelsDto {
  @IsOptional()
  @IsBoolean()
  inPlatform?: boolean;

  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  browserPush?: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;
}

export class QuietHoursDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationTogglesDto)
  toggles?: NotificationTogglesDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationChannelsDto)
  channels?: NotificationChannelsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto;
}


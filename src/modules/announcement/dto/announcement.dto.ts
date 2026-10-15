import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AnnouncementType {
  FEATURE_RELEASE = 'feature_release',
  SCANNER_UPDATE = 'scanner_update',
  MARKET_ALERT = 'market_alert',
  MAINTENANCE = 'maintenance',
  GENERAL = 'general',
}

export enum AnnouncementPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export class CreateAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType = AnnouncementType.SCANNER_UPDATE;

  @IsOptional()
  @IsArray()
  targetTiers?: string[] = ['all'];

  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority = AnnouncementPriority.MEDIUM;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = true;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  author?: string;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @IsOptional()
  @IsArray()
  targetTiers?: string[];

  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  author?: string;
}

export class GetAnnouncementsQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPublished?: boolean;

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
  limit?: number = 10;
}


import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CommunityTopic {
  ALL = 'all',
  SIGNALS = 'signals',
  EDUCATION = 'education',
  MARKET_DISCUSSION = 'market-discussion',
  PLATFORM_HELP = 'platform-help',
}

export enum PostSortOption {
  TRENDING = 'trending',
  NEWEST = 'newest',
  MOST_REPLIES = 'most-replies',
}

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media?: string[];

  @IsOptional()
  @IsString()
  mediaType?: string; // 'image' | 'video' | 'audio' | 'none'
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media?: string[];

  @IsOptional()
  @IsString()
  mediaType?: string;
}

export class GetPostsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  topic?: string; // 'signals' | 'education' | 'market-discussion' | 'platform-help' | 'all'

  @IsOptional()
  @IsString()
  sort?: string; // 'trending' | 'newest' | 'most-replies'

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  parentCommentId?: string;
}

export class GetCommentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  parentCommentId?: string;
}

export class ReportContentDto {
  @IsEnum(['post', 'comment'])
  @IsNotEmpty()
  targetType: 'post' | 'comment';

  @IsString()
  @IsNotEmpty()
  targetId: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  reasons: string[]; // e.g. ['Spam or promotion', 'Harassment or abuse', 'Misleading financial content', 'Inappropriate content', 'Other']

  @IsOptional()
  @IsString()
  description?: string; // 'Tell us what happened..'
}

export class UpdateReportStatusDto {
  @IsEnum(['pending', 'reviewed', 'dismissed', 'resolved'])
  @IsNotEmpty()
  status: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}


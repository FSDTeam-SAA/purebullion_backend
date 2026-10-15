import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum NewsCategoryFilter {
  ALL = 'all',
  TECHNOLOGY = 'technology',
  STOCKS = 'stocks',
  ETFS = 'etfs',
  ECONOMY = 'economy',
  EDUCATION = 'education',
}

export class GetNewsQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  symbol?: string;

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
  limit?: number = 9; // Exactly 9 items per page as seen in Screenshot: "Showing 1 to 9 of 120 results"
}

export class CreateNewsArticleDto {
  @IsString()
  title: string;

  @IsString()
  summary: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  category?: string = 'stocks';

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  relatedSymbols?: string[];

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  readTime?: string;

  @IsOptional()
  @IsBoolean()
  isDeskPublication?: boolean = false;
}


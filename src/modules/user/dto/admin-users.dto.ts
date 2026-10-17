import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetAdminUsersQueryDto {
  @IsOptional()
  @IsString()
  status?: string = 'all'; // 'all' | 'active' | 'suspended' | 'inactive'

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

export class SuspendUserDto {
  @IsOptional()
  @IsEnum(['Active', 'Suspended', 'In Active'])
  status?: string = 'Suspended';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SendUserEmailDto {
  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  category?: string = 'Admin Message';
}


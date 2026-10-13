import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class GetSupportQueryDto {
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
  status?: string; // 'all' | 'pending' | 'resolved'

  @IsOptional()
  @IsString()
  search?: string;
}

export class ResolveSupportDto {
  @IsOptional()
  @IsString()
  replyMessage?: string;

  @IsOptional()
  @IsEnum(['pending', 'resolved'])
  status?: string = 'resolved';
}


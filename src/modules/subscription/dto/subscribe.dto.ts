import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { BillingCycle } from '../enums/subscription.enum';

export class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsEnum(BillingCycle)
  @IsNotEmpty()
  billingCycle: BillingCycle;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}

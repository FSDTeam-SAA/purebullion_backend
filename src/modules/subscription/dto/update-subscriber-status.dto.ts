import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SubscriptionStatus } from '../enums/subscription.enum';

export class UpdateSubscriberStatusDto {
  @IsEnum(SubscriptionStatus)
  @IsNotEmpty()
  status: SubscriptionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

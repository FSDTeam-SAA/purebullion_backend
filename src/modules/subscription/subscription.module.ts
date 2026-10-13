import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from './schemas/subscription-plan.schema';
import {
  UserSubscription,
  UserSubscriptionSchema,
} from './schemas/user-subscription.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';

import { SubscriptionPlanService } from './services/subscription-plan.service';
import { UserSubscriptionService } from './services/user-subscription.service';
import { SubscriptionAdminService } from './services/subscription-admin.service';

import { SubscriptionPlanController } from './controllers/subscription-plan.controller';
import { SubscriptionController } from './controllers/subscription.controller';
import { SubscriptionAdminController } from './controllers/subscription-admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
  ],
  controllers: [
    SubscriptionPlanController,
    SubscriptionController,
    SubscriptionAdminController,
  ],
  providers: [
    SubscriptionPlanService,
    UserSubscriptionService,
    SubscriptionAdminService,
  ],
  exports: [
    SubscriptionPlanService,
    UserSubscriptionService,
    SubscriptionAdminService,
    MongooseModule,
  ],
})
export class SubscriptionModule {}

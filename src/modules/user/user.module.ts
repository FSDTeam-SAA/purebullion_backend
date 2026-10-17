import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../../infrastructure/cloudinary/cloudinary.module';
import { EmailModule } from '../../infrastructure/email/email.module';
import {
  UserActivityLog,
  UserActivityLogSchema,
} from './schemas/user-activity-log.schema';
import {
  UserSignalActivity,
  UserSignalActivitySchema,
} from './schemas/user-signal-activity.schema';
import {
  WatchlistItem,
  WatchlistItemSchema,
} from '../watchlist/schemas/watchlist-item.schema';
import {
  CommunityPost,
  CommunityPostSchema,
} from '../community/schemas/community-post.schema';
import {
  CommunityComment,
  CommunityCommentSchema,
} from '../community/schemas/community-comment.schema';
import {
  CommunityLike,
  CommunityLikeSchema,
} from '../community/schemas/community-like.schema';
import {
  ScannerPreset,
  ScannerPresetSchema,
} from '../stock-scanner/schemas/scanner-preset.schema';
import {
  NotificationSettings,
  NotificationSettingsSchema,
} from '../alerts/schemas/notification-settings.schema';
import { Alert, AlertSchema } from '../alerts/schemas/alert.schema';
import {
  UserSubscription,
  UserSubscriptionSchema,
} from '../subscription/schemas/user-subscription.schema';
import {
  SupportMessage,
  SupportMessageSchema,
} from '../support/schemas/support-message.schema';

@Module({
  imports: [
    AuthModule,
    CloudinaryModule,
    EmailModule,
    MongooseModule.forFeature([
      { name: UserActivityLog.name, schema: UserActivityLogSchema },
      { name: UserSignalActivity.name, schema: UserSignalActivitySchema },
      { name: WatchlistItem.name, schema: WatchlistItemSchema },
      { name: CommunityPost.name, schema: CommunityPostSchema },
      { name: CommunityComment.name, schema: CommunityCommentSchema },
      { name: CommunityLike.name, schema: CommunityLikeSchema },
      { name: ScannerPreset.name, schema: ScannerPresetSchema },
      { name: NotificationSettings.name, schema: NotificationSettingsSchema },
      { name: Alert.name, schema: AlertSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: SupportMessage.name, schema: SupportMessageSchema },
    ]),
  ],
  controllers: [UserController, AdminUsersController],
  providers: [UserService, AdminUsersService],
  exports: [UserService, AdminUsersService],
})
export class UserModule {}

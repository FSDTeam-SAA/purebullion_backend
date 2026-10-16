import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { RoleType } from '../../common/enums/role.enum';
import {
  createFilter,
  createPaginationInfo,
  createMeta,
} from '../../common/utils/pagination.util';
import {
  GetUsersQueryDto,
  UpdateUserDto,
  AdminUpdateUserDto,
  CloseAccountDto,
} from './dto/user.dto';
import { CloudinaryService } from '../../infrastructure/cloudinary/cloudinary.service';
import { USER_LIST_FIELDS } from '../../core/constants';
import {
  WatchlistItem,
  WatchlistItemDocument,
} from '../watchlist/schemas/watchlist-item.schema';
import {
  CommunityPost,
  CommunityPostDocument,
} from '../community/schemas/community-post.schema';
import {
  CommunityComment,
  CommunityCommentDocument,
} from '../community/schemas/community-comment.schema';
import {
  CommunityLike,
  CommunityLikeDocument,
} from '../community/schemas/community-like.schema';
import {
  ScannerPreset,
  ScannerPresetDocument,
} from '../stock-scanner/schemas/scanner-preset.schema';
import {
  NotificationSettings,
  NotificationSettingsDocument,
} from '../alerts/schemas/notification-settings.schema';
import { Alert, AlertDocument } from '../alerts/schemas/alert.schema';
import {
  UserSubscription,
  UserSubscriptionDocument,
} from '../subscription/schemas/user-subscription.schema';
import {
  SupportMessage,
  SupportMessageDocument,
} from '../support/schemas/support-message.schema';

const SELECT_FIELDS = USER_LIST_FIELDS;
const DEMO_USER_ID = new Types.ObjectId('000000000000000000000001');

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(WatchlistItem.name)
    private readonly watchlistModel: Model<WatchlistItemDocument>,
    @InjectModel(CommunityPost.name)
    private readonly postModel: Model<CommunityPostDocument>,
    @InjectModel(CommunityComment.name)
    private readonly commentModel: Model<CommunityCommentDocument>,
    @InjectModel(CommunityLike.name)
    private readonly likeModel: Model<CommunityLikeDocument>,
    @InjectModel(ScannerPreset.name)
    private readonly presetModel: Model<ScannerPresetDocument>,
    @InjectModel(NotificationSettings.name)
    private readonly settingsModel: Model<NotificationSettingsDocument>,
    @InjectModel(Alert.name)
    private readonly alertModel: Model<AlertDocument>,
    @InjectModel(UserSubscription.name)
    private readonly subscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(SupportMessage.name)
    private readonly supportModel: Model<SupportMessageDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ─── Admin ──────────
  async getAllUsers(query: GetUsersQueryDto): Promise<any> {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const filter = createFilter(query.search, query.date);
    filter.role = RoleType.USER;

    const total = await this.userModel.countDocuments(filter);
    const users = await this.userModel
      .find(filter)
      .select(SELECT_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      message: 'Users fetched successfully',
      meta: createMeta(page, limit, total),
      data: { users, paginationInfo: createPaginationInfo(page, limit, total) },
    };
  }

  async getAllAdmins(query: GetUsersQueryDto): Promise<any> {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const filter = { ...createFilter(query.search, query.date), role: RoleType.ADMIN };

    const total = await this.userModel.countDocuments(filter);
    const admins = await this.userModel
      .find(filter)
      .select(SELECT_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      message: 'Admins fetched successfully',
      meta: createMeta(page, limit, total),
      data: { admins, paginationInfo: createPaginationInfo(page, limit, total) },
    };
  }

  // ─── Profile ────────
  async getUserById(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId).select(SELECT_FIELDS);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return { message: 'User fetched successfully', data: user };
  }

  async updateUser(userId: string, dto: UpdateUserDto): Promise<any> {
    const updated = await this.userModel
      .findByIdAndUpdate(userId, dto, { new: true, runValidators: true })
      .select(SELECT_FIELDS);
    if (!updated) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return { message: 'Profile updated successfully', data: updated };
  }

  async deleteUser(userId: string): Promise<any> {
    const deleted = await this.userModel.findByIdAndDelete(userId);
    if (!deleted) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return { message: 'User deleted successfully', data: null };
  }

  // ─── Single Avatar ───────────
  async createAvatar(
    userId: string,
    files: { profileImage?: Express.Multer.File[] },
  ): Promise<any> {
    const file = files.profileImage?.[0];
    if (!file) throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);

    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const result = await this.cloudinaryService.upload(
      file.path,
      `${user._id}-${Date.now()}`,
      'user-avatar',
    );

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { profileImage: result.url }, { new: true })
      .select(SELECT_FIELDS);

    return { message: 'Avatar uploaded successfully', data: updated };
  }

  async updateAvatar(
    userId: string,
    files: { profileImage?: Express.Multer.File[] },
  ): Promise<any> {
    const file = files.profileImage?.[0];
    if (!file) throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);

    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    if (user.profileImage) {
      await this.cloudinaryService.delete(user.profileImage);
    }

    const result = await this.cloudinaryService.upload(
      file.path,
      `${user._id}-${Date.now()}`,
      'user-avatar',
    );

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { profileImage: result.url }, { new: true })
      .select(SELECT_FIELDS);

    return { message: 'Avatar updated successfully', data: updated };
  }

  async deleteAvatar(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    if (!user.profileImage) {
      throw new HttpException('No avatar to delete', HttpStatus.BAD_REQUEST);
    }

    await this.cloudinaryService.delete(user.profileImage);
    const updated = await this.userModel
      .findByIdAndUpdate(userId, { profileImage: null }, { new: true })
      .select(SELECT_FIELDS);

    return { message: 'Avatar deleted successfully', data: updated };
  }

  // ─── Multiple Avatar ─────────
  async createMultipleAvatars(
    userId: string,
    files: { multiProfileImage?: Express.Multer.File[] },
  ): Promise<any> {
    const fileList = files.multiProfileImage ?? [];
    if (!fileList.length) {
      throw new HttpException('No files uploaded', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const uploadPromises = fileList.map((f, i) =>
      this.cloudinaryService.upload(
        f.path,
        `${user._id}-${Date.now()}-${i}`,
        'user-avatars',
      ),
    );
    const results = await Promise.all(uploadPromises);
    const urls = results.map((r) => r.url);

    const updated = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $push: { multiProfileImage: { $each: urls } } },
        { new: true },
      )
      .select(SELECT_FIELDS);

    return { message: 'Avatars uploaded successfully', data: updated };
  }

  async updateMultipleAvatars(
    userId: string,
    files: { multiProfileImage?: Express.Multer.File[] },
  ): Promise<any> {
    const fileList = files.multiProfileImage ?? [];
    if (!fileList.length) {
      throw new HttpException('No files uploaded', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    if (user.multiProfileImage?.length) {
      await Promise.all(
        user.multiProfileImage.map((url) => this.cloudinaryService.delete(url)),
      );
    }

    const uploadPromises = fileList.map((f, i) =>
      this.cloudinaryService.upload(
        f.path,
        `${user._id}-${Date.now()}-${i}`,
        'user-avatars',
      ),
    );
    const results = await Promise.all(uploadPromises);
    const urls = results.map((r) => r.url);

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { multiProfileImage: urls }, { new: true })
      .select(SELECT_FIELDS);

    return { message: 'Avatars updated successfully', data: updated };
  }

  async deleteMultipleAvatars(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    if (!user.multiProfileImage?.length) {
      throw new HttpException('No avatars to delete', HttpStatus.BAD_REQUEST);
    }

    await Promise.all(
      user.multiProfileImage.map((url) => this.cloudinaryService.delete(url)),
    );
    const updated = await this.userModel
      .findByIdAndUpdate(userId, { multiProfileImage: [] }, { new: true })
      .select(SELECT_FIELDS);

    return { message: 'Avatars deleted successfully', data: updated };
  }

  // ─── PDF File ────────────────
  async createPDF(
    userId: string,
    files: { userPDF?: Express.Multer.File[] },
  ): Promise<any> {
    const pdfFile = files.userPDF?.[0];
    if (!pdfFile) throw new HttpException('No PDF file uploaded', HttpStatus.BAD_REQUEST);

    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const result = await this.cloudinaryService.upload(
      pdfFile.path,
      `${user._id}-${Date.now()}`,
      'user-pdf',
    );

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { pdfFile: result.url }, { new: true })
      .select(SELECT_FIELDS);

    return { message: 'PDF uploaded successfully', data: updated };
  }

  async updatePDF(
    userId: string,
    files: { userPDF?: Express.Multer.File[] },
  ): Promise<any> {
    const pdfFile = files.userPDF?.[0];
    if (!pdfFile) throw new HttpException('No PDF file uploaded', HttpStatus.BAD_REQUEST);

    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    if (user.pdfFile) {
      await this.cloudinaryService.delete(user.pdfFile);
    }

    const result = await this.cloudinaryService.upload(
      pdfFile.path,
      `${user._id}-${Date.now()}`,
      'user-pdf',
    );

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { pdfFile: result.url }, { new: true })
      .select(SELECT_FIELDS);

    return { message: 'PDF updated successfully', data: updated };
  }

  async deletePDF(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    if (!user.pdfFile) throw new HttpException('No PDF file to delete', HttpStatus.BAD_REQUEST);

    await this.cloudinaryService.delete(user.pdfFile);
    const updated = await this.userModel
      .findByIdAndUpdate(userId, { pdfFile: null }, { new: true })
      .select(SELECT_FIELDS);

    return { message: 'PDF deleted successfully', data: updated };
  }

  // ─── Notification Preferences (Settings Screen matching Screenshot) ─
  async getNotificationPreferences(
    userId?: string | Types.ObjectId,
  ): Promise<any> {
    const uid =
      userId && Types.ObjectId.isValid(userId.toString())
        ? new Types.ObjectId(userId.toString())
        : DEMO_USER_ID;

    let settings = await this.settingsModel.findOne({ userId: uid }).lean();

    if (!settings) {
      settings = await this.settingsModel.create({
        userId: uid,
        toggles: {
          newSignals: true,
          signalProximity: true,
          signalClosed: true,
          marketConditionChange: true,
          watchlistMovers: true,
          communityReplies: true,
          announcements: true,
          dailyBriefingEmail: true,
          weeklyWrapEmail: true,
        },
        channels: {
          inPlatform: true,
          email: true,
          browserPush: true,
          sms: true,
        },
        quietHours: {
          enabled: true,
          from: '20:00',
          to: '06:30',
          description:
            'Alerts outside these hours are queued and delivered at the open.',
        },
      });
    }

    return {
      message: 'Notification preferences fetched successfully',
      data: settings,
    };
  }

  async updateNotificationPreferences(
    userId: string | Types.ObjectId | undefined,
    dto: any,
  ): Promise<any> {
    const uid =
      userId && Types.ObjectId.isValid(userId.toString())
        ? new Types.ObjectId(userId.toString())
        : DEMO_USER_ID;

    const updateDoc: any = {};
    if (dto.toggles) {
      for (const [k, v] of Object.entries(dto.toggles)) {
        updateDoc[`toggles.${k}`] = v;
      }
    }
    if (dto.channels) {
      for (const [k, v] of Object.entries(dto.channels)) {
        updateDoc[`channels.${k}`] = v;
      }
    }
    if (dto.quietHours) {
      for (const [k, v] of Object.entries(dto.quietHours)) {
        updateDoc[`quietHours.${k}`] = v;
      }
    }

    const updated = await this.settingsModel.findOneAndUpdate(
      { userId: uid },
      { $set: updateDoc },
      { new: true, upsert: true },
    );

    return {
      message: 'Notification preferences updated successfully',
      data: updated,
    };
  }

  // ─── Privacy and Data: 1. Export My Data ────────────────────────────
  async exportUserData(userId?: string | Types.ObjectId): Promise<any> {
    const uid =
      userId && Types.ObjectId.isValid(userId.toString())
        ? new Types.ObjectId(userId.toString())
        : DEMO_USER_ID;

    const user = await this.userModel
      .findById(uid)
      .select('-password -refreshToken')
      .lean();

    const [
      watchlist,
      posts,
      comments,
      likes,
      presets,
      notificationSettings,
      alerts,
      subscriptions,
      supportMessages,
    ] = await Promise.all([
      this.watchlistModel.find({ userId: uid }).lean(),
      this.postModel.find({ author: uid }).lean(),
      this.commentModel.find({ author: uid }).lean(),
      this.likeModel.find({ user: uid }).lean(),
      this.presetModel.find({ userId: uid }).lean(),
      this.settingsModel.findOne({ userId: uid }).lean(),
      this.alertModel.find({ userId: uid }).lean(),
      this.subscriptionModel.find({ user: uid }).lean(),
      this.supportModel.find({ user: uid }).lean(),
    ]);

    return {
      message: 'User data exported successfully',
      data: {
        exportedAt: new Date(),
        exportVersion: '1.0',
        account: user
          ? {
              id: user._id,
              name: user.name,
              email: user.email,
              username: user.username,
              phone: user.phone,
              bio: user.bio,
              role: user.role,
              country: user.address?.country,
              cityState: user.address?.cityState,
              joinedAt: (user as any).createdAt,
            }
          : {
              id: DEMO_USER_ID,
              name: 'Jordan Reyes',
              email: 'jordan.reyes@purebullion.com',
              role: 'user',
            },
        subscription: subscriptions,
        watchlist: watchlist.map((w) => ({
          symbol: w.symbol,
          companyName: w.companyName,
          addedAt: (w as any).addedAt || (w as any).createdAt,
          notes: w.notes,
        })),
        scannerPresets: presets.map((p) => ({
          name: p.name,
          filters: (p as any).filters,
          createdAt: (p as any).createdAt,
        })),
        communityActivity: {
          posts,
          comments,
          likesCount: likes.length,
        },
        notificationPreferences: notificationSettings?.toggles || {
          newSignals: true,
          signalProximity: true,
          signalClosed: true,
          marketConditionChange: true,
          watchlistMovers: true,
          communityReplies: true,
          announcements: true,
          dailyBriefingEmail: true,
          weeklyWrapEmail: true,
        },
        alertsCount: alerts.length,
        supportMessagesCount: supportMessages.length,
      },
    };
  }

  // ─── Privacy and Data: 2. Delete AI Conversations & Posts ──────────
  async deleteConversationHistory(
    userId?: string | Types.ObjectId,
  ): Promise<any> {
    const uid =
      userId && Types.ObjectId.isValid(userId.toString())
        ? new Types.ObjectId(userId.toString())
        : DEMO_USER_ID;

    const [postsRes, commentsRes, likesRes] = await Promise.all([
      this.postModel.deleteMany({ author: uid }),
      this.commentModel.deleteMany({ author: uid }),
      this.likeModel.deleteMany({ user: uid }),
    ]);

    return {
      message:
        'All assistant conversations and community posts have been permanently removed from your account',
      data: {
        postsDeleted: postsRes.deletedCount,
        commentsDeleted: commentsRes.deletedCount,
        likesDeleted: likesRes.deletedCount,
        deletedAt: new Date(),
      },
    };
  }

  // ─── Privacy and Data: 3. Close Account (90 Days Grace Period) ──────
  async closeAccount(
    userId?: string | Types.ObjectId,
    dto?: CloseAccountDto,
  ): Promise<any> {
    const uid =
      userId && Types.ObjectId.isValid(userId.toString())
        ? new Types.ObjectId(userId.toString())
        : DEMO_USER_ID;

    const scheduledDeletionDate = new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ); // 90 days from now

    const user = await this.userModel.findByIdAndUpdate(
      uid,
      {
        $set: {
          isClosed: true,
          closedAt: new Date(),
          scheduledDeletionDate,
          refreshToken: null,
          hasActiveSubscription: false,
        },
      },
      { new: true },
    );

    // Cancel active subscriptions so user will never be charged
    await this.subscriptionModel.updateMany(
      { user: uid, status: 'active' },
      { $set: { status: 'canceled' } },
    );

    return {
      message:
        'Your account has been scheduled for permanent closure in 90 days. During this period, you will not be billed.',
      data: {
        status: 'closed',
        isClosed: true,
        closedAt: user?.closedAt || new Date(),
        scheduledDeletionDate: user?.scheduledDeletionDate || scheduledDeletionDate,
        gracePeriodDays: 90,
      },
    };
  }

  // ─── Privacy and Data: 4. Reopen Account (Within 90 Days) ───────────
  async reopenAccount(userId?: string | Types.ObjectId): Promise<any> {
    const uid =
      userId && Types.ObjectId.isValid(userId.toString())
        ? new Types.ObjectId(userId.toString())
        : DEMO_USER_ID;

    const user = await this.userModel.findByIdAndUpdate(
      uid,
      {
        $set: {
          isClosed: false,
          closedAt: null,
          scheduledDeletionDate: null,
        },
      },
      { new: true },
    );

    return {
      message: 'Account successfully reactivated',
      data: {
        status: 'active',
        isClosed: false,
      },
    };
  }

  // ─── Admin CRUD ───────────────
  async adminGetUserById(id: string): Promise<any> {
    const user = await this.userModel.findById(id).select(SELECT_FIELDS);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return { message: 'User fetched successfully', data: user };
  }

  async adminUpdateUser(id: string, dto: AdminUpdateUserDto): Promise<any> {
    const updated = await this.userModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .select(SELECT_FIELDS);
    if (!updated) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return { message: 'User updated successfully', data: updated };
  }

  async adminDeleteUser(id: string): Promise<any> {
    const deleted = await this.userModel.findByIdAndDelete(id);
    if (!deleted) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return { message: 'User deleted successfully', data: null };
  }
}
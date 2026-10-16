import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Alert, AlertDocument } from './schemas/alert.schema';
import {
  NotificationSettings,
  NotificationSettingsDocument,
} from './schemas/notification-settings.schema';
import {
  GetAlertsQueryDto,
  CreateAlertDto,
  UpdateNotificationSettingsDto,
} from './dto/alerts.dto';
import { AlertsGateway } from './alerts.gateway';
import { createMeta } from '../../common/utils/pagination.util';

const DEMO_USER_ID = new Types.ObjectId('000000000000000000000001');

@Injectable()
export class AlertsService implements OnModuleInit {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectModel(Alert.name)
    private readonly alertModel: Model<AlertDocument>,
    @InjectModel(NotificationSettings.name)
    private readonly settingsModel: Model<NotificationSettingsDocument>,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedInitialAlerts();
  }

  // ─── 1. List Alerts (Matches UI Table & Tabs) ───────────────────────
  async getAlerts(
    userId?: string | Types.ObjectId,
    query?: GetAlertsQueryDto,
  ): Promise<any> {
    const page = Math.max(1, Number(query?.page || 1));
    const limit = Math.max(1, Number(query?.limit || 9)); // Matches UI: "Showing 1 to 9 of 120 results"
    const tab = (query?.tab || 'all').toLowerCase();
    const search = query?.search?.trim() || '';

    const filter: any = {};

    // Filter by Tab: 'all' | 'signals' | 'market' | 'community' | 'announcements'
    if (tab && tab !== 'all') {
      filter.category = tab;
    }

    if (query?.unreadOnly) {
      filter.isRead = false;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { 'data.symbol': { $regex: search, $options: 'i' } },
      ];
    }

    const total = await this.alertModel.countDocuments(filter);
    const skip = (page - 1) * limit;

    const rawAlerts = await this.alertModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const alerts = rawAlerts.map((a) => ({
      ...a,
      timeAgo: this.formatTimeAgo(a.createdAt),
    }));

    // Calculate dynamic tab counts: All (8), Signals (4), Market (2), Community (1), Announcements (1)
    const tabCounts = await this.calculateTabCounts();

    const unreadCount = await this.alertModel.countDocuments({ isRead: false });

    const from = total > 0 ? skip + 1 : 0;
    const to = Math.min(skip + limit, total);
    const label = `Showing ${from} to ${to} of ${total} results`;

    return {
      message: 'Alerts fetched successfully',
      meta: createMeta(page, limit, total),
      data: {
        alerts,
        activeTab: tab,
        tabCounts,
        unreadCount,
        headerSubtitle: `${unreadCount} unread · signals, market conditions, community and announcements`,
        paginationInfo: {
          from,
          to,
          total,
          label,
        },
      },
    };
  }

  // ─── 2. Unread Count for Badge ─────────────────────────────────────
  async getUnreadCount(userId?: string | Types.ObjectId): Promise<any> {
    const count = await this.alertModel.countDocuments({ isRead: false });
    return {
      message: 'Unread alert count fetched successfully',
      data: {
        unreadCount: count,
        headerSubtitle: `${count} unread · signals, market conditions, community and announcements`,
      },
    };
  }

  // ─── 3. Mark All Alerts as Read (Top button) ───────────────────────
  async markAllAsRead(userId?: string | Types.ObjectId): Promise<any> {
    const result = await this.alertModel.updateMany(
      { isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

    // Notify connected sockets that unread count is now 0
    const targetId = userId?.toString() || DEMO_USER_ID.toString();
    this.alertsGateway.sendUnreadCount(targetId, 0);

    return {
      message: 'All alerts marked as read',
      data: { modifiedCount: result.modifiedCount },
    };
  }

  // ─── 4. Mark Single Alert as Read ──────────────────────────────────
  async markAsRead(
    userId?: string | Types.ObjectId,
    alertId?: string,
  ): Promise<any> {
    if (!alertId || !Types.ObjectId.isValid(alertId)) {
      throw new NotFoundException('Valid alert ID is required');
    }

    const alert = await this.alertModel.findByIdAndUpdate(
      new Types.ObjectId(alertId),
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    );

    if (!alert) throw new NotFoundException(`Alert ${alertId} not found`);

    const unreadCount = await this.alertModel.countDocuments({ isRead: false });
    const targetId = userId?.toString() || DEMO_USER_ID.toString();
    this.alertsGateway.sendUnreadCount(targetId, unreadCount);

    return {
      message: 'Alert marked as read',
      data: alert,
    };
  }

  // ─── 5. Dismiss / Delete Alert ─────────────────────────────────────
  async deleteAlert(
    userId?: string | Types.ObjectId,
    alertId?: string,
  ): Promise<any> {
    if (!alertId || !Types.ObjectId.isValid(alertId)) {
      throw new NotFoundException('Valid alert ID is required');
    }

    const deleted = await this.alertModel.findByIdAndDelete(
      new Types.ObjectId(alertId),
    );
    if (!deleted) throw new NotFoundException(`Alert ${alertId} not found`);

    return {
      message: 'Alert dismissed successfully',
      data: { id: alertId },
    };
  }

  // ─── 6. Notification Settings & Quiet Hours (Right Drawer) ─────────
  async getSettings(userId?: string | Types.ObjectId): Promise<any> {
    const targetUserId =
      userId && Types.ObjectId.isValid(userId.toString())
        ? new Types.ObjectId(userId.toString())
        : DEMO_USER_ID;

    let settings = await this.settingsModel.findOne({ userId: targetUserId }).lean();

    if (!settings) {
      settings = await this.settingsModel.create({
        userId: targetUserId,
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
      message: 'Notification settings fetched successfully',
      data: settings,
    };
  }

  // ─── 7. Update Notification Settings & Quiet Hours ─────────────────
  async updateSettings(
    userId: string | Types.ObjectId | undefined,
    dto: UpdateNotificationSettingsDto,
  ): Promise<any> {
    const targetUserId =
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
      { userId: targetUserId },
      { $set: updateDoc },
      { new: true, upsert: true },
    );

    return {
      message: 'Notification settings updated successfully',
      data: updated,
    };
  }

  // ─── 8. Create Live Alert (with WebSocket Broadcast) ───────────────
  async createAlert(dto: CreateAlertDto): Promise<any> {
    const alert = await this.alertModel.create({
      ...dto,
      userId: dto.userId ? new Types.ObjectId(dto.userId) : null,
      createdAt: new Date(),
    });

    // Broadcast in real-time over WebSocket
    if (dto.userId) {
      this.alertsGateway.sendUserAlert(dto.userId, alert);
    } else {
      this.alertsGateway.broadcastAlert(alert);
    }

    return {
      message: 'Alert created and broadcasted successfully',
      data: alert,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────
  private async calculateTabCounts(): Promise<any> {
    const counts = await this.alertModel.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const tabMap: Record<string, number> = {
      all: 0,
      signals: 0,
      market: 0,
      community: 0,
      announcements: 0,
    };

    let total = 0;
    for (const c of counts) {
      if (tabMap.hasOwnProperty(c._id)) {
        tabMap[c._id] = c.count;
      }
      total += c.count;
    }
    tabMap.all = total;

    return tabMap;
  }

  private formatTimeAgo(date: Date): string {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${Math.max(1, diffMins)} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  }

  // ─── Initial Seeding Matching Exact Screenshot Feed ────────────────
  private async seedInitialAlerts(): Promise<void> {
    const count = await this.alertModel.countDocuments();
    if (count >= 100) return;

    this.logger.log('Seeding initial Alerts matching UI screenshot feed...');

    const now = Date.now();
    const m = (minsAgo: number) => new Date(now - minsAgo * 60000);
    const h = (hoursAgo: number) => new Date(now - hoursAgo * 3600000);
    const d = (daysAgo: number) => new Date(now - daysAgo * 86400000);

    // Exact items from the screenshot
    const seedFeed: any[] = [
      // 1. Highlighted Card: Microsoft (MSFT) New Signal (14 min ago, unread)
      {
        category: 'signals',
        type: 'new_signal',
        title: 'Microsoft (MSFT)',
        message: 'New PureBullion long signal opened following breadth confirmation and volume breakout.',
        isHighlighted: true,
        isRead: false,
        createdAt: m(14),
        data: {
          symbol: 'MSFT',
          companyName: 'Microsoft Corp',
          entryPrice: 509.40,
          targetPrice: 538.00,
          stopLoss: 496.20,
          action: 'BUY',
          status: 'Open signal',
          linkUrl: '/signals/PB-2480',
        },
      },
      // 2. Signal approaching entry: Costco (COST) (38 min ago, unread)
      {
        category: 'signals',
        type: 'proximity',
        title: 'Signal approaching entry: Costco (COST)',
        message: 'BUY trigger at $931.00 — currently 0.96% away',
        isHighlighted: false,
        isRead: false,
        createdAt: m(38),
        data: {
          symbol: 'COST',
          companyName: 'Costco Wholesale Corp',
          entryPrice: 931.00,
          distancePct: '0.96%',
          action: 'BUY',
        },
      },
      // 3. Market condition changed to Risk-On (2h ago, unread)
      {
        category: 'market',
        type: 'market_condition',
        title: 'Market condition changed to Risk-On',
        message: 'Breadth, trend and volatility conditions all improved at the close',
        isHighlighted: false,
        isRead: false,
        createdAt: h(2),
        data: {
          status: 'Risk-On',
        },
      },
      // 4. Market condition changed to Risk-On (2h ago, read)
      {
        category: 'market',
        type: 'market_condition',
        title: 'Market condition changed to Risk-On',
        message: 'Breadth, trend and volatility conditions all improved at the close',
        isHighlighted: false,
        isRead: true,
        readAt: h(1),
        createdAt: h(2),
        data: {
          status: 'Risk-On',
        },
      },
      // 5. Signal closed: Caterpillar (CAT) (4h ago, read)
      {
        category: 'signals',
        type: 'signal_closed',
        title: 'Signal closed: Caterpillar (CAT)',
        message: 'Target reached · +6.73% from entry over 9 sessions',
        isHighlighted: false,
        isRead: true,
        readAt: h(3),
        createdAt: h(4),
        data: {
          symbol: 'CAT',
          performance: '+6.73%',
          sessions: 9,
          status: 'Target reached',
        },
      },
      // 6. Signal closed: Caterpillar (CAT) (4h ago, read)
      {
        category: 'signals',
        type: 'signal_closed',
        title: 'Signal closed: Caterpillar (CAT)',
        message: 'Target reached · +6.73% from entry over 9 sessions',
        isHighlighted: false,
        isRead: true,
        readAt: h(3),
        createdAt: h(4),
        data: {
          symbol: 'CAT',
          performance: '+6.73%',
          sessions: 9,
          status: 'Target reached',
        },
      },
      // 7. Community: Rina K. replied to your post (6h ago, read)
      {
        category: 'community',
        type: 'community_reply',
        title: 'Rina K. replied to your post',
        message: '"That matches what I\'m seeing on the equal-weight comparison."',
        isHighlighted: false,
        isRead: true,
        readAt: h(5),
        createdAt: h(6),
        data: {
          author: 'Rina K.',
          quoteText: "That matches what I'm seeing on the equal-weight comparison.",
        },
      },
      // 8. Community: Rina K. replied to your post (6h ago, read)
      {
        category: 'community',
        type: 'community_reply',
        title: 'Rina K. replied to your post',
        message: '"That matches what I\'m seeing on the equal-weight comparison."',
        isHighlighted: false,
        isRead: true,
        readAt: h(5),
        createdAt: h(6),
        data: {
          author: 'Rina K.',
          quoteText: "That matches what I'm seeing on the equal-weight comparison.",
        },
      },
      // 9. Watchlist mover: NVDA +2.80% (7h ago, read)
      {
        category: 'market',
        type: 'watchlist_mover',
        title: 'Watchlist mover: NVDA +2.80%',
        message: 'Volume running 1.9x the 30-day average',
        isHighlighted: false,
        isRead: true,
        readAt: h(6),
        createdAt: h(7),
        data: {
          symbol: 'NVDA',
          performance: '+2.80%',
          volumeRatio: '1.9x',
        },
      },
      // 10. Announcement: Scanner update: two new exit conditions (Yesterday, read)
      {
        category: 'announcements',
        type: 'announcement',
        title: 'Scanner update: two new exit conditions',
        message: 'Volatility expansion and relative-strength deterioration are now available',
        isHighlighted: false,
        isRead: true,
        readAt: h(20),
        createdAt: d(1),
        data: {
          status: 'Feature update',
        },
      },
      // 11. Announcement: Scanner update (Yesterday, read)
      {
        category: 'announcements',
        type: 'announcement',
        title: 'Scanner update: two new exit conditions',
        message: 'Volatility expansion and relative-strength deterioration are now available',
        isHighlighted: false,
        isRead: true,
        readAt: h(20),
        createdAt: d(1),
        data: {
          status: 'Feature update',
        },
      },
      // 12. Announcement: Scanner update (Yesterday, read)
      {
        category: 'announcements',
        type: 'announcement',
        title: 'Scanner update: two new exit conditions',
        message: 'Volatility expansion and relative-strength deterioration are now available',
        isHighlighted: false,
        isRead: true,
        readAt: h(20),
        createdAt: d(1),
        data: {
          status: 'Feature update',
        },
      },
      // 13. Signal closed: UnitedHealth (UNH) (2d ago, read)
      {
        category: 'signals',
        type: 'signal_closed',
        title: 'Signal closed: UnitedHealth (UNH)',
        message: 'Closed on exit rule · +3.25% over 11 sessions',
        isHighlighted: false,
        isRead: true,
        readAt: d(1),
        createdAt: d(2),
        data: {
          symbol: 'UNH',
          performance: '+3.25%',
          sessions: 11,
          status: 'Closed on exit rule',
        },
      },
    ];

    // Additional items to reach exactly 120 total items matching "Showing 1 to 9 of 120 results"
    const templates = [
      {
        category: 'signals',
        type: 'signal_closed',
        title: 'Signal closed: NVIDIA (NVDA)',
        message: 'Target reached · +8.40% over 14 sessions',
        data: { symbol: 'NVDA', performance: '+8.40%', sessions: 14 },
      },
      {
        category: 'market',
        type: 'watchlist_mover',
        title: 'Watchlist mover: TSLA +3.20%',
        message: 'Volume running 1.5x the 30-day average',
        data: { symbol: 'TSLA', performance: '+3.20%', volumeRatio: '1.5x' },
      },
      {
        category: 'community',
        type: 'community_reply',
        title: 'Alex P. commented on your thesis',
        message: '"Interesting take on semiconductor inventory levels."',
        data: { author: 'Alex P.' },
      },
      {
        category: 'announcements',
        type: 'announcement',
        title: 'Scheduled Platform Maintenance: Sunday 02:00 UTC',
        message: 'System upgrade for live Twelve Data streaming quotes.',
        data: { status: 'Maintenance' },
      },
    ];

    let counter = 14;
    while (seedFeed.length < 120) {
      const tmpl = templates[(counter - 14) % templates.length];
      const days = Math.floor(counter / 4) + 2;
      seedFeed.push({
        ...tmpl,
        isHighlighted: false,
        isRead: true,
        readAt: d(days - 1),
        createdAt: d(days),
      });
      counter++;
    }

    await this.alertModel.insertMany(seedFeed);
    this.logger.log(`Successfully seeded ${seedFeed.length} initial alerts!`);
  }
}


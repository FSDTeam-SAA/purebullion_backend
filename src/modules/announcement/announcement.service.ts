import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Announcement,
  AnnouncementDocument,
} from './schemas/announcement.schema';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  GetAnnouncementsQueryDto,
} from './dto/announcement.dto';
import { AlertsService } from '../alerts/alerts.service';
import { AlertsGateway } from '../alerts/alerts.gateway';
import { createMeta } from '../../common/utils/pagination.util';

@Injectable()
export class AnnouncementService implements OnModuleInit {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,
    private readonly alertsService: AlertsService,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedInitialAnnouncements();
  }

  // ─── ADMIN: Create Announcement ────────────────────────────────────
  async create(
    dto: CreateAnnouncementDto,
    adminUserId?: string | Types.ObjectId,
  ): Promise<any> {
    const slugBase = dto.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${slugBase}-${Date.now().toString().slice(-6)}`;

    const announcement = await this.announcementModel.create({
      ...dto,
      slug,
      createdBy:
        adminUserId && Types.ObjectId.isValid(adminUserId.toString())
          ? new Types.ObjectId(adminUserId.toString())
          : null,
      publishedAt: new Date(),
    });

    // If published, automatically generate in the Alerts feed and broadcast via WebSocket
    if (dto.isPublished !== false) {
      await this.alertsService.createAlert({
        category: 'announcements',
        type: 'announcement',
        title: dto.title,
        message: dto.message,
        data: {
          announcementId: announcement._id,
          type: dto.type,
          priority: dto.priority,
          targetTiers: dto.targetTiers,
        },
      });

      this.alertsGateway.broadcastAnnouncement(announcement);
    }

    return {
      message: 'Announcement created successfully',
      data: announcement,
    };
  }

  // ─── ADMIN: List All Announcements ─────────────────────────────────
  async findAll(query: GetAnnouncementsQueryDto): Promise<any> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 10));
    const filter: any = {};

    if (query.type) {
      filter.type = query.type;
    }
    if (query.isPublished !== undefined) {
      filter.isPublished = query.isPublished;
    }
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { message: { $regex: query.search, $options: 'i' } },
      ];
    }

    const total = await this.announcementModel.countDocuments(filter);
    const skip = (page - 1) * limit;

    const announcements = await this.announcementModel
      .find(filter)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      message: 'Announcements fetched successfully',
      meta: createMeta(page, limit, total),
      data: announcements,
    };
  }

  // ─── ADMIN: Get Single Announcement ────────────────────────────────
  async findOne(id: string): Promise<any> {
    let announcement: any = null;
    if (Types.ObjectId.isValid(id)) {
      announcement = await this.announcementModel.findById(id).lean();
    }
    if (!announcement) {
      announcement = await this.announcementModel.findOne({ slug: id }).lean();
    }
    if (!announcement) {
      throw new NotFoundException(`Announcement '${id}' not found`);
    }

    return {
      message: 'Announcement details fetched successfully',
      data: announcement,
    };
  }

  // ─── ADMIN: Update Announcement ────────────────────────────────────
  async update(id: string, dto: UpdateAnnouncementDto): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Valid announcement ID is required');
    }

    const updated = await this.announcementModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      { $set: dto },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Announcement '${id}' not found`);
    }

    return {
      message: 'Announcement updated successfully',
      data: updated,
    };
  }

  // ─── ADMIN: Delete Announcement ────────────────────────────────────
  async remove(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Valid announcement ID is required');
    }

    const deleted = await this.announcementModel.findByIdAndDelete(
      new Types.ObjectId(id),
    );
    if (!deleted) {
      throw new NotFoundException(`Announcement '${id}' not found`);
    }

    return {
      message: 'Announcement deleted successfully',
      data: { id },
    };
  }

  // ─── USER: Get Active Announcements ────────────────────────────────
  async getActiveAnnouncements(tier = 'all'): Promise<any> {
    const now = new Date();
    const filter: any = {
      isPublished: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };

    if (tier !== 'all') {
      filter.targetTiers = { $in: ['all', tier] };
    }

    const announcements = await this.announcementModel
      .find(filter)
      .sort({ publishedAt: -1 })
      .limit(10)
      .lean();

    return {
      message: 'Active announcements fetched successfully',
      data: announcements,
    };
  }

  // ─── Initial Seeding of Announcements ──────────────────────────────
  private async seedInitialAnnouncements(): Promise<void> {
    const count = await this.announcementModel.countDocuments();
    if (count > 0) return;

    this.logger.log('Seeding initial announcements...');

    await this.announcementModel.create([
      {
        title: 'Scanner update: two new exit conditions',
        slug: 'scanner-update-two-new-exit-conditions',
        message:
          'Volatility expansion and relative-strength deterioration are now available in the stock scanner parameter matrix.',
        type: 'scanner_update',
        targetTiers: ['all'],
        priority: 'high',
        isPublished: true,
        author: 'PureBullion Product Team',
        publishedAt: new Date(Date.now() - 86400000), // Yesterday
      },
      {
        title: 'Scheduled Maintenance: Real-Time Market Data Stream Upgrade',
        slug: 'scheduled-maintenance-real-time-market-data-stream-upgrade',
        message:
          'PureBullion infrastructure will undergo scheduled socket synchronization this weekend. All open alerts and signal tracking will remain active.',
        type: 'maintenance',
        targetTiers: ['all'],
        priority: 'medium',
        isPublished: true,
        author: 'PureBullion DevOps',
        publishedAt: new Date(Date.now() - 2 * 86400000),
      },
    ]);
  }
}


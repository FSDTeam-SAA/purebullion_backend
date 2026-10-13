import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SubscriptionPlan,
  SubscriptionPlanDocument,
} from '../schemas/subscription-plan.schema';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';

@Injectable()
export class SubscriptionPlanService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionPlanService.name);

  constructor(
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlanDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPlansIfEmpty();
  }

  /**
   * Seed the default plans from UI screenshot if no plans exist yet
   */
  async seedDefaultPlansIfEmpty() {
    const count = await this.planModel.countDocuments();
    if (count > 0) return;

    this.logger.log('Seeding initial subscription plans...');

    const initialPlans = [
      {
        name: 'Essential',
        slug: 'essential',
        description:
          'Perfect for exploring market data and tracking your favourite stocks.',
        monthlyPrice: 49,
        yearlyPrice: 470,
        currency: 'USD',
        benefits: [
          'Market overview',
          'Basic stock screener',
          'One personalized watchlist',
          'Basic market alerts',
        ],
        features: {
          marketOverview: true,
          stockScreener: 'basic',
          watchlistLimit: 1,
          unlimitedWatchlists: false,
          marketAlerts: 'basic',
          aiMarketAnalysis: false,
          premiumResearchAccess: false,
          advancedAiResearchTools: false,
          exclusiveMarketInsights: false,
          priorityCommunityAccess: false,
          customAlertPreferences: false,
        },
        isActive: true,
        isPopular: false,
        sortOrder: 1,
      },
      {
        name: 'Professional',
        slug: 'professional',
        description:
          'Advanced intelligence and AI powered research for active investors.',
        monthlyPrice: 89,
        yearlyPrice: 850,
        currency: 'USD',
        benefits: [
          'Advanced stock screener',
          'Unlimited watchlists',
          'AI-powered market analysis',
          'Premium research access',
          'Unlimited watchlists',
        ],
        features: {
          marketOverview: true,
          stockScreener: 'advanced',
          watchlistLimit: -1,
          unlimitedWatchlists: true,
          marketAlerts: 'advanced',
          aiMarketAnalysis: true,
          premiumResearchAccess: true,
          advancedAiResearchTools: false,
          exclusiveMarketInsights: false,
          priorityCommunityAccess: false,
          customAlertPreferences: false,
        },
        isActive: true,
        isPopular: true,
        sortOrder: 2,
      },
      {
        name: 'Elite',
        slug: 'elite',
        description:
          'Complete market intelligence and exclusive access for serious investors.',
        monthlyPrice: 149,
        yearlyPrice: 1400,
        currency: 'USD',
        benefits: [
          'Advanced AI research tools',
          'Exclusive market insights',
          'Priority community access',
          'Custom alert preferences',
        ],
        features: {
          marketOverview: true,
          stockScreener: 'advanced',
          watchlistLimit: -1,
          unlimitedWatchlists: true,
          marketAlerts: 'custom',
          aiMarketAnalysis: true,
          premiumResearchAccess: true,
          advancedAiResearchTools: true,
          exclusiveMarketInsights: true,
          priorityCommunityAccess: true,
          customAlertPreferences: true,
        },
        isActive: true,
        isPopular: false,
        sortOrder: 3,
      },
    ];

    await this.planModel.insertMany(initialPlans);
    this.logger.log('Initial subscription plans successfully seeded.');
  }

  // ─── Plan CRUD ───────────────────────────────────────────────

  async createPlan(dto: CreatePlanDto) {
    const slug =
      dto.slug?.toLowerCase().trim() ||
      dto.name.toLowerCase().trim().replace(/\s+/g, '-');

    const existing = await this.planModel.findOne({ slug });
    if (existing) {
      throw new ConflictException(`A plan with slug "${slug}" already exists`);
    }

    const plan = await this.planModel.create({
      ...dto,
      slug,
    });

    return {
      message: 'Subscription plan created successfully',
      data: plan,
    };
  }

  async getAllPlans(includeInactive = false) {
    const query = includeInactive ? {} : { isActive: true };
    const plans = await this.planModel
      .find(query)
      .sort({ sortOrder: 1, createdAt: 1 });

    return {
      message: 'Subscription plans fetched successfully',
      data: plans,
    };
  }

  async getPlanById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid plan ID format');
    }

    const plan = await this.planModel.findById(id);
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return {
      message: 'Subscription plan fetched successfully',
      data: plan,
    };
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid plan ID format');
    }

    if (dto.name && !dto.slug) {
      dto.slug = dto.name.toLowerCase().trim().replace(/\s+/g, '-');
    }

    if (dto.slug) {
      const duplicate = await this.planModel.findOne({
        slug: dto.slug,
        _id: { $ne: id },
      });
      if (duplicate) {
        throw new ConflictException(`Slug "${dto.slug}" is already in use`);
      }
    }

    const updatedPlan = await this.planModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true, runValidators: true },
    );

    if (!updatedPlan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return {
      message: 'Subscription plan updated successfully',
      data: updatedPlan,
    };
  }

  async deletePlan(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid plan ID format');
    }

    const deleted = await this.planModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException('Subscription plan not found');
    }

    return {
      message: 'Subscription plan deleted successfully',
      data: { id },
    };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserSubscription,
  UserSubscriptionDocument,
} from '../schemas/user-subscription.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanDocument,
} from '../schemas/subscription-plan.schema';
import { User, UserDocument } from '../../auth/schemas/user.schema';
import { BillingCycle, SubscriptionStatus } from '../enums/subscription.enum';
import { SubscribeDto } from '../dto/subscribe.dto';
import { GetBillingHistoryQueryDto } from '../dto/subscription-query.dto';
import {
  createMeta,
  createPaginationInfo,
} from '../../../common/utils/pagination.util';

@Injectable()
export class UserSubscriptionService {
  constructor(
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Subscribe / Purchase a plan
   */
  async subscribe(userId: string | Types.ObjectId, dto: SubscribeDto) {
    if (!Types.ObjectId.isValid(dto.planId)) {
      throw new BadRequestException('Invalid plan ID format');
    }

    const plan = await this.planModel.findById(dto.planId);
    if (!plan || !plan.isActive) {
      throw new NotFoundException(
        'Subscription plan not found or is currently inactive',
      );
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const startDate = now;
    const renewalDate = new Date(now);

    const isYearly = dto.billingCycle === BillingCycle.YEARLY;
    const amount = isYearly ? plan.yearlyPrice : plan.monthlyPrice;

    if (isYearly) {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    // Cancel any currently active subscription for this user
    await this.userSubscriptionModel.updateMany(
      {
        user: new Types.ObjectId(userId.toString()),
        status: SubscriptionStatus.ACTIVE,
      },
      {
        $set: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: now,
          autoRenew: false,
        },
      },
    );

    // Generate invoice number matching screenshot e.g. PB-2481
    const invoiceNumber = `PB-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create new active subscription record
    const subscription = await this.userSubscriptionModel.create({
      user: new Types.ObjectId(userId.toString()),
      plan: plan._id,
      billingCycle: dto.billingCycle,
      amount,
      currency: plan.currency || 'USD',
      status: SubscriptionStatus.ACTIVE,
      startDate,
      renewalDate,
      endDate: renewalDate,
      autoRenew: true,
      paymentStatus: 'paid',
      paymentMethod: dto.paymentMethod || 'card',
      transactionId:
        dto.transactionId ||
        `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      invoiceNumber,
    });

    // Update user's subscription flags
    await this.userModel.findByIdAndUpdate(userId, {
      $set: {
        hasActiveSubscription: true,
        subscriptionExpireDate: renewalDate,
        currentPlan: plan._id,
      },
    });

    const populatedSubscription = await this.userSubscriptionModel
      .findById(subscription._id)
      .populate('plan');

    return {
      message: `Successfully subscribed to ${plan.name} plan`,
      data: {
        subscription: populatedSubscription,
        features: plan.features,
        benefits: plan.benefits,
      },
    };
  }

  /**
   * Get currently active subscription for user
   */
  async getMySubscription(userId: string | Types.ObjectId) {
    const now = new Date();
    const activeSub = await this.userSubscriptionModel
      .findOne({
        user: new Types.ObjectId(userId.toString()),
        status: SubscriptionStatus.ACTIVE,
      })
      .sort({ createdAt: -1 })
      .populate('plan');

    if (!activeSub) {
      // Check if user has an expired or past subscription
      const lastSub = await this.userSubscriptionModel
        .findOne({ user: new Types.ObjectId(userId.toString()) })
        .sort({ createdAt: -1 })
        .populate('plan');

      return {
        message: 'No active subscription found',
        data: {
          hasActiveSubscription: false,
          currentSubscription: null,
          lastSubscription: lastSub,
        },
      };
    }

    // Check if subscription has passed its renewal / expiry date
    if (activeSub.renewalDate && activeSub.renewalDate < now) {
      activeSub.status = SubscriptionStatus.EXPIRED;
      await activeSub.save();

      await this.userModel.findByIdAndUpdate(userId, {
        $set: {
          hasActiveSubscription: false,
        },
      });

      return {
        message: 'Subscription has expired',
        data: {
          hasActiveSubscription: false,
          currentSubscription: null,
          lastSubscription: activeSub,
        },
      };
    }

    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (activeSub.renewalDate.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const plan = activeSub.plan as any;

    return {
      message: 'Active subscription retrieved successfully',
      data: {
        hasActiveSubscription: true,
        daysRemaining,
        subscription: activeSub,
        features: plan?.features ?? {},
        benefits: plan?.benefits ?? [],
      },
    };
  }

  /**
   * Cancel user subscription
   */
  async cancelSubscription(userId: string | Types.ObjectId) {
    const sub = await this.userSubscriptionModel.findOne({
      user: new Types.ObjectId(userId.toString()),
      status: SubscriptionStatus.ACTIVE,
    });

    if (!sub) {
      throw new BadRequestException('No active subscription found to cancel');
    }

    const now = new Date();
    sub.status = SubscriptionStatus.CANCELLED;
    sub.cancelledAt = now;
    sub.autoRenew = false;
    await sub.save();

    await this.userModel.findByIdAndUpdate(userId, {
      $set: {
        hasActiveSubscription: false,
      },
    });

    return {
      message: 'Subscription cancelled successfully',
      data: sub,
    };
  }

  /**
   * Check feature access / capability for a user
   */
  async checkFeatureAccess(
    userId: string | Types.ObjectId,
    featureKey: string,
  ) {
    const { data } = await this.getMySubscription(userId);
    if (!data.hasActiveSubscription) {
      return {
        hasAccess: false,
        limit: 0,
        feature: featureKey,
        reason: 'No active subscription',
      };
    }

    const features = data.features as Record<string, any>;
    const featureVal = features[featureKey];

    return {
      hasAccess: Boolean(featureVal),
      value: featureVal,
      feature: featureKey,
    };
  }

  // ─── Billing History & Invoices (Matching UI) ────────────────

  private formatDate(date: Date): string {
    const d = new Date(date);
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  private getInvoiceNumber(sub: any): string {
    if (sub.invoiceNumber) return sub.invoiceNumber;
    const hex = sub._id?.toString() || '';
    const num = hex ? (parseInt(hex.slice(-4), 16) % 9000) + 1000 : 2480;
    return `PB-${num}`;
  }

  /**
   * Get user billing history with pagination (matching screenshot)
   */
  async getBillingHistory(
    userId: string | Types.ObjectId,
    query: GetBillingHistoryQueryDto,
  ) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const filter = { user: new Types.ObjectId(userId.toString()) };

    const total = await this.userSubscriptionModel.countDocuments(filter);
    const subscriptions = await this.userSubscriptionModel
      .find(filter)
      .populate('plan')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const billingHistory = subscriptions.map((sub: any) => {
      const planName = sub.plan?.name || 'Subscription';
      const invoice = this.getInvoiceNumber(sub);
      const date = sub.createdAt || sub.startDate;
      const formattedDate = this.formatDate(date);
      const description = `${planName} · ${sub.billingCycle}`;
      const amount = sub.amount;
      const formattedAmount = `$${amount.toFixed(2)}`;
      const status =
        sub.paymentStatus === 'paid' ? 'Paid' : sub.paymentStatus || 'Paid';

      return {
        _id: sub._id,
        invoice,
        date,
        formattedDate,
        description,
        amount,
        formattedAmount,
        currency: sub.currency || 'USD',
        status,
        plan: sub.plan
          ? {
              _id: sub.plan._id,
              name: sub.plan.name,
              slug: sub.plan.slug,
            }
          : null,
        billingCycle: sub.billingCycle,
        paymentMethod: sub.paymentMethod || 'card',
        action: {
          downloadUrl: `/api/v1/subscription/billing-history/${sub._id}/download`,
        },
      };
    });

    return {
      message: 'Billing history fetched successfully',
      meta: createMeta(page, limit, total),
      data: {
        billingHistory,
        paginationInfo: createPaginationInfo(page, limit, total),
      },
    };
  }

  /**
   * Get invoice receipt details and downloadable HTML
   */
  async getInvoiceReceipt(
    userId: string | Types.ObjectId,
    subscriptionId: string,
  ) {
    if (!Types.ObjectId.isValid(subscriptionId)) {
      throw new BadRequestException('Invalid subscription ID format');
    }

    const sub: any = await this.userSubscriptionModel
      .findOne({
        _id: new Types.ObjectId(subscriptionId),
        user: new Types.ObjectId(userId.toString()),
      })
      .populate('plan');

    if (!sub) {
      throw new NotFoundException('Invoice not found');
    }

    const user = await this.userModel.findById(userId);
    const invoiceNum = this.getInvoiceNumber(sub);
    const planName = sub.plan?.name || 'Subscription Plan';
    const dateStr = this.formatDate(sub.createdAt || sub.startDate);

    return {
      invoiceNumber: invoiceNum,
      date: dateStr,
      user: {
        name: user?.name || 'Valued Customer',
        email: user?.email || '',
        company: user?.company || '',
      },
      planName,
      billingCycle: sub.billingCycle,
      amount: sub.amount,
      formattedAmount: `$${sub.amount.toFixed(2)}`,
      currency: sub.currency || 'USD',
      status: 'Paid',
      paymentMethod: sub.paymentMethod || 'card',
      transactionId: sub.transactionId || 'N/A',
      html: this.renderInvoiceHtml({
        invoiceNumber: invoiceNum,
        dateStr,
        userName: user?.name || 'Valued Customer',
        userEmail: user?.email || '',
        userCompany: user?.company || '',
        planName,
        billingCycle: sub.billingCycle,
        amount: sub.amount,
        formattedAmount: `$${sub.amount.toFixed(2)}`,
        status: 'Paid',
      }),
    };
  }

  /**
   * Generate downloadable statement for "Download All" button
   */
  async getAllInvoicesStatement(userId: string | Types.ObjectId) {
    const user = await this.userModel.findById(userId);
    const subs: any[] = await this.userSubscriptionModel
      .find({ user: new Types.ObjectId(userId.toString()) })
      .populate('plan')
      .sort({ createdAt: -1 });

    const items = subs.map((s) => ({
      invoiceNumber: this.getInvoiceNumber(s),
      dateStr: this.formatDate(s.createdAt || s.startDate),
      planName: s.plan?.name || 'Subscription',
      billingCycle: s.billingCycle,
      formattedAmount: `$${s.amount.toFixed(2)}`,
      status: s.paymentStatus === 'paid' ? 'Paid' : s.paymentStatus,
    }));

    const totalAmount = subs.reduce((sum, s) => sum + (s.amount || 0), 0);

    return {
      statementDate: this.formatDate(new Date()),
      user: {
        name: user?.name || 'Valued Customer',
        email: user?.email || '',
        company: user?.company || '',
      },
      totalInvoices: items.length,
      totalAmount,
      formattedTotalAmount: `$${totalAmount.toFixed(2)}`,
      invoices: items,
      html: this.renderStatementHtml({
        userName: user?.name || 'Valued Customer',
        userEmail: user?.email || '',
        items,
        totalAmount: `$${totalAmount.toFixed(2)}`,
      }),
    };
  }

  private renderInvoiceHtml(data: {
    invoiceNumber: string;
    dateStr: string;
    userName: string;
    userEmail: string;
    userCompany?: string;
    planName: string;
    billingCycle: string;
    amount: number;
    formattedAmount: string;
    status: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${data.invoiceNumber} - PureBullion</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0c0f17; color: #f0f0f0; margin: 0; padding: 40px; }
    .invoice-card { max-width: 650px; margin: auto; background: #131722; border: 1px solid #232938; border-radius: 12px; padding: 36px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #232938; padding-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 700; color: #e5b958; letter-spacing: 1px; }
    .badge { background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; text-transform: uppercase; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 28px 0; }
    .meta-title { font-size: 12px; text-transform: uppercase; color: #7e879b; margin-bottom: 4px; letter-spacing: 0.5px; }
    .meta-val { font-size: 15px; font-weight: 500; color: #ffffff; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th { text-align: left; padding: 12px; background: #181d2a; color: #9aa1b5; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 16px 12px; border-bottom: 1px solid #232938; font-size: 14px; }
    .total-row td { font-size: 16px; font-weight: 700; border-bottom: none; padding-top: 24px; color: #e5b958; }
    .footer { margin-top: 36px; text-align: center; font-size: 12px; color: #5a6275; }
    @media print { body { background: #fff; color: #000; } .invoice-card { border: 1px solid #ddd; background: #fff; color: #000; } .meta-val { color: #000; } th { background: #eee; color: #333; } }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div class="brand">PURE BULLION</div>
      <div class="badge">${data.status}</div>
    </div>
    <div class="meta-grid">
      <div>
        <div class="meta-title">Invoice Number</div>
        <div class="meta-val">${data.invoiceNumber}</div>
        <div class="meta-title" style="margin-top: 14px;">Billed To</div>
        <div class="meta-val">${data.userName}</div>
        <div style="font-size: 13px; color: #9aa1b5;">${data.userEmail}</div>
      </div>
      <div style="text-align: right;">
        <div class="meta-title">Invoice Date</div>
        <div class="meta-val">${data.dateStr}</div>
        <div class="meta-title" style="margin-top: 14px;">Billing Period</div>
        <div class="meta-val" style="text-transform: capitalize;">${data.billingCycle}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Cycle</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${data.planName}</strong> plan subscription</td>
          <td style="text-transform: capitalize;">${data.billingCycle}</td>
          <td style="text-align: right;">${data.formattedAmount}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2">Total Paid</td>
          <td style="text-align: right;">${data.formattedAmount}</td>
        </tr>
      </tbody>
    </table>
    <div class="footer">
      <p>Thank you for choosing PureBullion. For questions, contact support@purebullion.com</p>
    </div>
  </div>
</body>
</html>`;
  }

  private renderStatementHtml(data: {
    userName: string;
    userEmail: string;
    items: Array<{
      invoiceNumber: string;
      dateStr: string;
      planName: string;
      billingCycle: string;
      formattedAmount: string;
      status: string;
    }>;
    totalAmount: string;
  }): string {
    const rows = data.items
      .map(
        (i) => `<tr>
        <td><strong>${i.invoiceNumber}</strong></td>
        <td>${i.dateStr}</td>
        <td>${i.planName} · ${i.billingCycle}</td>
        <td><span style="color: #22c55e;">${i.status}</span></td>
        <td style="text-align: right;">${i.formattedAmount}</td>
      </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Billing Statement - PureBullion</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0c0f17; color: #f0f0f0; margin: 0; padding: 40px; }
    .card { max-width: 800px; margin: auto; background: #131722; border: 1px solid #232938; border-radius: 12px; padding: 36px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #232938; padding-bottom: 20px; }
    .brand { font-size: 24px; font-weight: 700; color: #e5b958; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th { text-align: left; padding: 12px; background: #181d2a; color: #9aa1b5; font-size: 12px; text-transform: uppercase; }
    td { padding: 14px 12px; border-bottom: 1px solid #232938; font-size: 14px; }
    .total-row td { font-size: 16px; font-weight: 700; color: #e5b958; padding-top: 20px; border-bottom: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">PURE BULLION</div>
      <div>Billing History Statement</div>
    </div>
    <p style="color: #9aa1b5; margin-top: 18px;">Account: <strong>${data.userName}</strong> (${data.userEmail})</p>
    <table>
      <thead>
        <tr>
          <th>Invoice</th>
          <th>Date</th>
          <th>Description</th>
          <th>Status</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="4">Total Lifetime Invoiced</td>
          <td style="text-align: right;">${data.totalAmount}</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
  }
}


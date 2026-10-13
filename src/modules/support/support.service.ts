import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import {
  SupportMessage,
  SupportMessageDocument,
} from './schemas/support-message.schema';
import {
  CreateContactDto,
  GetSupportQueryDto,
  ResolveSupportDto,
} from './dto/support.dto';
import { EmailService } from '../../infrastructure/email/email.service';
import {
  createMeta,
  createPaginationInfo,
} from '../../common/utils/pagination.util';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectModel(SupportMessage.name)
    private readonly supportModel: Model<SupportMessageDocument>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private formatDateISO(date: Date): string {
    return new Date(date).toISOString().split('T')[0]; // e.g. '2024-01-15'
  }

  // ─── User / Public: Submit Contact Us Message ───────────────

  async submitContactMessage(dto: CreateContactDto) {
    const phone = (dto.phoneNumber || dto.phone || '').trim();

    const record = await this.supportModel.create({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      phoneNumber: phone,
      message: dto.message.trim(),
      status: 'pending',
    });

    // Notify Admin via Email
    const adminEmail =
      this.configService.get<string>('email.adminEmail') ||
      this.configService.get<string>('email.from');

    if (adminEmail) {
      try {
        await this.emailService.sendEmail({
          to: adminEmail,
          subject: `New Support Inquiry from ${record.name}`,
          html: this.adminNotificationTemplate({
            name: record.name,
            email: record.email,
            phoneNumber: record.phoneNumber,
            message: record.message,
            date: this.formatDateISO((record as any).createdAt || new Date()),
          }),
        });
      } catch (err) {
        this.logger.warn(
          `Saved support message ${record._id}, but failed to send admin notification email`,
          err,
        );
      }
    }

    return {
      message:
        'Your message has been sent successfully. Our support team will get back to you soon.',
      data: record,
    };
  }

  // ─── Admin: List & Filter Support Messages (Screenshot 2) ───

  async getAllSupportMessages(query: GetSupportQueryDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const filter: Record<string, any> = {};

    // Filter by tab: All | Pending | Resolved
    if (query.status && query.status.toLowerCase() !== 'all') {
      filter.status = query.status.toLowerCase();
    }

    // Search by name, email, phoneNumber, or message content
    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
        { message: searchRegex },
      ];
    }

    const [total, messages, allCount, pendingCount, resolvedCount] =
      await Promise.all([
        this.supportModel.countDocuments(filter),
        this.supportModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        this.supportModel.countDocuments(),
        this.supportModel.countDocuments({ status: 'pending' }),
        this.supportModel.countDocuments({ status: 'resolved' }),
      ]);

    const formattedMessages = messages.map((msg: any) => ({
      _id: msg._id,
      date: this.formatDateISO(msg.createdAt),
      createdAt: msg.createdAt,
      userName: msg.name,
      name: msg.name,
      email: msg.email,
      phoneNumber: msg.phoneNumber,
      message: msg.message,
      status: msg.status === 'resolved' ? 'Resolved' : 'Pending',
      rawStatus: msg.status,
      replyMessage: msg.replyMessage || '',
      resolvedAt: msg.resolvedAt,
    }));

    return {
      message: 'Support messages fetched successfully',
      meta: createMeta(page, limit, total),
      data: {
        counts: {
          all: allCount,
          pending: pendingCount,
          resolved: resolvedCount,
        },
        messages: formattedMessages,
        paginationInfo: createPaginationInfo(page, limit, total),
      },
    };
  }

  // ─── Admin: View Single Support Message (Eye Icon Modal) ────

  async getSupportMessageById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid support message ID');
    }

    const msg: any = await this.supportModel
      .findById(id)
      .populate('resolvedBy', 'name email');

    if (!msg) {
      throw new NotFoundException('Support message not found');
    }

    return {
      message: 'Support message details fetched successfully',
      data: {
        _id: msg._id,
        fullName: msg.name,
        name: msg.name,
        email: msg.email,
        phoneNumber: msg.phoneNumber,
        message: msg.message,
        status: msg.status === 'resolved' ? 'Resolved' : 'Pending',
        rawStatus: msg.status,
        replyMessage: msg.replyMessage || '',
        date: this.formatDateISO(msg.createdAt),
        createdAt: msg.createdAt,
        resolvedAt: msg.resolvedAt,
        resolvedBy: msg.resolvedBy,
      },
    };
  }

  // ─── Admin: Resolve & Reply to Support Message (Screenshot 3) ─

  async resolveSupportMessage(
    id: string,
    dto: ResolveSupportDto,
    adminId?: string | Types.ObjectId,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid support message ID');
    }

    const msg = await this.supportModel.findById(id);
    if (!msg) {
      throw new NotFoundException('Support message not found');
    }

    const newStatus = dto.status || 'resolved';
    msg.status = newStatus;
    if (dto.replyMessage !== undefined) {
      msg.replyMessage = dto.replyMessage.trim();
    }

    if (newStatus === 'resolved') {
      msg.resolvedAt = new Date();
      if (adminId && Types.ObjectId.isValid(adminId.toString())) {
        msg.resolvedBy = new Types.ObjectId(adminId.toString());
      }
    }

    await msg.save();

    // Send resolution & reply email to the user
    if (newStatus === 'resolved') {
      try {
        await this.emailService.sendEmail({
          to: msg.email,
          subject: 'Your PureBullion Support Request Has Been Resolved',
          html: this.userResolutionTemplate({
            name: msg.name,
            originalMessage: msg.message,
            replyMessage:
              msg.replyMessage ||
              'Thank you for reaching out to PureBullion Support. Your inquiry has been reviewed and resolved by our team.',
          }),
        });
      } catch (err) {
        this.logger.warn(
          `Marked support message ${msg._id} as resolved, but failed to send email to ${msg.email}`,
          err,
        );
      }
    }

    return {
      message: 'Support message marked as resolved and user notified via email',
      data: msg,
    };
  }

  // ─── Admin: Delete Support Message ──────────────────────────

  async deleteSupportMessage(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid support message ID');
    }

    const deleted = await this.supportModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException('Support message not found');
    }

    return {
      message: 'Support message deleted successfully',
      data: { id },
    };
  }

  // ─── HTML Email Templates ───────────────────────────────────

  private adminNotificationTemplate(data: {
    name: string;
    email: string;
    phoneNumber: string;
    message: string;
    date: string;
  }): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #0c0f17; color: #f0f0f0; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #131722; border: 1px solid #232938; border-radius: 10px; overflow: hidden; }
    .header { background: #181d2a; padding: 20px 28px; border-bottom: 1px solid #232938; }
    .header h2 { color: #e5b958; margin: 0; font-size: 20px; }
    .body { padding: 28px; color: #d0d5e0; line-height: 1.6; }
    .field { margin-bottom: 14px; }
    .label { font-size: 12px; color: #8c95a8; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { font-size: 15px; color: #ffffff; font-weight: 500; margin-top: 2px; }
    .message-box { background: #181d2a; border-left: 3px solid #e5b958; padding: 16px; border-radius: 4px; margin-top: 8px; color: #ffffff; white-space: pre-wrap; }
    .footer { padding: 16px 28px; text-align: center; font-size: 12px; color: #697285; border-top: 1px solid #232938; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>PURE BULLION — New Support Message</h2>
    </div>
    <div class="body">
      <div class="field">
        <div class="label">Full Name</div>
        <div class="value">${data.name}</div>
      </div>
      <div class="field">
        <div class="label">Email Address</div>
        <div class="value">${data.email}</div>
      </div>
      <div class="field">
        <div class="label">Phone Number</div>
        <div class="value">${data.phoneNumber || 'Not provided'}</div>
      </div>
      <div class="field">
        <div class="label">Date Received</div>
        <div class="value">${data.date}</div>
      </div>
      <div class="field">
        <div class="label">Message</div>
        <div class="message-box">${data.message}</div>
      </div>
    </div>
    <div class="footer">
      Log in to the PureBullion Admin Dashboard &gt; Support to reply and mark as resolved.
    </div>
  </div>
</body>
</html>`;
  }

  private userResolutionTemplate(data: {
    name: string;
    originalMessage: string;
    replyMessage: string;
  }): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #0c0f17; color: #f0f0f0; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #131722; border: 1px solid #232938; border-radius: 10px; overflow: hidden; }
    .header { background: #181d2a; padding: 20px 28px; border-bottom: 1px solid #232938; display: flex; justify-content: space-between; align-items: center; }
    .header h2 { color: #e5b958; margin: 0; font-size: 20px; }
    .badge { background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; }
    .body { padding: 28px; color: #d0d5e0; line-height: 1.6; }
    .reply-box { background: #181d2a; border-left: 3px solid #22c55e; padding: 16px; border-radius: 4px; margin: 16px 0; color: #ffffff; white-space: pre-wrap; }
    .original-box { background: #0e121b; padding: 14px; border-radius: 4px; margin-top: 8px; color: #8c95a8; font-size: 13px; white-space: pre-wrap; }
    .footer { padding: 16px 28px; text-align: center; font-size: 12px; color: #697285; border-top: 1px solid #232938; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>PURE BULLION SUPPORT</h2>
      <span class="badge">Resolved</span>
    </div>
    <div class="body">
      <p>Hello <strong>${data.name}</strong>,</p>
      <p>Your support inquiry has been reviewed and marked as <strong>Resolved</strong> by our team:</p>
      <div class="reply-box">${data.replyMessage}</div>
      <div style="margin-top: 24px; font-size: 12px; text-transform: uppercase; color: #8c95a8;">Your Original Message:</div>
      <div class="original-box">${data.originalMessage}</div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} PureBullion. All rights reserved.
    </div>
  </div>
</body>
</html>`;
  }
}


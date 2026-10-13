import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserSubscriptionService } from '../services/user-subscription.service';
import { SubscribeDto } from '../dto/subscribe.dto';
import { GetBillingHistoryQueryDto } from '../dto/subscription-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../auth/schemas/user.schema';

@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  @Post('subscribe')
  subscribe(@CurrentUser() user: UserDocument, @Body() dto: SubscribeDto) {
    return this.userSubscriptionService.subscribe(user._id, dto);
  }

  @Get('my-subscription')
  getMySubscription(@CurrentUser() user: UserDocument) {
    return this.userSubscriptionService.getMySubscription(user._id);
  }

  @Post('cancel')
  cancelSubscription(@CurrentUser() user: UserDocument) {
    return this.userSubscriptionService.cancelSubscription(user._id);
  }

  @Get('feature-access/:featureKey')
  checkFeatureAccess(
    @CurrentUser() user: UserDocument,
    @Param('featureKey') featureKey: string,
  ) {
    return this.userSubscriptionService.checkFeatureAccess(
      user._id,
      featureKey,
    );
  }

  // ─── Billing History & Invoices (Matching UI) ────────────────
  @Get('billing-history')
  getBillingHistory(
    @CurrentUser() user: UserDocument,
    @Query() query: GetBillingHistoryQueryDto,
  ) {
    return this.userSubscriptionService.getBillingHistory(user._id, query);
  }

  @Get('billing-history/download-all')
  async downloadAllInvoices(
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    const statement =
      await this.userSubscriptionService.getAllInvoicesStatement(user._id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="purebullion-billing-statement.html"',
    );
    return res.send(statement.html);
  }

  @Get('billing-history/:id/download')
  async downloadInvoice(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const receipt = await this.userSubscriptionService.getInvoiceReceipt(
      user._id,
      id,
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${receipt.invoiceNumber}.html"`,
    );
    return res.send(receipt.html);
  }

  @Get('billing-history/:id/receipt')
  getInvoiceReceipt(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    return this.userSubscriptionService.getInvoiceReceipt(user._id, id);
  }
}

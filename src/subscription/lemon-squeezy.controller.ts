import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Patch,
  Post,
  Get,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../auth/guards/public.guard';
import { SubscriptionService } from './subscription.service';
import { RequestWithUser } from '../common/@types/nest.types';
import { TopUpPlans } from './subscription.const';
// import { AuthGuard } from '@nestjs/passport';

@Controller('lemon')
export class LemonSqueezyController {
  constructor(private subService: SubscriptionService) {}

  @Post('/updates')
  @HttpCode(200)
  @Public()
  async webhookHandler(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string,
    @Body() data: any,
  ) {
    await this.subService.handleLemonSqueezyWebhookEvent(
      data,
      signature,
      req.rawBody,
    );
  }

  @Patch('/cancel-subscription')
  @HttpCode(200)
  async cancelSubscription(@Req() req: RequestWithUser) {
    const res = await this.subService.cancelSubscription(req.user.email);
    return res;
  }

  @Get('/payment-method-info')
  @HttpCode(200)
  async getPaymentMethodInfo(@Req() req: RequestWithUser) {
    return this.subService.getPaymentMethodInfo(req.user.email);
  }

  @Patch('/change-subscription')
  @HttpCode(200)
  async changeSubscription(
    @Req() req: RequestWithUser,
    @Body() body: { newVariantId: string },
  ) {
    const { newVariantId } = body;
    const res = await this.subService.changeSubscriptionPlan(
      req.user.email,
      Number(newVariantId),
    );
    return res;
  }

  @Post('/create-topup-checkout')
  @HttpCode(200)
  async createTopUpCheckout(
    @Req() req: RequestWithUser,
    @Body()
    body: {
      amount: string;
      plan: TopUpPlans;
    },
  ) {
    const { amount, plan } = body;
    const checkoutUrl = await this.subService.createTopUpCheckout(
      amount,
      req.user.email,
      plan,
    );
    return { checkoutUrl };
  }

  // Invoice Show in Profile by Nisha Bharti
  @Get('/my-invoices')
  @HttpCode(200)
  async getMyInvoices(
    @Req() req: RequestWithUser,
    @Query('viewAll') viewAll?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('year') year?: string,
  ) {
    const userId = req.user._id.toString();

    // Convert query params safely
    const isViewAll = viewAll === 'true';
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 5;

    const yearNumber = year ? parseInt(year, 10) : undefined;

    return this.subService.getInvoicesByUser(
      userId,
      isViewAll,
      pageNumber,
      limitNumber,
      yearNumber,
    );
  }
}

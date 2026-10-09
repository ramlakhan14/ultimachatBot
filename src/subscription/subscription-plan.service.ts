import { Injectable } from '@nestjs/common';
import { Subscription } from '../user/user.schema';
import { subscriptionPlanData } from './subscription.const';

@Injectable()
export class SubscriptionPlanInfoService {
  getSubscriptionPlanInfo(plan: Subscription) {
    return subscriptionPlanData[plan];
  }
}

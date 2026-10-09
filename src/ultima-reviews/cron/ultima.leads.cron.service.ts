import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UltimaReviewsService } from '../ultima-reviews.service';

@Injectable()
export class UltimaLeadsCronService {
  private readonly logger = new Logger(UltimaLeadsCronService.name);
  constructor(private ultimaReviewsService: UltimaReviewsService) {}

  // @Cron(CronExpression.EVERY_MINUTE)
  async startMailtoLeads() {
    this.logger.log('Start creating ultima reviews leads...');
    // this.ultimaReviewsService.startCreatingCustomer();
  }
}

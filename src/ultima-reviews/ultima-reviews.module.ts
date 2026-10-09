import { Module } from '@nestjs/common';
import { UltimaReviewsService } from './ultima-reviews.service';
import { UltimaReviewsController } from './ultima-reviews.controller';
import { MongoModule } from '../common/mongo/mongo.module';
import { UltimaLeadsApiService } from './ultima.leads.api.service';
import { UltimaLeadsCronService } from './cron/ultima.leads.cron.service';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [MongoModule, ProjectModule],
  controllers: [UltimaReviewsController],
  providers: [
    UltimaReviewsService,
    UltimaLeadsApiService,
    UltimaLeadsCronService,
  ],
})
export class UltimaReviewsModule {}

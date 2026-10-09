import { Inject, Injectable } from '@nestjs/common';
import { Db } from 'mongodb';
import { MONGODB } from '../../common/mongo/mongo.module';

@Injectable()
export class DashboardService {
  constructor(@Inject(MONGODB) private db: Db) {}

  async getDashboardData() {
    return await this.db.collection('voicebot').find().toArray();
  }
}

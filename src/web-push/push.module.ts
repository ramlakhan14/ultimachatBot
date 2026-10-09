// web-push.module.ts
import { Module } from '@nestjs/common';
import { NotificationService } from './push.service';
import { NotificationController } from './push.controller';
import { FirebaseAdminProvider } from './firebase-admin.provider';
import { MongoModule } from '../common/mongo/mongo.module';

@Module({
  imports: [
    MongoModule, // Import MongoModule to ensure MONGODB provider is available
  ],
  providers: [
    FirebaseAdminProvider, // Register the Firebase Admin provider
    NotificationService,
  ],
  controllers: [NotificationController],
  exports: [NotificationService], // Export the service if you need to use it in other modules
})
export class NotificationModule {}

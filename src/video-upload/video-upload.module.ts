import { Module } from '@nestjs/common';
import { MongoModule } from '../common/mongo/mongo.module';
import { KnowledgebaseModule } from '../knowledgebase/knowledgebase.module';
import { ImportersModule } from '../importers/importers.module';
import { VideoUploadService } from './video-upload.service';
import { VideoUploadController } from './video-upload.controller';

@Module({
  imports: [MongoModule, KnowledgebaseModule, ImportersModule],
  controllers: [VideoUploadController],
  providers: [VideoUploadService],
  exports: [VideoUploadService],
})
export class VideoUploadModule {}

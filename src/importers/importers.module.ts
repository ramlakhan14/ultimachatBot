import { Module } from '@nestjs/common';
import { CeleryClientModule } from '../common/celery/celery-client.module';
import { KnowledgebaseModule } from '../knowledgebase/knowledgebase.module';
import { CrawlerService } from './crawler/crawler.service';
import { ImportersController } from './importers.controller';
import { PdfImporterService } from './pdf/pdf-importer.service';
import { TextractImporterService } from './textract/textract-importer.service';
import { VideoImporterService } from './video/video-importer.service';
import { InscriptisImporterService } from './inscriptis/inscriptis-importer.service';
import { OpenaiModule } from '../openai/openai.module';
import { GeminiModule } from '../common/gemini/gemini.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [
    CeleryClientModule,
    KnowledgebaseModule,
    OpenaiModule,
    GeminiModule,
    RedisModule,
  ],
  controllers: [ImportersController],
  providers: [
    CrawlerService,
    PdfImporterService,
    TextractImporterService,
    VideoImporterService,
    InscriptisImporterService,
  ],
  exports: [CrawlerService, VideoImporterService],
})
export class ImportersModule {}

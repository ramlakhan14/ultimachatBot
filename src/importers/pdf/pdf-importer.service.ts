import { Inject, Injectable, Logger } from '@nestjs/common';
import { readFile, unlink } from 'fs/promises';
import { ObjectId } from 'mongodb';
import { resolve } from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import {
  CELERY_CLIENT,
  CeleryClientQueue,
  CeleryClientService,
} from '../../common/celery/celery-client.module';
import { DataStoreService } from '../../knowledgebase/datastore.service';
import { KnowledgebaseDbService } from '../../knowledgebase/knowledgebase-db.service';
import { checkUserIsOwnerOfKb } from '../../knowledgebase/knowledgebase-utils';
import { UserSparse } from '../../user/user.schema';

const MAX_PDF_PAGES = 50;

@Injectable()
export class PdfImporterService {
  private readonly logger = new Logger('PdfImporterService');
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly kbDbService: KnowledgebaseDbService,
    private readonly datastoreService: DataStoreService,
    @Inject(CELERY_CLIENT) private celeryClient: CeleryClientService,
  ) {
    this.bucket = process.env.VIDEO_UPLOAD_S3_BUCKET || '';
    const region = process.env.VIDEO_UPLOAD_S3_REGION || 'auto';
    const endpoint = process.env.VIDEO_UPLOAD_S3_ENDPOINT;
    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.VIDEO_UPLOAD_S3_ACCESS_KEY || '',
        secretAccessKey: process.env.VIDEO_UPLOAD_S3_SECRET_KEY || '',
      },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      requestHandler: new NodeHttpHandler({ requestTimeout: 0 }),
    });
  }

  private async uploadToR2(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
  }

  private async addPdfToDataStoreTask(
    knowledgebaseId: string,
    pdfPath: string,
    filename: string,
    storageKey: string,
  ) {
    try {
      const client = this.celeryClient.get(CeleryClientQueue.DEFAULT);
      const task = client.createTask('worker.extract_pdf_text');

      const datastoreId = await task
        .applyAsync([knowledgebaseId, pdfPath, MAX_PDF_PAGES, filename])
        .get();

      if (!datastoreId || !ObjectId.isValid(datastoreId)) {
        throw new Error('Failed to get the data from pdf');
      }

      let dsItem = null;
      let retries = 5;

      while (retries > 0) {
        dsItem = await this.kbDbService.getKbDataStoreItemById(
          new ObjectId(datastoreId),
        );
        if (dsItem) break;
        await new Promise((res) => setTimeout(res, 1000));
        retries--;
      }

      if (!dsItem) {
        throw new Error(
          'Your PDF is taking longer than expected to process. Please try again shortly.',
        );
      }

      const publicUrl = `${process.env.API_BASE_URL}/knowledgebase/importers/file/${datastoreId}`;

      // Patch the doc with title, R2 key, MIME type, and public URL in one update
      await this.kbDbService.updateKbDataStoreItem(new ObjectId(datastoreId), {
        title: filename,
        storageKey,
        mimeType: 'application/pdf',
        url: publicUrl,
      });

      // Fire-and-forget embedding generation
      this.datastoreService
        .generateChunksAndEmbeddingsForDataStoreItem(dsItem)
        .catch((err) => this.logger.error('Embedding error:', err.message));

      return { _id: new ObjectId(datastoreId), url: publicUrl };
    } catch (error) {
      throw error;
    }
  }

  async addPdfToDataStore(
    user: UserSparse,
    knowledgebaseId: string,
    file: Express.Multer.File,
  ) {
    try {
      const kbId = new ObjectId(knowledgebaseId);

      const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
      checkUserIsOwnerOfKb(user, kb);

      const absPath = resolve(file.path);

      // Upload raw PDF to R2 before sending to Celery so the file is always
      // persisted even if extraction fails later.
      const storageKey = [
        'documents',
        knowledgebaseId,
        `${Date.now()}-${file.originalname}`,
      ].join('/');
      const buffer = await readFile(absPath);
      await this.uploadToR2(storageKey, buffer, 'application/pdf');
      this.logger.log(`Uploaded ${file.originalname} to R2: ${storageKey}`);

      const result = await this.addPdfToDataStoreTask(
        knowledgebaseId,
        absPath,
        file.originalname,
        storageKey,
      );

      // Delete the local temp file after processing
      await unlink(absPath).catch(() => {});

      return {
        ...result,
        storageKey,
        message: 'PDF uploaded successfully',
      };
    } catch (error) {
      throw error;
    }
  }
}

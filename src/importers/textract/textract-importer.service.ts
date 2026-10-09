import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { ObjectId } from 'mongodb';
import { extname } from 'node:path';
import { KnowledgebaseDbService } from '../../knowledgebase/knowledgebase-db.service';
import { checkUserIsOwnerOfKb } from '../../knowledgebase/knowledgebase-utils';
import {
  DataStoreStatus,
  DataStoreType,
} from '../../knowledgebase/knowledgebase.schema';
import { UserSparse } from '../../user/user.schema';
import * as mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import { DataStoreService } from '../../knowledgebase/datastore.service';
import { OpenaiService } from '../../openai/openai.service';
import { Role } from '../../auth/types/role.enum';

// Files larger than this are stored in R2 rather than in MongoDB to stay
// well under MongoDB's 16 MB BSON document limit.
const MONGO_BUFFER_LIMIT = 8 * 1024 * 1024; // 8 MB

@Injectable()
export class TextractImporterService {
  private readonly logger = new Logger('TextractImporterService');
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly kbDbService: KnowledgebaseDbService,
    private readonly datastoreService: DataStoreService,
    private readonly openaiService: OpenaiService,
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

  async downloadFromR2(key: string): Promise<Buffer> {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  private async extractContentByType(
    file: Express.Multer.File,
    ext: string,
    userId: string,
  ): Promise<string> {
    switch (ext) {
      case 'pdf':
        return this.extractPdf(file);
      case 'docx':
        return this.extractDocx(file);
      case 'html':
        return this.extractHtml(file);
      case 'csv':
        return this.extractCsv(file);
      case 'jpg':
      case 'jpeg':
      case 'png':
        // OpenAI Vision rejects request bodies larger than ~20 MB.
        // The raw file is always stored in R2, but OCR is skipped for large
        // images so we don't hit the OpenAI body size limit.
        if (file.buffer.length > 19 * 1024 * 1024) {
          return '';
        }
        return this.openaiService.extractTextFromImage(
          file,
          [],
          new ObjectId(userId),
        );
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  private async extractPdf(file: Express.Multer.File): Promise<string> {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: file.buffer });
    const data = await parser.getText();
    return data.text || '';
  }

  private async extractDocx(file: Express.Multer.File): Promise<string> {
    const res = await mammoth.extractRawText({ buffer: file.buffer });
    return res.value || '';
  }

  private async extractHtml(file: Express.Multer.File): Promise<string> {
    const html = file.buffer.toString('utf8');
    const $ = cheerio.load(html);
    return $('body').text().replace(/\s+/g, ' ').trim();
  }

  private extractCsv(file: Express.Multer.File): string {
    return file.buffer.toString('utf-8');
  }

  private mapExtToDataStoreType(ext: string): DataStoreType {
    switch (ext) {
      case 'pdf':
        return DataStoreType.PDF;
      case 'docx':
        return DataStoreType.DOCX;
      case 'html':
        return DataStoreType.HTML;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return DataStoreType.IMAGE;
      case 'csv':
        return DataStoreType.CSV;
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  // Add file to data store
  async addFileToDataStore(
    user: UserSparse,
    knowledgebaseId: string,
    file: Express.Multer.File,
  ) {
    try {
      const kbId = new ObjectId(knowledgebaseId);

      const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
      checkUserIsOwnerOfKb(user, kb);

      // Step 1: detect file type WITHOUT processing the file
      const ext = extname(file.originalname).replace('.', '').toLowerCase();
      const fileType = this.mapExtToDataStoreType(ext);

      // Step 2: check existing documents by type before extraction
      // const existing = await this.kbDbService
      //   .getKbDataStoreItemsForKnowledgebase(kbId)
      //   .toArray();

      // const isExistingSameType = existing.find(
      //   (item) => item.type === fileType,
      // );

      // if (isExistingSameType) {
      //   throw new BadRequestException(
      //     'A document of the same type already exists in the knowledgebase.',
      //   );
      // }

      // Step 3: Now extract content (heavy work)
      const rawContent = await this.extractContentByType(
        file,
        ext,
        user._id.toHexString(),
      );

      // Cap content at 8 MB so the MongoDB document never approaches the 16 MB
      // BSON limit regardless of how much text was extracted.
      const CONTENT_LIMIT = MONGO_BUFFER_LIMIT;
      const content =
        Buffer.byteLength(rawContent, 'utf8') > CONTENT_LIMIT
          ? rawContent.slice(0, CONTENT_LIMIT)
          : rawContent;

      // Step 4: Always upload the raw file to R2 — fileBuffer is never stored
      // in MongoDB. This keeps documents small and lets files of any size
      // (up to the 50 MB endpoint limit) work without hitting the BSON limit.
      const storageKey = [
        'documents',
        knowledgebaseId,
        `${Date.now()}-${file.originalname}`,
      ].join('/');
      await this.uploadToR2(storageKey, file.buffer, file.mimetype);
      this.logger.log(`Uploaded ${file.originalname} to R2: ${storageKey}`);

      const ts = new Date();
      const res = await this.kbDbService.insertToKbDataStore({
        knowledgebaseId: kbId,
        content,
        status: DataStoreStatus.CREATED,
        type: fileType,
        url: '',
        title: file.originalname,
        fileBuffer: null,
        mimeType: file.mimetype,
        storageKey,
        createdAt: ts,
        updatedAt: ts,
      });

      // CREATE PUBLIC URL
      const publicUrl = `${process.env.API_BASE_URL}/knowledgebase/importers/file/${res._id}`;

      // UPDATE URL
      try {
        await this.kbDbService.updateDataStoreUrl(res._id, publicUrl);
      } catch (err) {
        this.logger.error('URL update failed:', err.message);
      }

      // Fire-and-forget: don't await so the HTTP response returns immediately.
      // Large files can take minutes to chunk and embed — blocking the request
      // causes timeouts and retries that waste slots without helping the user.
      this.datastoreService
        .generateChunksAndEmbeddingsForDataStoreItem(res)
        .catch((err) => this.logger.error('Embedding error:', err.message));

      return {
        ...res,
        url: publicUrl,
        message: `${fileType} uploaded successfully`,
      };
      // return { res, message: `${fileType} uploaded successfully` };
    } catch (error) {
      throw error;
    }
  }

  // Get documents for knowledgebase
  async getDocumentsForKnowledgebase(
    user: UserSparse,
    knowledgebaseId: string,
  ) {
    try {
      const kbId = new ObjectId(knowledgebaseId);
      const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
      if (user.role != Role.Admin) {
        checkUserIsOwnerOfKb(user, kb);
      }
      const fileType = [
        DataStoreType.DOCX,
        DataStoreType.PPTX,
        DataStoreType.HTML,
        DataStoreType.PDF,
        DataStoreType.TEXT,
        DataStoreType.DOCUMENT,
        DataStoreType.IMAGE,
        DataStoreType.CSV,
        DataStoreType.VIDEO,
      ];

      const documents = await this.kbDbService.getDocumentsOfKnowledgebase(
        kbId,
        fileType,
      );

      return documents;
    } catch (error) {
      throw error;
    }
  }

  async getFileById(id: string) {
    const file = await this.kbDbService.getDataStoreItemById(new ObjectId(id));

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Large files are stored in R2 — fetch the buffer on demand rather than
    // keeping it in MongoDB. Small files already carry fileBuffer in-document.
    if (!file.fileBuffer && file.storageKey) {
      const buffer = await this.downloadFromR2(file.storageKey);
      return { ...file, fileBuffer: buffer };
    }

    return file;
  }
}

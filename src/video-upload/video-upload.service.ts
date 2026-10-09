import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  S3Client,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  UploadPartCommand,
  GetObjectCommand,
  ListPartsCommand,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Db, ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';
import { MONGODB } from '../common/mongo/mongo.module';
import {
  VIDEO_UPLOAD_COLLECTION,
  VideoUploadDoc,
  VideoUploadPart,
} from './video-upload.schema';
import { KnowledgebaseDbService } from '../knowledgebase/knowledgebase-db.service';
import { VideoImporterService } from '../importers/video/video-importer.service';

const CHUNK_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const PRESIGNED_URL_EXPIRES_SECONDS = 3600; // 1 hour per part
const UPLOAD_DOC_TTL_HOURS = 48;

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/mpeg',
  'video/x-matroska',
  'video/3gpp',
]);

@Injectable()
export class VideoUploadService implements OnModuleInit {
  private readonly logger = new Logger(VideoUploadService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @Inject(MONGODB) private readonly db: Db,
    private readonly kbDbService: KnowledgebaseDbService,
    private readonly videoImporterService: VideoImporterService,
  ) {
    const region = process.env.VIDEO_UPLOAD_S3_REGION || 'us-east-1';
    const endpoint = process.env.VIDEO_UPLOAD_S3_ENDPOINT;

    this.bucket = process.env.VIDEO_UPLOAD_S3_BUCKET || '';

    // requestTimeout 0 = no timeout — required for streaming 2 GB objects out of R2.
    // The default AWS SDK socket idle timeout would drop a slow large download mid-stream.
    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.VIDEO_UPLOAD_S3_ACCESS_KEY || '',
        secretAccessKey: process.env.VIDEO_UPLOAD_S3_SECRET_KEY || '',
      },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      requestHandler: new NodeHttpHandler({
        requestTimeout: 0,
        socketAcquisitionWarningTimeout: 0,
      }),
    });
  }

  async onModuleInit() {
    const col = this.db.collection<VideoUploadDoc>(VIDEO_UPLOAD_COLLECTION);
    await Promise.all([
      col.createIndex({ userId: 1, createdAt: -1 }),
      col.createIndex({ status: 1 }),
      col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
  }

  async initiateUpload(params: {
    userId: string;
    knowledgebaseId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }): Promise<{
    uploadId: string;
    parts: { partNumber: number; presignedUrl: string }[];
    chunkSize: number;
    totalParts: number;
  }> {
    const { userId, knowledgebaseId, fileName, fileSize, mimeType } = params;

    const kb = await this.kbDbService.getKnowledgebaseSparseById(
      new ObjectId(knowledgebaseId),
    );
    if (!kb) {
      throw new HttpException('Invalid Knowledgebase Id', HttpStatus.NOT_FOUND);
    }
    if (!kb.owner || kb.owner.toString() !== userId) {
      throw new HttpException('Unauthorised', HttpStatus.UNAUTHORIZED);
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new HttpException(
        'Invalid file type. Supported: mp4, mov, webm, avi, mkv, mpeg, 3gp',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES) {
      throw new HttpException(
        'File size must be between 1 byte and 2 GB',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!this.bucket) {
      throw new HttpException(
        'Video upload storage is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const ext = fileName.includes('.')
      ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
      : '';
    const s3Key = `videos/${userId}/${knowledgebaseId}/${randomUUID()}${ext}`;

    const createCmd = new CreateMultipartUploadCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: mimeType,
      Metadata: {
        userId,
        knowledgebaseId,
        originalName: encodeURIComponent(fileName),
      },
    });

    const { UploadId: s3UploadId } = await this.s3.send(createCmd);
    if (!s3UploadId) {
      throw new HttpException(
        'Failed to initiate S3 multipart upload',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const totalParts = Math.ceil(fileSize / CHUNK_SIZE_BYTES);

    const presignedParts = await Promise.all(
      Array.from({ length: totalParts }, async (_, i) => {
        const partNumber = i + 1;
        const url = await getSignedUrl(
          this.s3,
          new UploadPartCommand({
            Bucket: this.bucket,
            Key: s3Key,
            UploadId: s3UploadId,
            PartNumber: partNumber,
          }),
          { expiresIn: PRESIGNED_URL_EXPIRES_SECONDS },
        );
        return { partNumber, presignedUrl: url };
      }),
    );

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + UPLOAD_DOC_TTL_HOURS * 60 * 60 * 1000,
    );

    const doc: VideoUploadDoc = {
      userId,
      knowledgebaseId,
      s3UploadId,
      s3Key,
      fileName,
      fileSize,
      mimeType,
      totalParts,
      parts: Array.from({ length: totalParts }, (_, i) => ({
        partNumber: i + 1,
        etag: null,
      })),
      status: 'initiated',
      s3Bucket: this.bucket,
      s3Region: process.env.VIDEO_UPLOAD_S3_REGION || 'us-east-1',
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    const result = await this.db
      .collection<VideoUploadDoc>(VIDEO_UPLOAD_COLLECTION)
      .insertOne(doc);

    return {
      uploadId: result.insertedId.toString(),
      parts: presignedParts,
      chunkSize: CHUNK_SIZE_BYTES,
      totalParts,
    };
  }

  async completeUpload(params: {
    userId: string;
    uploadId: string;
    parts: { partNumber: number; etag: string }[];
  }): Promise<{ s3Key: string; message: string }> {
    const { userId, uploadId, parts } = params;

    const doc = await this.getUploadDoc(uploadId, userId);

    if (doc.status === 'completed') {
      throw new HttpException(
        'Upload already completed',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (doc.status === 'aborted' || doc.status === 'failed') {
      throw new HttpException(
        `Upload cannot be completed — status is ${doc.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (parts.length !== doc.totalParts) {
      throw new HttpException(
        `Expected ${doc.totalParts} parts but received ${parts.length}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const sortedParts = [...parts].sort((a, b) => a.partNumber - b.partNumber);

    await this.db.collection<VideoUploadDoc>(VIDEO_UPLOAD_COLLECTION).updateOne(
      { _id: doc._id },
      {
        $set: {
          status: 'completing',
          parts: sortedParts.map((p) => ({
            partNumber: p.partNumber,
            etag: p.etag,
          })),
          updatedAt: new Date(),
        },
      },
    );

    try {
      await this.s3.send(
        new CompleteMultipartUploadCommand({
          Bucket: doc.s3Bucket,
          Key: doc.s3Key,
          UploadId: doc.s3UploadId,
          MultipartUpload: {
            Parts: sortedParts.map((p) => ({
              PartNumber: p.partNumber,
              ETag: p.etag,
            })),
          },
        }),
      );
    } catch (err) {
      await this.db
        .collection<VideoUploadDoc>(VIDEO_UPLOAD_COLLECTION)
        .updateOne(
          { _id: doc._id },
          {
            $set: {
              status: 'failed',
              errorMessage: err.message,
              updatedAt: new Date(),
            },
          },
        );
      throw new HttpException(
        'Failed to complete S3 multipart upload',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.db
      .collection<VideoUploadDoc>(VIDEO_UPLOAD_COLLECTION)
      .updateOne(
        { _id: doc._id },
        { $set: { status: 'completed', updatedAt: new Date() } },
      );

    // Background — intentionally not awaited. The uploaded video now needs to
    // be downloaded from R2, run through Gemini, and added to the
    // knowledgebase. Poll GET /video-upload/status/:uploadId for the jobId
    // once it appears, then switch to the existing SSE progress endpoint.
    this.triggerProcessing(doc).catch((err) => {
      this.logger.error(
        `Failed to trigger processing for upload ${doc._id}: ${err.message}`,
      );
    });

    return {
      s3Key: doc.s3Key,
      message: 'Upload completed successfully',
    };
  }

  /**
   * Downloads the now-complete R2 object to a local temp file and hands it
   * off to the existing Gemini/knowledgebase pipeline, then records the
   * resulting jobId on the upload doc so the frontend can track it via
   * GET /video-upload/status/:uploadId.
   */
  private async triggerProcessing(
    doc: VideoUploadDoc & { _id: ObjectId },
  ): Promise<void> {
    // Stream R2 → Gemini directly. Each call to getStream() issues a fresh
    // GetObjectCommand so withRetry in GeminiService can re-read on failure.
    const getStream = async () => {
      const { Body } = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: doc.s3Key }),
      );
      return Body as NodeJS.ReadableStream;
    };

    const { jobId } = await this.videoImporterService.startProcessingFromStream(
      doc.knowledgebaseId,
      getStream,
      doc.fileSize,
      doc.mimeType,
      doc.fileName,
    );

    await this.db
      .collection<VideoUploadDoc>(VIDEO_UPLOAD_COLLECTION)
      .updateOne({ _id: doc._id }, { $set: { jobId, updatedAt: new Date() } });
  }

  async abortUpload(params: {
    userId: string;
    uploadId: string;
  }): Promise<{ message: string }> {
    const { userId, uploadId } = params;

    const doc = await this.getUploadDoc(uploadId, userId);

    if (doc.status === 'completed') {
      throw new HttpException(
        'Cannot abort a completed upload',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (doc.status !== 'aborted') {
      try {
        await this.s3.send(
          new AbortMultipartUploadCommand({
            Bucket: doc.s3Bucket,
            Key: doc.s3Key,
            UploadId: doc.s3UploadId,
          }),
        );
      } catch (err) {
        this.logger.warn(
          `S3 abort failed for upload ${uploadId}: ${err.message}`,
        );
      }

      await this.db
        .collection<VideoUploadDoc>(VIDEO_UPLOAD_COLLECTION)
        .updateOne(
          { _id: doc._id },
          { $set: { status: 'aborted', updatedAt: new Date() } },
        );
    }

    return { message: 'Upload aborted' };
  }

  async getUploadStatus(params: { userId: string; uploadId: string }): Promise<{
    uploadId: string;
    status: string;
    fileName: string;
    fileSize: number;
    totalParts: number;
    completedParts: number[];
    uploadedParts: { partNumber: number; etag: string; size: number }[];
    s3Key?: string;
    jobId?: string;
    createdAt: Date;
  }> {
    const { userId, uploadId } = params;
    const doc = await this.getUploadDoc(uploadId, userId);

    // Ask R2 directly which parts are actually stored for this multipart
    // upload — this is the real, server-verifiable state, independent of
    // whether the client (or this doc) ever recorded a /complete call. This
    // is what makes resume possible even if the client lost all local state:
    // it can rebuild its next /complete request purely from this response.
    const uploadedParts = await this.listRealUploadedParts(doc);

    const completedParts =
      doc.status === 'initiated' || doc.status === 'completing'
        ? uploadedParts.map((p) => p.partNumber)
        : doc.parts.filter((p) => p.etag !== null).map((p) => p.partNumber);

    return {
      uploadId: doc._id.toString(),
      status: doc.status,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      totalParts: doc.totalParts,
      completedParts,
      uploadedParts,
      s3Key: doc.status === 'completed' ? doc.s3Key : undefined,
      jobId: doc.jobId,
      createdAt: doc.createdAt,
    };
  }

  /**
   * Queries R2 for the parts genuinely stored against this multipart upload
   * right now. Returns [] (rather than throwing) for uploads that are
   * already completed/aborted or where the S3-side upload session no longer
   * exists, so a stale/finished doc doesn't turn a status check into an
   * error.
   */
  private async listRealUploadedParts(
    doc: VideoUploadDoc,
  ): Promise<{ partNumber: number; etag: string; size: number }[]> {
    if (doc.status !== 'initiated' && doc.status !== 'completing') {
      return [];
    }

    try {
      const parts: { partNumber: number; etag: string; size: number }[] = [];
      let partNumberMarker: string | undefined;
      let isTruncated = true;

      while (isTruncated) {
        const res = await this.s3.send(
          new ListPartsCommand({
            Bucket: doc.s3Bucket,
            Key: doc.s3Key,
            UploadId: doc.s3UploadId,
            PartNumberMarker: partNumberMarker,
          }),
        );

        for (const p of res.Parts ?? []) {
          parts.push({
            partNumber: p.PartNumber,
            etag: p.ETag,
            size: p.Size,
          });
        }

        isTruncated = Boolean(res.IsTruncated);
        partNumberMarker = res.NextPartNumberMarker;
      }

      return parts.sort((a, b) => a.partNumber - b.partNumber);
    } catch (err) {
      this.logger.warn(
        `ListParts failed for upload ${doc._id}: ${err.message}`,
      );
      return [];
    }
  }

  async refreshPresignedUrls(params: {
    userId: string;
    uploadId: string;
    partNumbers: number[];
  }): Promise<{ parts: { partNumber: number; presignedUrl: string }[] }> {
    const { userId, uploadId, partNumbers } = params;
    const doc = await this.getUploadDoc(uploadId, userId);

    if (doc.status === 'completed' || doc.status === 'aborted') {
      throw new HttpException(
        `Cannot refresh URLs for upload with status ${doc.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const parts = await Promise.all(
      partNumbers.map(async (partNumber) => {
        if (partNumber < 1 || partNumber > doc.totalParts) {
          throw new HttpException(
            `Part number ${partNumber} is out of range (1–${doc.totalParts})`,
            HttpStatus.BAD_REQUEST,
          );
        }
        const url = await getSignedUrl(
          this.s3,
          new UploadPartCommand({
            Bucket: doc.s3Bucket,
            Key: doc.s3Key,
            UploadId: doc.s3UploadId,
            PartNumber: partNumber,
          }),
          { expiresIn: PRESIGNED_URL_EXPIRES_SECONDS },
        );
        return { partNumber, presignedUrl: url };
      }),
    );

    return { parts };
  }

  private async getUploadDoc(
    uploadId: string,
    userId: string,
  ): Promise<VideoUploadDoc & { _id: ObjectId }> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(uploadId);
    } catch {
      throw new HttpException('Invalid upload ID', HttpStatus.BAD_REQUEST);
    }

    const doc = await this.db
      .collection<VideoUploadDoc>(VIDEO_UPLOAD_COLLECTION)
      .findOne({ _id: objectId });

    if (!doc) {
      throw new HttpException('Upload not found', HttpStatus.NOT_FOUND);
    }

    if (doc.userId !== userId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return doc as VideoUploadDoc & { _id: ObjectId };
  }
}

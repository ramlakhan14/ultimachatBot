import { Inject, Injectable, Logger } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { ObjectId } from 'mongodb';
import { resolve } from 'node:path';
import { randomUUID } from 'crypto';
import { StreamFactory } from '../../common/gemini/gemini.service';
import { Observable, Subject, EMPTY, of } from 'rxjs';
import { Redis } from 'ioredis';
import { GeminiService } from '../../common/gemini/gemini.service';
import { DataStoreService } from '../../knowledgebase/datastore.service';
import { KnowledgebaseDbService } from '../../knowledgebase/knowledgebase-db.service';
import { checkUserIsOwnerOfKb } from '../../knowledgebase/knowledgebase-utils';
import {
  DataStoreStatus,
  DataStoreType,
} from '../../knowledgebase/knowledgebase.schema';
import { UserSparse } from '../../user/user.schema';
import { Role } from '../../auth/types/role.enum';
import { REDIS } from '../../common/redis/redis.module';

export interface VideoProgressEvent {
  stage: string;
  progress: number;
  message: string;
  data?: Record<string, any>;
  error?: string;
}

interface RedisJobState {
  status: 'running' | 'complete' | 'error';
  lastEvent: VideoProgressEvent | null;
}

const JOB_TTL_S = 30 * 60; // 30 minutes in seconds
const JOB_CHANNEL = (id: string) => `video-job-events:${id}`;
const JOB_STATE_KEY = (id: string) => `video-job:${id}`;

@Injectable()
export class VideoImporterService {
  private readonly logger = new Logger(VideoImporterService.name);

  private readonly localSubjects = new Map<
    string,
    Subject<VideoProgressEvent>
  >();

  constructor(
    private readonly kbDbService: KnowledgebaseDbService,
    private readonly datastoreService: DataStoreService,
    private readonly geminiService: GeminiService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /**
   * Sets up Redis-backed job state + a local Subject so progress can be
   * streamed via SSE (same-container or cross-container), and returns an
   * emit() closure that keeps both in sync. Shared by every entry point that
   * kicks off video processing, regardless of where the source file came from.
   */
  private async createJob(): Promise<{
    jobId: string;
    subject: Subject<VideoProgressEvent>;
    emit: (e: VideoProgressEvent) => void;
  }> {
    const jobId = randomUUID();
    const subject = new Subject<VideoProgressEvent>();
    this.localSubjects.set(jobId, subject);

    const initialState: RedisJobState = { status: 'running', lastEvent: null };
    await this.redis.set(
      JOB_STATE_KEY(jobId),
      JSON.stringify(initialState),
      'EX',
      JOB_TTL_S,
    );

    const emit = (event: VideoProgressEvent) => {
      const newStatus: RedisJobState['status'] =
        event.stage === 'complete'
          ? 'complete'
          : event.stage === 'error'
          ? 'error'
          : 'running';

      const state: RedisJobState = { status: newStatus, lastEvent: event };
      this.redis
        .set(JOB_STATE_KEY(jobId), JSON.stringify(state), 'EX', JOB_TTL_S)
        .catch((err) =>
          this.logger.warn(
            `Redis state update failed for job ${jobId}: ${err.message}`,
          ),
        );

      this.redis
        .publish(JOB_CHANNEL(jobId), JSON.stringify(event))
        .catch((err) =>
          this.logger.warn(
            `Redis publish failed for job ${jobId}: ${err.message}`,
          ),
        );
      subject.next(event);
    };

    // Auto-cleanup local subject after TTL
    setTimeout(() => this.localSubjects.delete(jobId), JOB_TTL_S * 1000);

    return { jobId, subject, emit };
  }

  /**
   * Validates ownership, creates a job in Redis, kicks off background processing,
   * and returns the jobId immediately so the caller can stream progress via SSE.
   */
  async startVideoProcessingJob(
    user: UserSparse,
    knowledgebaseId: string,
    file: Express.Multer.File,
  ): Promise<{ jobId: string }> {
    const kbId = new ObjectId(knowledgebaseId);
    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    checkUserIsOwnerOfKb(user, kb);

    const { jobId, subject, emit } = await this.createJob();

    // Background — intentionally not awaited
    this.processVideoContent(
      jobId,
      kbId,
      file.path,
      file.mimetype,
      file.originalname,
      subject,
      emit,
    ).catch((err) => {
      this.logger.error(`Unhandled error in job ${jobId}: ${err.message}`);
    });

    return { jobId };
  }

  /**
   * Same processing pipeline as startVideoProcessingJob, but for a video that
   * already landed on local disk from somewhere else (e.g. downloaded from
   * R2 after a resumable multipart upload completed). Caller is responsible
   * for having already verified the caller owns/can access the knowledgebase.
   */
  async startProcessingFromLocalFile(
    knowledgebaseId: string,
    filePath: string,
    mimetype: string,
    originalname: string,
  ): Promise<{ jobId: string }> {
    const kbId = new ObjectId(knowledgebaseId);
    const { jobId, subject, emit } = await this.createJob();

    // Background — intentionally not awaited
    this.processVideoContent(
      jobId,
      kbId,
      filePath,
      mimetype,
      originalname,
      subject,
      emit,
    ).catch((err) => {
      this.logger.error(`Unhandled error in job ${jobId}: ${err.message}`);
    });

    return { jobId };
  }

  /**
   * Same processing pipeline as startProcessingFromLocalFile, but the source
   * bytes come from a StreamFactory instead of a local file. Used by the
   * multipart upload path so R2 streams directly to Gemini — no /tmp download.
   */
  async startProcessingFromStream(
    knowledgebaseId: string,
    getStream: StreamFactory,
    fileSize: number,
    mimetype: string,
    originalname: string,
  ): Promise<{ jobId: string }> {
    const kbId = new ObjectId(knowledgebaseId);
    const { jobId, subject, emit } = await this.createJob();

    // Background — intentionally not awaited
    this.processVideoContentFromStream(
      jobId,
      kbId,
      getStream,
      fileSize,
      mimetype,
      originalname,
      subject,
      emit,
    ).catch((err) => {
      this.logger.error(`Unhandled error in job ${jobId}: ${err.message}`);
    });

    return { jobId };
  }

  async streamJobProgress(
    jobId: string,
  ): Promise<Observable<VideoProgressEvent> | null> {
    const raw = await this.redis.get(JOB_STATE_KEY(jobId));
    if (!raw) return null;

    const state: RedisJobState = JSON.parse(raw);

    // Job already finished — emit the final event once and complete
    if (state.status === 'complete' || state.status === 'error') {
      return state.lastEvent ? of(state.lastEvent) : EMPTY;
    }

    return new Observable<VideoProgressEvent>((subscriber) => {
      // Replay last known event immediately so the client isn't left at 0%
      if (state.lastEvent) {
        subscriber.next(state.lastEvent);
      }

      // Same container — use the local Subject (no Redis roundtrip per event)
      const localSubject = this.localSubjects.get(jobId);
      if (localSubject) {
        const sub = localSubject.subscribe({
          next: (e) => subscriber.next(e),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
        return () => sub.unsubscribe();
      }

      // Different container — subscribe to Redis Pub/Sub channel
      const sub = this.redis.duplicate();

      // Register handlers BEFORE calling subscribe so no messages are missed
      sub.on('message', (_channel: string, message: string) => {
        const event: VideoProgressEvent = JSON.parse(message);
        subscriber.next(event);
        if (event.stage === 'complete' || event.stage === 'error') {
          subscriber.complete();
          sub.quit().catch(() => {});
        }
      });

      sub.on('error', (err: Error) => {
        subscriber.error(err);
        sub.quit().catch(() => {});
      });

      // Promise-based subscribe — avoids ioredis callback overload ambiguity
      const noop = (_err?: unknown) => {
        /* intentionally silent */
      };

      sub
        .subscribe(JOB_CHANNEL(jobId))
        .then(() => this.redis.get(JOB_STATE_KEY(jobId)))
        .then((freshRaw) => {
          // Re-check state after subscribing to close the race window:
          // job may have completed between our initial GET and the subscribe call.
          if (!freshRaw) return;
          const freshState: RedisJobState = JSON.parse(freshRaw);
          if (
            freshState.status === 'complete' ||
            freshState.status === 'error'
          ) {
            if (freshState.lastEvent) subscriber.next(freshState.lastEvent);
            subscriber.complete();
            sub.quit().catch(noop);
          }
        })
        .catch((err: Error) => {
          subscriber.error(err);
          sub.quit().catch(noop);
        });

      // Teardown: unsubscribe and close the dedicated subscriber connection
      return () => {
        sub
          .unsubscribe(JOB_CHANNEL(jobId))
          .catch(noop)
          .finally(() => sub.quit().catch(noop));
      };
    });
  }

  private async processVideoContent(
    jobId: string,
    kbId: ObjectId,
    sourceFilePath: string,
    mimetype: string,
    originalname: string,
    subject: Subject<VideoProgressEvent>,
    emit: (e: VideoProgressEvent) => void,
  ): Promise<void> {
    const filePath = resolve(sourceFilePath);

    try {
      emit({
        stage: 'file_received',
        progress: 10,
        message: 'File received. Starting content analysis...',
      });

      const content = await this.geminiService.extractTextFromVideo(
        filePath,
        mimetype,
        originalname,
        (stage, progress, message) => emit({ stage, progress, message }),
      );

      emit({
        stage: 'storing',
        progress: 80,
        message: 'Saving extracted content to knowledge base...',
      });

      const ts = new Date();
      const res = await this.kbDbService.insertToKbDataStore({
        knowledgebaseId: kbId,
        content,
        status: DataStoreStatus.CREATED,
        type: DataStoreType.VIDEO,
        url: '',
        title: originalname,
        createdAt: ts,
        updatedAt: ts,
      });

      const publicUrl = `${process.env.API_BASE_URL}/knowledgebase/importers/video/${res._id}`;
      await this.kbDbService
        .updateDataStoreUrl(res._id, publicUrl)
        .catch(() => {});

      emit({
        stage: 'embedding',
        progress: 90,
        message: 'Generating embeddings for semantic search...',
      });

      await this.datastoreService
        .generateChunksAndEmbeddingsForDataStoreItem(res)
        .catch((err) => {
          this.logger.warn(`Embedding error for job ${jobId}: ${err.message}`);
        });

      const doneEvent: VideoProgressEvent = {
        stage: 'complete',
        progress: 100,
        message: 'Video processed and ready for all bots.',
        data: {
          datastoreId: res._id?.toString(),
          title: originalname,
          url: publicUrl,
        },
      };
      emit(doneEvent);
      subject.complete();
    } catch (err) {
      this.logger.error(`Job ${jobId} failed: ${err.message}`);
      emit({
        stage: 'error',
        progress: 0,
        message: 'Video processing failed.',
        error: err.message,
      });
      subject.complete();
    } finally {
      await unlink(filePath).catch(() => {});
    }
  }

  private async processVideoContentFromStream(
    jobId: string,
    kbId: ObjectId,
    getStream: StreamFactory,
    fileSize: number,
    mimetype: string,
    originalname: string,
    subject: Subject<VideoProgressEvent>,
    emit: (e: VideoProgressEvent) => void,
  ): Promise<void> {
    try {
      emit({
        stage: 'file_received',
        progress: 10,
        message: 'File received. Starting content analysis...',
      });

      const content = await this.geminiService.extractTextFromStream(
        getStream,
        fileSize,
        mimetype,
        originalname,
        (stage, progress, message) => emit({ stage, progress, message }),
      );

      emit({
        stage: 'storing',
        progress: 80,
        message: 'Saving extracted content to knowledge base...',
      });

      const ts = new Date();
      const res = await this.kbDbService.insertToKbDataStore({
        knowledgebaseId: kbId,
        content,
        status: DataStoreStatus.CREATED,
        type: DataStoreType.VIDEO,
        url: '',
        title: originalname,
        createdAt: ts,
        updatedAt: ts,
      });

      const publicUrl = `${process.env.API_BASE_URL}/knowledgebase/importers/video/${res._id}`;
      await this.kbDbService
        .updateDataStoreUrl(res._id, publicUrl)
        .catch(() => {});

      emit({
        stage: 'embedding',
        progress: 90,
        message: 'Generating embeddings for semantic search...',
      });

      await this.datastoreService
        .generateChunksAndEmbeddingsForDataStoreItem(res)
        .catch((err) => {
          this.logger.warn(`Embedding error for job ${jobId}: ${err.message}`);
        });

      const doneEvent: VideoProgressEvent = {
        stage: 'complete',
        progress: 100,
        message: 'Video processed and ready for all bots.',
        data: {
          datastoreId: res._id?.toString(),
          title: originalname,
          url: publicUrl,
        },
      };
      emit(doneEvent);
      subject.complete();
    } catch (err) {
      this.logger.error(`Job ${jobId} failed: ${err.message}`);
      emit({
        stage: 'error',
        progress: 0,
        message: 'Video processing failed.',
        error: err.message,
      });
      subject.complete();
    }
    // No finally/unlink — there is no temp file when streaming from R2 directly.
  }

  async getVideosForKnowledgebase(user: UserSparse, knowledgebaseId: string) {
    const kbId = new ObjectId(knowledgebaseId);
    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);

    if (user.role !== Role.Admin) {
      checkUserIsOwnerOfKb(user, kb);
    }

    return this.kbDbService.getDocumentsOfKnowledgebase(kbId, [
      DataStoreType.VIDEO,
    ]);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { AppConfigService } from '../config/appConfig.service';

const GEMINI_VIDEO_MODEL = 'gemini-2.5-flash';
const FILE_POLL_INTERVAL_MS = 5000;
// Large videos (up to 2 GB) can take 15-25 min to process on Gemini.
// 300 attempts × 5 s = 25 min polling window.
const MAX_POLL_ATTEMPTS = 300;
const MAX_RETRY_ATTEMPTS = 3;

export type VideoProgressCallback = (
  stage: string,
  progress: number,
  message: string,
) => void;

// Factory that returns a fresh readable stream for each upload attempt.
// A factory (not a stream) is required so withRetry can re-read on failure —
// a consumed stream cannot be replayed.
export type StreamFactory = () => Promise<NodeJS.ReadableStream>;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  constructor(private readonly appConfig: AppConfigService) {}

  private async withRetry<T>(
    fn: () => Promise<T>,
    label: string,
    maxAttempts = MAX_RETRY_ATTEMPTS,
  ): Promise<T> {
    let lastError: Error;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `${label} attempt ${attempt}/${maxAttempts} failed: ${err.message}`,
        );
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
    }
    throw lastError;
  }

  // Used by the direct video upload endpoint — file is already on local disk.
  async extractTextFromVideo(
    filePath: string,
    mimeType: string,
    displayName: string,
    onProgress?: VideoProgressCallback,
  ): Promise<string> {
    return this.extractTextCore(
      () => Promise.resolve(fs.createReadStream(filePath)),
      fs.statSync(filePath).size,
      mimeType,
      displayName,
      onProgress,
    );
  }

  // Used when the source is a live stream (e.g. R2 piped directly, no /tmp step).
  async extractTextFromStream(
    getStream: StreamFactory,
    fileSize: number,
    mimeType: string,
    displayName: string,
    onProgress?: VideoProgressCallback,
  ): Promise<string> {
    return this.extractTextCore(
      getStream,
      fileSize,
      mimeType,
      displayName,
      onProgress,
    );
  }

  private async extractTextCore(
    getStream: StreamFactory,
    fileSize: number,
    mimeType: string,
    displayName: string,
    onProgress?: VideoProgressCallback,
  ): Promise<string> {
    const apiKey = this.appConfig.get('geminiKey');

    if (!apiKey) {
      throw new Error('Video analysis service is not configured.');
    }

    const fileManager = new GoogleAIFileManager(apiKey);
    const genAI = new GoogleGenerativeAI(apiKey);

    onProgress?.(
      'uploading_for_analysis',
      20,
      'Uploading video for analysis...',
    );
    this.logger.log(`Uploading video to Gemini Files API: ${displayName}`);

    const uploadResult = await this.withRetry(
      () =>
        this.streamUploadToGemini(
          getStream,
          fileSize,
          mimeType,
          displayName,
          apiKey,
        ),
      'Gemini uploadFile',
    );

    onProgress?.('analyzing', 35, 'Analyzing video content...');
    let uploadedFile = await fileManager.getFile(uploadResult.file.name);
    let attempts = 0;

    while (
      uploadedFile.state === FileState.PROCESSING &&
      attempts < MAX_POLL_ATTEMPTS
    ) {
      await new Promise((r) => setTimeout(r, FILE_POLL_INTERVAL_MS));
      uploadedFile = await fileManager.getFile(uploadResult.file.name);
      attempts++;
      const pollProgress =
        35 + Math.min(30, Math.floor((attempts / MAX_POLL_ATTEMPTS) * 30));
      onProgress?.(
        'analyzing',
        pollProgress,
        `Analyzing video... (${attempts * 3}s elapsed)`,
      );
    }

    if (uploadedFile.state === FileState.FAILED) {
      throw new Error(
        `Video analysis rejected the file. Ensure it is a valid, non-corrupted file.`,
      );
    }

    if (uploadedFile.state !== FileState.ACTIVE) {
      throw new Error(
        `Video analysis timed out after ${
          (MAX_POLL_ATTEMPTS * FILE_POLL_INTERVAL_MS) / 1000
        }s. Try a shorter video.`,
      );
    }

    onProgress?.(
      'extracting',
      70,
      'Extracting transcript and visual content...',
    );
    this.logger.log(`Video ready. Extracting content: ${displayName}`);

    const model = genAI.getGenerativeModel({ model: GEMINI_VIDEO_MODEL });

    const result = await this.withRetry(
      () =>
        model.generateContent([
          {
            fileData: {
              fileUri: uploadedFile.uri,
              mimeType: uploadedFile.mimeType,
            },
          },
          {
            text: `Analyze this video thoroughly and provide:

[TRANSCRIPT]
Provide a complete, verbatim transcript of all spoken content, including speaker changes if detectable.

[VISUAL CONTENT]
Describe all significant visual elements: slides, charts, diagrams, on-screen text, product demos, UI walkthroughs, and key scene changes.

[SUMMARY]
Write a concise summary of the overall topic, key points, and any actionable information covered.`,
          },
        ]),
      'Gemini generateContent',
    );

    const extractedText = result.response.text();

    try {
      await fileManager.deleteFile(uploadedFile.name);
      this.logger.log(`Cleaned up Gemini file: ${uploadedFile.name}`);
    } catch (err) {
      this.logger.warn(`Failed to delete Gemini file: ${err.message}`);
    }

    return extractedText;
  }

  /**
   * Streams bytes to the Gemini Files API using the resumable upload protocol.
   * Accepts a StreamFactory so withRetry gets a fresh stream on each attempt —
   * a consumed stream cannot be rewound.
   */
  private streamUploadToGemini(
    getStream: StreamFactory,
    fileSize: number,
    mimeType: string,
    displayName: string,
    apiKey: string,
  ): Promise<{ file: { name: string; uri: string; mimeType: string } }> {
    const GEMINI_UPLOAD_HOST = 'generativelanguage.googleapis.com';
    const API_VERSION = 'v1beta';

    return new Promise((resolve, reject) => {
      const metaBody = JSON.stringify({ file: { display_name: displayName } });
      const initReq = https.request(
        {
          hostname: GEMINI_UPLOAD_HOST,
          path: `/upload/${API_VERSION}/files?key=${apiKey}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(metaBody),
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': fileSize,
            'X-Goog-Upload-Header-Content-Type': mimeType,
          },
        },
        (initRes) => {
          let initBody = '';
          initRes.on('data', (c) => (initBody += c));
          initRes.on('end', async () => {
            try {
              if (initRes.statusCode !== 200) {
                return reject(
                  new Error(
                    `Gemini resumable init failed: HTTP ${
                      initRes.statusCode
                    } — ${initBody.slice(0, 300)}`,
                  ),
                );
              }
              const uploadUrl = initRes.headers['x-goog-upload-url'] as string;
              if (!uploadUrl) {
                return reject(
                  new Error(
                    'Gemini resumable init: missing x-goog-upload-url header',
                  ),
                );
              }

              const stream = await getStream();
              const parsed = new URL(uploadUrl);
              const uploadReq = https.request(
                {
                  hostname: parsed.hostname,
                  path: parsed.pathname + parsed.search,
                  method: 'PUT',
                  headers: {
                    'Content-Length': fileSize,
                    'Content-Type': mimeType,
                    'X-Goog-Upload-Offset': '0',
                    'X-Goog-Upload-Command': 'upload, finalize',
                  },
                  // No timeout — large file uploads can take many minutes.
                  timeout: 0,
                },
                (uploadRes) => {
                  let uploadBody = '';
                  uploadRes.on('data', (c) => (uploadBody += c));
                  uploadRes.on('end', () => {
                    if (
                      uploadRes.statusCode !== 200 &&
                      uploadRes.statusCode !== 201
                    ) {
                      return reject(
                        new Error(
                          `Gemini file upload failed: HTTP ${
                            uploadRes.statusCode
                          } — ${uploadBody.slice(0, 300)}`,
                        ),
                      );
                    }
                    try {
                      resolve(JSON.parse(uploadBody));
                    } catch {
                      reject(
                        new Error(
                          `Gemini upload response parse error: ${uploadBody.slice(
                            0,
                            200,
                          )}`,
                        ),
                      );
                    }
                  });
                },
              );
              uploadReq.on('error', reject);
              stream.pipe(uploadReq);
            } catch (err) {
              reject(err);
            }
          });
        },
      );
      initReq.on('error', reject);
      initReq.write(metaBody);
      initReq.end();
    });
  }
}

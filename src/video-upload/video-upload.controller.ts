import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { RequestWithUser } from '../common/@types/nest.types';
import { VideoUploadService } from './video-upload.service';
import { ResponseUtil } from '../utils/response.util';

@Controller('video-upload')
export class VideoUploadController {
  constructor(private readonly videoUploadService: VideoUploadService) {}

  /**
   * POST /video-upload/initiate
   *
   * Step 1: Call this before uploading. Returns a per-chunk presigned URL array
   * and an uploadId to use for subsequent calls.
   *
   * Body: { knowledgebaseId, fileName, fileSize, mimeType }
   * Response: { uploadId, chunkSize, totalParts, parts: [{partNumber, presignedUrl}] }
   */
  @Post('/initiate')
  async initiateUpload(
    @Req() req: RequestWithUser,
    @Body()
    body: {
      knowledgebaseId: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    },
  ) {
    try {
      const { knowledgebaseId, fileName, fileSize, mimeType } = body;

      if (!knowledgebaseId || !fileName || !fileSize || !mimeType) {
        return ResponseUtil.error(
          'knowledgebaseId, fileName, fileSize and mimeType are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.videoUploadService.initiateUpload({
        userId: req.user._id.toString(),
        knowledgebaseId,
        fileName,
        fileSize: Number(fileSize),
        mimeType,
      });

      return ResponseUtil.success(result, 'Upload initiated');
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /video-upload/complete
   *
   * Step 2: Call after all parts have been uploaded to S3.
   * Sends the ETags returned by S3 for each part to finalize the multipart assembly.
   *
   * Body: { uploadId, parts: [{partNumber, etag}] }
   * Response: { s3Key, message }
   */
  @Post('/complete')
  async completeUpload(
    @Req() req: RequestWithUser,
    @Body()
    body: {
      uploadId: string;
      parts: { partNumber: number; etag: string }[];
    },
  ) {
    try {
      const { uploadId, parts } = body;

      if (!uploadId || !Array.isArray(parts) || parts.length === 0) {
        return ResponseUtil.error(
          'uploadId and parts array are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.videoUploadService.completeUpload({
        userId: req.user._id.toString(),
        uploadId,
        parts,
      });

      return ResponseUtil.success(result, result.message);
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /video-upload/abort
   *
   * Call to cancel an in-progress upload and clean up S3 incomplete parts.
   *
   * Body: { uploadId }
   * Response: { message }
   */
  @Post('/abort')
  async abortUpload(
    @Req() req: RequestWithUser,
    @Body() body: { uploadId: string },
  ) {
    try {
      const { uploadId } = body;

      if (!uploadId) {
        return ResponseUtil.error('uploadId is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.videoUploadService.abortUpload({
        userId: req.user._id.toString(),
        uploadId,
      });

      return ResponseUtil.success(result, result.message);
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /video-upload/status/:uploadId
   *
   * Returns current upload state — use this on app reload to resume a
   * paused upload. completedParts tells the frontend which chunks to skip.
   *
   * Response: { uploadId, status, fileName, fileSize, totalParts, completedParts[], s3Key?, jobId? }
   */
  @Get('/status/:uploadId')
  async getUploadStatus(
    @Req() req: RequestWithUser,
    @Param('uploadId') uploadId: string,
  ) {
    try {
      const result = await this.videoUploadService.getUploadStatus({
        userId: req.user._id.toString(),
        uploadId,
      });

      return ResponseUtil.success(result, 'Upload status fetched');
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /video-upload/refresh-urls
   *
   * Presigned URLs expire after 1 hour. Call this if an upload is paused
   * longer than that to get fresh URLs for specific parts.
   *
   * Body: { uploadId, partNumbers: [1, 2, 3] }
   * Response: { parts: [{partNumber, presignedUrl}] }
   */
  @Post('/refresh-urls')
  async refreshPresignedUrls(
    @Req() req: RequestWithUser,
    @Body() body: { uploadId: string; partNumbers: number[] },
  ) {
    try {
      const { uploadId, partNumbers } = body;

      if (!uploadId || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        return ResponseUtil.error(
          'uploadId and partNumbers array are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.videoUploadService.refreshPresignedUrls({
        userId: req.user._id.toString(),
        uploadId,
        partNumbers,
      });

      return ResponseUtil.success(result, 'Presigned URLs refreshed');
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

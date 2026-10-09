import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  HttpException,
  HttpStatus,
  MaxFileSizeValidator,
  MessageEvent,
  Param,
  ParseFilePipe,
  Post,
  Req,
  Res,
  Sse,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Observable, from, switchMap, of, map, catchError } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequestWithUser } from '../common/@types/nest.types';
import LocalFilesInterceptor from '../common/local-flie-interceptor';
import { AddDocumentDTO } from './importers.dto';
import { PdfImporterService } from './pdf/pdf-importer.service';
import { TextractImporterService } from './textract/textract-importer.service';
import { VideoImporterService } from './video/video-importer.service';
import { ResponseUtil } from '../utils/response.util';
import { Response } from 'express';
import { Public } from '../auth/guards/public.guard';

const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/mpeg',
  'video/x-matroska',
  'video/3gpp',
];

const ALLOWED_VIDEO_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.webm',
  '.avi',
  '.mkv',
  '.mpeg',
  '.mpg',
  '.3gp',
];

@Controller('knowledgebase/importers')
export class ImportersController {
  constructor(
    private readonly pdfImporterService: PdfImporterService,
    private readonly textractService: TextractImporterService,
    private readonly videoImporterService: VideoImporterService,
  ) {}

  @Post('/pdf')
  @UseInterceptors(
    LocalFilesInterceptor({
      fieldName: 'file',
      path: 'pdfs',
    }),
  )
  async addPdf(
    @Req() req: RequestWithUser,
    @Body() data: AddDocumentDTO,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: '.(pdf)' }),
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 50 + 1 }), // 50 MB inclusive
        ],
        exceptionFactory: (error) => {
          if (error?.includes('File too large')) {
            return new HttpException(
              'You cannot upload more than 50 MB file',
              HttpStatus.BAD_REQUEST,
            );
          }
          return new HttpException(
            'You cannot upload more than 50 MB file',
            HttpStatus.BAD_REQUEST,
          );
        },
      }),
    )
    file: Express.Multer.File,
  ) {
    try {
      const { user } = req;
      const result = await this.pdfImporterService.addPdfToDataStore(
        user,
        data.knowledgebaseId,
        file,
      );
      return ResponseUtil.success(result, 'PDF uploaded successfully');
    } catch (error) {
      return ResponseUtil.error(
        error.message ||
          error.response ||
          error.response?.data?.message ||
          'Something went wrong',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/document')
  @UseInterceptors(FileInterceptor('file'))
  async addDocument(
    @Req() req: RequestWithUser,
    @Body() data: AddDocumentDTO,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 1024 * 1024 * 50 + 1, // 50 MB inclusive (validator uses strict <)
          }),
        ],
        exceptionFactory: (error) => {
          if (error?.includes('File too large')) {
            return new HttpException(
              'You cannot upload more than 50 MB file',
              HttpStatus.BAD_REQUEST,
            );
          }
          return new HttpException(
            'You cannot upload more than 50 MB file',
            HttpStatus.BAD_REQUEST,
          );
        },
      }),
    )
    file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
      }
      // ✅ Allowed MIME types
      const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv',
        'image/jpeg',
        'image/png',
      ];

      const fileExtension = file.originalname
        .substring(file.originalname.lastIndexOf('.'))
        .toLowerCase();

      // ✅ Allowed extensions (extra security)
      const allowedExtensions = [
        '.pdf',
        '.docx',
        '.csv',
        '.jpg',
        '.jpeg',
        '.png',
      ];

      // const fileExtension = file.originalname
      //   .substring(file.originalname.lastIndexOf('.'))
      //   .toLowerCase();

      if (
        !allowedMimeTypes.includes(file.mimetype) ||
        !allowedExtensions.includes(fileExtension)
      ) {
        throw new HttpException(
          'Invalid file format. Supported formats: pdf, docx, csv, jpg, jpeg, png',
          HttpStatus.BAD_REQUEST,
        );
      }
      const { user } = req;
      return await this.textractService.addFileToDataStore(
        user,
        data.knowledgebaseId,
        file,
      );
    } catch (error) {
      return ResponseUtil.error(
        error.message ||
          error.response ||
          error.response?.data?.message ||
          'Internal Server Error',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/documents/:knowledgebaseId')
  async getDocuments(
    @Req() req: RequestWithUser,
    @Param('knowledgebaseId') knowledgebaseId: string,
  ) {
    try {
      const { user } = req;
      const data = await this.textractService.getDocumentsForKnowledgebase(
        user,
        knowledgebaseId,
      );
      return ResponseUtil.success(data, 'Documents fetched successfully');
    } catch (error) {
      return ResponseUtil.error(
        error.message ||
          error.response ||
          error.response?.data?.message ||
          'Internal Server Error',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── VIDEO ────────────────────────────────────────────────────────────────

  @Post('/video')
  @UseInterceptors(
    LocalFilesInterceptor({
      fieldName: 'file',
      path: 'videos',
      limits: { fileSize: 1024 * 1024 * 201 }, // multer safety net; NestJS validator enforces the precise 200 MB limit
    }),
  )
  async addVideo(
    @Req() req: RequestWithUser,
    @Body() data: AddDocumentDTO,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 200 + 1 }), // 200 MB inclusive (validator uses strict <)
        ],
        exceptionFactory: () =>
          new HttpException(
            'File too large. Maximum video size is 200 MB',
            HttpStatus.BAD_REQUEST,
          ),
      }),
    )
    file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
      }

      const ext = file.originalname
        .substring(file.originalname.lastIndexOf('.'))
        .toLowerCase();

      if (
        !ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype) ||
        !ALLOWED_VIDEO_EXTENSIONS.includes(ext)
      ) {
        throw new HttpException(
          'Invalid file format. Supported formats: mp4, mov, webm, avi, mkv, mpeg, 3gp',
          HttpStatus.BAD_REQUEST,
        );
      }

      const { user } = req;
      const result = await this.videoImporterService.startVideoProcessingJob(
        user,
        data.knowledgebaseId,
        file,
      );
      return ResponseUtil.success(
        result,
        'Video upload accepted. Track progress via /video/progress/' +
          result.jobId,
      );
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * SSE endpoint — stream processing progress for a job.
   * Works across all containers: job state and events are stored in Redis,
   * so the SSE request does not need to hit the same container as the POST.
   */
  @Public()
  @Sse('/video/progress/:jobId')
  videoProgress(@Param('jobId') jobId: string): Observable<MessageEvent> {
    const errorEvent = (msg: string): MessageEvent => ({
      data: JSON.stringify({
        stage: 'error',
        progress: 0,
        message: msg,
        error: msg,
      }),
    });

    return from(this.videoImporterService.streamJobProgress(jobId)).pipe(
      switchMap((stream) => {
        if (!stream) {
          return of(errorEvent('Invalid jobId'));
        }
        return stream.pipe(
          map((event) => ({ data: JSON.stringify(event) } as MessageEvent)),
          catchError((err: Error) => of(errorEvent(err.message))),
        );
      }),
    );
  }

  @Get('/videos/:knowledgebaseId')
  async getVideos(
    @Req() req: RequestWithUser,
    @Param('knowledgebaseId') knowledgebaseId: string,
  ) {
    try {
      const { user } = req;
      const data = await this.videoImporterService.getVideosForKnowledgebase(
        user,
        knowledgebaseId,
      );
      return ResponseUtil.success(data, 'Videos fetched successfully');
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── PUBLIC FILE ACCESS ───────────────────────────────────────────────────

  //PUBLIC FILE ACCESS
  @Public()
  @Get('/file/:id')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    try {
      const file = await this.textractService.getFileById(id);

      if (!file || !file.fileBuffer) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.title}"`);

      return res.send(file.fileBuffer);
    } catch (error) {
      throw new HttpException(
        error.message || 'Error fetching file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

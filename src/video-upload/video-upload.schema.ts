import { ObjectId } from 'mongodb';

export const VIDEO_UPLOAD_COLLECTION = 'videoUploads';

export type VideoUploadStatus =
  | 'initiated'
  | 'uploading'
  | 'completing'
  | 'completed'
  | 'aborted'
  | 'failed';

export interface VideoUploadPart {
  partNumber: number;
  etag: string | null;
}

export interface VideoUploadDoc {
  _id?: ObjectId;
  userId: string;
  knowledgebaseId: string;
  s3UploadId: string;
  s3Key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalParts: number;
  parts: VideoUploadPart[];
  status: VideoUploadStatus;
  s3Bucket: string;
  s3Region: string;
  jobId?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

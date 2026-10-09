import axios from 'axios';
import { baseURL } from '../config';

export const VIDEO_ACCEPTED_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.webm',
  '.avi',
  '.mkv',
  '.mpeg',
  '.mpg',
  '.3gp',
]);

export const VIDEO_ACCEPTED_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/avi',
  'video/msvideo',
  'video/mpeg',
  'video/mpg',
  'video/x-mpeg',
  'video/x-matroska',
  'video/mkv',
  'video/x-mkv',
  'application/x-matroska',
  'video/3gpp',
  'video/3gp',
]);

export const isVideoFile = (file: File | string): boolean => {
  if (!file) return false;
  const name = typeof file === 'string' ? file : file.name || '';
  const extMatch = name.match(/\.([a-zA-Z0-9]+)$/);
  if (extMatch) {
    const ext = `.${extMatch[1].toLowerCase()}`;
    return VIDEO_ACCEPTED_EXTENSIONS.has(ext);
  }
  const type = typeof file === 'string' ? '' : file.type || '';
  if (type && VIDEO_ACCEPTED_TYPES.has(type.toLowerCase())) {
    return true;
  }
  return false;
};

export const getNormalizedVideoMimeType = (file: File): string => {
  const rawType = (file.type || '').toLowerCase();
  if (rawType && VIDEO_ACCEPTED_TYPES.has(rawType)) {
    if (rawType === 'video/mkv' || rawType === 'video/x-mkv' || rawType === 'application/x-matroska') {
      return 'video/x-matroska';
    }
    if (rawType === 'video/avi' || rawType === 'video/msvideo') {
      return 'video/x-msvideo';
    }
    if (rawType === 'video/mpg' || rawType === 'video/x-mpeg') {
      return 'video/mpeg';
    }
    if (rawType === 'video/3gp') {
      return 'video/3gpp';
    }
    return rawType;
  }

  const extMatch = (file.name || '').match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '';
  switch (ext) {
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'webm':
      return 'video/webm';
    case 'avi':
      return 'video/x-msvideo';
    case 'mkv':
      return 'video/x-matroska';
    case 'mpeg':
    case 'mpg':
      return 'video/mpeg';
    case '3gp':
      return 'video/3gpp';
    default:
      return file.type || 'video/mp4';
  }
};

export const VIDEO_MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

export const stageDisplayName = (stage: string): string => {
  const map: Record<string, string> = {
    uploading_for_analysis: 'Sending video to AI…',
    analyzing: 'Analyzing content…',
    extracting: 'Extracting transcript & visuals…',
    storing: 'Saving to knowledge base…',
    embedding: 'Generating search index…',
    complete: 'Ready',
    error: 'Processing failed',
  };
  return map[stage] || stage;
};

export const validateVideoFile = (selectedFile: File): string | null => {
  if (!isVideoFile(selectedFile)) {
    return 'Unsupported video format. Only MP4, MOV, WebM, AVI, MKV, MPEG, MPG, and 3GP files are supported.';
  }
  if (selectedFile.size > VIDEO_MAX_SIZE) {
    return 'File exceeds the 2 GB limit.';
  }
  if (selectedFile.size === 0) {
    return 'File is empty.';
  }
  return null;
};

export interface InitiateUploadResponse {
  uploadId: string;
  chunkSize: number;
  totalParts: number;
  parts: { partNumber: number; presignedUrl: string }[];
}

const formatAuthHeader = (token: string): string => {
  if (!token) return '';
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

export const initiateVideoUploadApi = async (
  selectedFile: File,
  knowledgebaseId: string,
  token: string
): Promise<InitiateUploadResponse> => {
  try {
    const mimeType = getNormalizedVideoMimeType(selectedFile);
    const response = await axios({
      baseURL: baseURL,
      method: 'post',
      url: '/video-upload/initiate',
      headers: {
        Authorization: formatAuthHeader(token),
      },
      data: {
        knowledgebaseId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType,
      },
    });
    return response.data?.data || response.data;
    return response.data?.data || response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || error?.message || 'Failed to initiate upload'
    );
  }
};

export const uploadSinglePartApi = async (
  part: { partNumber: number; presignedUrl: string },
  fileObj: File,
  chunkSize: number,
  signal?: AbortSignal
): Promise<{ partNumber: number; etag: string }> => {
  const start = (part.partNumber - 1) * chunkSize;
  const chunk = fileObj.slice(start, start + chunkSize);
  const PART_RETRIES = 5;
  let lastError: any = null;

  for (let attempt = 1; attempt <= PART_RETRIES; attempt++) {
    if (signal?.aborted) throw new Error('Upload cancelled');
    try {
      const res = await fetch(part.presignedUrl, {
        method: 'PUT',
        body: chunk,
        signal,
        // CRITICAL: DO NOT add Authorization header to R2 presigned URLs
      });
      if (!res.ok) throw new Error(`R2 returned HTTP ${res.status}`);

      const rawEtag = res.headers.get('etag') || res.headers.get('ETag') || '';
      const etag = rawEtag ? rawEtag.replace(/"/g, '') : '';
      return { partNumber: part.partNumber, etag: `"${etag}"` };
    } catch (err: any) {
      if (err.message === 'Upload cancelled' || signal?.aborted) {
        throw new Error('Upload cancelled');
      }
      lastError = err;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  throw lastError || new Error(`Failed to upload part ${part.partNumber}`);
};

export const uploadAllPartsApi = async (
  partsList: { partNumber: number; presignedUrl: string }[],
  fileObj: File,
  chunkSize: number,
  totalParts: number,
  alreadyUploadedCount = 0,
  onProgress?: (partsUploaded: number, totalParts: number, pct: number) => void,
  signal?: AbortSignal
): Promise<{ partNumber: number; etag: string }[]> => {
  const CONCURRENCY = 4;
  const etagsMap = new Map<number, string>();
  let partsUploaded = alreadyUploadedCount;
  const queue = [...partsList];

  async function worker() {
    while (queue.length > 0) {
      if (signal?.aborted) throw new Error('Upload cancelled');
      const part = queue.shift();
      if (!part) break;

      const result = await uploadSinglePartApi(
        part,
        fileObj,
        chunkSize,
        signal
      );
      etagsMap.set(result.partNumber, result.etag);
      partsUploaded++;
      const pct = Math.round((partsUploaded / totalParts) * 50);
      if (onProgress) {
        onProgress(partsUploaded, totalParts, pct);
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, partsList.length) },
    () => worker()
  );
  await Promise.all(workers);

  return Array.from(etagsMap.entries())
    .map(([partNumber, etag]) => ({ partNumber, etag }))
    .sort((a, b) => a.partNumber - b.partNumber);
};

export const completeVideoUploadApi = async (
  uploadId: string,
  etags: { partNumber: number; etag: string }[],
  token: string
): Promise<any> => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await axios({
        baseURL: baseURL,
        method: 'post',
        url: '/video-upload/complete',
        headers: {
          Authorization: formatAuthHeader(token),
        },
        data: { uploadId, parts: etags },
      });
      return response.data?.data || response.data;
    } catch (error: any) {
      if (error?.response?.status >= 500 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw new Error(
        error?.response?.data?.message || error?.message || 'Failed to complete upload'
      );
    }
  }
};

export const pollForJobIdApi = async (
  uploadId: string,
  token: string,
  timeoutMs = 120000
): Promise<string> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await axios({
        baseURL: baseURL,
        method: 'get',
        url: `/video-upload/status/${uploadId}`,
        headers: { Authorization: formatAuthHeader(token) },
      });
      const jobId = response.data?.data?.jobId || response.data?.jobId;
      if (jobId) return jobId;
    } catch (e) {
      // transient error, retry polling
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Timed out waiting for processing to start.');
};

export const streamProgressApi = async (
  jobId: string,
  token: string,
  onProgress: (pct: number, stageMessage: string) => void,
  onComplete: (datastoreId: string) => void,
  readerRef?: React.MutableRefObject<ReadableStreamDefaultReader<Uint8Array> | null>
): Promise<void> => {
  const getSseBaseUrl = (): string => {
    const url = baseURL || axios.defaults.baseURL || '';
    return url ? url.replace(/\/+$/, '') : '';
  };

  const response = await fetch(
    `${getSseBaseUrl()}/knowledgebase/importers/video/progress/${jobId}`,
    {
      headers: {
        Authorization: formatAuthHeader(token),
        Accept: 'text/event-stream',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`SSE connection failed: HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error('ReadableStream not supported');
  }

  const reader = response.body.getReader();
  if (readerRef) {
    readerRef.current = reader;
  }
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        try {
          const event = JSON.parse(line.slice(5).trim());
          const overallPct = 50 + Math.round((event.progress || 0) / 2);
          const apiMessage =
            event.message ||
            event.stageMessage ||
            event.details ||
            event.statusText;
          const displayMsg =
            apiMessage || stageDisplayName(event.stage) || 'Processing video…';
          onProgress(overallPct, displayMsg);

          if (event.stage === 'complete') {
            if (readerRef) readerRef.current = null;
            onComplete(event.data?.datastoreId);
            return;
          }
          if (event.stage === 'error') {
            if (readerRef) readerRef.current = null;
            throw new Error(
              event.error || event.message || 'Processing failed'
            );
          }
        } catch (e: any) {
          if (e.message && e.message !== 'Unexpected end of JSON input') {
            throw e;
          }
        }
      }
    }
  } finally {
    if (readerRef) readerRef.current = null;
  }
};

export const abortVideoUploadApi = async (
  uploadId: string,
  token: string
): Promise<void> => {
  try {
    await axios({
      baseURL: baseURL,
      method: 'post',
      url: '/video-upload/abort',
      headers: {
        Authorization: formatAuthHeader(token),
      },
      data: { uploadId },
    });
  } catch (e) {
    console.error('Failed to abort upload on server', e);
  } finally {
    localStorage.removeItem('videoUploadSession');
  }
};

export const getUploadStatusApi = async (
  uploadId: string,
  token: string
): Promise<any> => {
  try {
    const response = await axios({
      baseURL: baseURL,
      method: 'get',
      url: `/video-upload/status/${uploadId}`,
      headers: { Authorization: formatAuthHeader(token) },
    });
    return response.data?.data || response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || error?.message || 'Failed to fetch status'
    );
  }
};

export const refreshPresignedUrlsApi = async (
  uploadId: string,
  partNumbers: number[],
  token: string
): Promise<{ parts: { partNumber: number; presignedUrl: string }[] }> => {
  try {
    const response = await axios({
      baseURL: baseURL,
      method: 'post',
      url: '/video-upload/refresh-urls',
      headers: {
        Authorization: formatAuthHeader(token),
      },
      data: { uploadId, partNumbers },
    });
    return response.data?.data || response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || error?.message || 'Failed to refresh URLs'
    );
  }
};

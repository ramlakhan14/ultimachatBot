import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import {
  Box,
  Flex,
  Text,
  Progress,
  Button,
  useToast,
  HStack,
  Badge,
  IconButton,
} from '@chakra-ui/react';
import nookies from 'nookies';
import axios from 'axios';
import {
  validateVideoFile,
  initiateVideoUploadApi,
  uploadAllPartsApi,
  completeVideoUploadApi,
  pollForJobIdApi,
  streamProgressApi,
  abortVideoUploadApi,
  getUploadStatusApi,
  refreshPresignedUrlsApi,
} from '../../services/videoUploadService';
import { FiMove } from 'react-icons/fi';

interface SavedSession {
  uploadId: string;
  fileName: string;
  knowledgebaseId: string;
  jobId?: string;
}

export interface ResumeDetails {
  uploadId: string;
  fileName: string;
  totalParts: number;
  completedParts: Set<number>;
  uploadedParts: { partNumber: number; etag: string }[];
  status: string;
  jobId?: string;
  knowledgebaseId?: string;
}

export type WidgetCorner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

interface VideoUploadContextType {
  isVideoUploading: boolean;
  uploadProgress: number;
  progressStage: string;
  currentUploadId: string | null;
  currentKbId: string | null;
  currentFileName: string | null;
  resumePrompt: ResumeDetails | null;
  activeMountedKbId: string | null;
  widgetCorner: WidgetCorner;
  setWidgetCorner: (corner: WidgetCorner) => void;
  reportKbMounted: (kbId: string, mounted: boolean) => void;
  startVideoUpload: (file: File, kbId: string, token: string, onFinish?: () => void) => Promise<void>;
  confirmResume: (selectedFile: File, token: string, onFinish?: () => void) => Promise<void>;
  dismissResume: (token: string) => Promise<void>;
  cancelUpload: (token: string) => Promise<void>;
  registerOnFinishListener: (kbId: string, callback: () => void) => () => void;
}

const getAuthToken = (): string => {
  const c = nookies.get();
  if (c.accesstoken) return c.accesstoken;
  const authHeader = axios.defaults.headers.common['Authorization'] as string;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }
  return '';
};

const VideoUploadContext = createContext<VideoUploadContextType | null>(null);

export const useVideoUpload = () => {
  const context = useContext(VideoUploadContext);
  if (!context) {
    throw new Error('useVideoUpload must be used within a VideoUploadProvider');
  }
  return context;
};

export const VideoUploadProvider = ({ children }: { children: ReactNode }) => {
  const toast = useToast();

  // Read initial session from localStorage synchronously so progress bar shows ON FIRST FRAME after reload!
  const getInitialSession = (): SavedSession | null => {
    try {
      const savedStr = localStorage.getItem('videoUploadSession');
      return savedStr ? JSON.parse(savedStr) : null;
    } catch {
      return null;
    }
  };

  const initialSession = getInitialSession();

  const [isVideoUploading, setIsVideoUploading] = useState<boolean>(!!initialSession);
  const [uploadProgress, setUploadProgress] = useState<number>(initialSession ? 52 : 0);
  const [progressStage, setProgressStage] = useState<string>(initialSession ? 'Processing video…' : '');
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(initialSession?.uploadId || null);
  const [currentKbId, setCurrentKbId] = useState<string | null>(initialSession?.knowledgebaseId || null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(initialSession?.fileName || null);

  const [resumePrompt, setResumePrompt] = useState<ResumeDetails | null>(null);
  const [activeMountedKbId, setActiveMountedKbId] = useState<string | null>(null);

  // Widget corner position
  const [widgetCorner, setWidgetCornerState] = useState<WidgetCorner>(() => {
    return (localStorage.getItem('videoUploadWidgetCorner') as WidgetCorner) || 'top-right';
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const listenersRef = useRef<Map<string, Set<() => void>>>(new Map());

  const setWidgetCorner = (corner: WidgetCorner) => {
    setWidgetCornerState(corner);
    localStorage.setItem('videoUploadWidgetCorner', corner);
  };

  const cycleCorner = () => {
    const map: Record<WidgetCorner, WidgetCorner> = {
      'top-right': 'bottom-right',
      'bottom-right': 'bottom-left',
      'bottom-left': 'top-left',
      'top-left': 'top-right',
    };
    setWidgetCorner(map[widgetCorner]);
  };

  const reportKbMounted = (kbId: string, mounted: boolean) => {
    if (mounted) {
      setActiveMountedKbId(String(kbId));
    } else {
      setActiveMountedKbId((prev) => (String(prev) === String(kbId) ? null : prev));
    }
  };

  const registerOnFinishListener = (kbId: string, callback: () => void) => {
    const key = String(kbId);
    if (!listenersRef.current.has(key)) {
      listenersRef.current.set(key, new Set());
    }
    listenersRef.current.get(key)?.add(callback);

    return () => {
      listenersRef.current.get(key)?.delete(callback);
    };
  };

  const notifyFinishListeners = (kbId: string) => {
    const key = String(kbId);
    const set = listenersRef.current.get(key);
    if (set) {
      set.forEach((cb) => cb());
    }
  };

  const checkResumeSession = async (authToken: string) => {
    try {
      const savedStr = localStorage.getItem('videoUploadSession');
      if (!savedStr) return null;
      const saved: SavedSession = JSON.parse(savedStr);
      if (!saved || !saved.uploadId) return null;

      const data = await getUploadStatusApi(saved.uploadId, authToken);
      if (!data) return null;

      const activeJobId = data.jobId || saved.jobId;

      // Only abort/clear if server explicitly returns aborted or failed status
      if (data.status === 'aborted' || data.status === 'failed') {
        localStorage.removeItem('videoUploadSession');
        setIsVideoUploading(false);
        setUploadProgress(0);
        setProgressStage('');
        setCurrentUploadId(null);
        setCurrentKbId(null);
        setCurrentFileName(null);
        return null;
      }

      return {
        uploadId: data.uploadId,
        fileName: data.fileName || saved.fileName,
        totalParts: data.totalParts,
        status: data.status,
        jobId: activeJobId,
        knowledgebaseId: saved.knowledgebaseId,
        completedParts: new Set<number>(data.completedParts || []),
        uploadedParts: (data.uploadedParts || []) as { partNumber: number; etag: string }[],
      };
    } catch (err) {
      console.error('Resume check error:', err);
      return null;
    }
  };

  const autoResumeServerProcessing = async (resumeData: ResumeDetails, authToken: string) => {
    setIsVideoUploading(true);
    setCurrentUploadId(resumeData.uploadId);
    setCurrentKbId(resumeData.knowledgebaseId || null);
    setCurrentFileName(resumeData.fileName);
    setUploadProgress(52);
    setProgressStage('Processing video…');

    try {
      let jobId = resumeData.jobId;
      if (!jobId) {
        setUploadProgress(52);
        setProgressStage('Starting AI processing…');
        jobId = await pollForJobIdApi(resumeData.uploadId, authToken);
      }

      // Persist jobId in localStorage so reloads preserve it!
      localStorage.setItem(
        'videoUploadSession',
        JSON.stringify({
          uploadId: resumeData.uploadId,
          fileName: resumeData.fileName,
          knowledgebaseId: resumeData.knowledgebaseId,
          jobId,
        })
      );

      setUploadProgress(52);
      setProgressStage('Processing video…');

      await streamProgressApi(
        jobId,
        authToken,
        (pct, stageMsg) => {
          setUploadProgress(pct);
          setProgressStage(stageMsg);
        },
        () => {
          localStorage.removeItem('videoUploadSession');
          toast({
            title: `Video "${resumeData.fileName}" processed successfully`,
            status: 'success',
            isClosable: true,
          });
          if (resumeData.knowledgebaseId) {
            notifyFinishListeners(resumeData.knowledgebaseId);
          }
        },
        readerRef
      );
    } catch (err: any) {
      toast({
        title: err?.message || 'Resume processing failed',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setIsVideoUploading(false);
      setUploadProgress(0);
      setProgressStage('');
      setCurrentUploadId(null);
      setCurrentKbId(null);
      setCurrentFileName(null);
    }
  };

  // Re-check resume on mount / window reload
  useEffect(() => {
    let active = true;

    const tryResume = async () => {
      let authToken = getAuthToken();
      let attempts = 0;
      while (!authToken && attempts < 10 && active) {
        await new Promise((r) => setTimeout(r, 500));
        authToken = getAuthToken();
        attempts++;
      }

      if (!authToken || !active) return;

      const resumeData = await checkResumeSession(authToken);
      if (!active) return;

      if (resumeData) {
        // If jobId exists OR status is completed/completing/processing, continue AI SSE stream!
        if (resumeData.jobId || ['completing', 'processing', 'completed'].includes(resumeData.status)) {
          autoResumeServerProcessing(resumeData, authToken);
        } else {
          setResumePrompt(resumeData);
          setIsVideoUploading(false);
        }
      }
    };

    tryResume();

    return () => {
      active = false;
    };
  }, []);

  const startVideoUpload = async (
    selectedFile: File,
    kbId: string,
    authToken: string,
    onFinish?: () => void
  ) => {
    const valErr = validateVideoFile(selectedFile);
    if (valErr) {
      toast({ title: valErr, status: 'error', isClosable: true });
      return;
    }

    setIsVideoUploading(true);
    setUploadProgress(0);
    setProgressStage('Preparing upload…');
    setCurrentKbId(String(kbId));
    setCurrentFileName(selectedFile.name);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Step 2: Initiate
      const initData = await initiateVideoUploadApi(selectedFile, kbId, authToken);
      const uploadId = initData.uploadId;
      setCurrentUploadId(uploadId);

      localStorage.setItem(
        'videoUploadSession',
        JSON.stringify({
          uploadId,
          fileName: selectedFile.name,
          knowledgebaseId: kbId,
        })
      );

      // Step 3: Upload chunks (0% -> 50%)
      const etags = await uploadAllPartsApi(
        initData.parts,
        selectedFile,
        initData.chunkSize,
        initData.totalParts,
        0,
        (partsUploaded, totalParts, pct) => {
          setUploadProgress(pct);
          setProgressStage(`Uploading… ${partsUploaded}/${totalParts} parts (${pct}%)`);
        },
        abortController.signal
      );

      // Step 4: Complete upload
      setUploadProgress(52);
      setProgressStage('Finalising upload…');
      await completeVideoUploadApi(uploadId, etags, authToken);

      // Step 5: Poll for jobId
      setProgressStage('Starting AI processing…');
      const jobId = await pollForJobIdApi(uploadId, authToken);

      // Save jobId in session
      localStorage.setItem(
        'videoUploadSession',
        JSON.stringify({
          uploadId,
          fileName: selectedFile.name,
          knowledgebaseId: kbId,
          jobId,
        })
      );

      // Step 6: Stream progress via SSE (52% -> 100%)
      await streamProgressApi(
        jobId,
        authToken,
        (pct, stageMsg) => {
          setUploadProgress(pct);
          setProgressStage(stageMsg);
        },
        () => {
          localStorage.removeItem('videoUploadSession');
          toast({
            title: `Video "${selectedFile.name}" uploaded and trained successfully`,
            status: 'success',
            isClosable: true,
          });
          if (onFinish) onFinish();
          notifyFinishListeners(kbId);
        },
        readerRef
      );
    } catch (error: any) {
      if (error.message === 'Upload cancelled') {
        toast({ title: 'Upload cancelled', status: 'info', isClosable: true });
      } else {
        toast({
          title: error?.message || 'Video processing failed',
          status: 'error',
          isClosable: true,
        });
      }
    } finally {
      setIsVideoUploading(false);
      setUploadProgress(0);
      setProgressStage('');
      setCurrentUploadId(null);
      setCurrentKbId(null);
      setCurrentFileName(null);
      abortControllerRef.current = null;
    }
  };

  const confirmResume = async (
    selectedFileForResume: File,
    authToken: string,
    onFinish?: () => void
  ) => {
    if (!resumePrompt) return;

    if (selectedFileForResume.name !== resumePrompt.fileName) {
      toast({
        title: `Please select the original file: "${resumePrompt.fileName}"`,
        status: 'warning',
        isClosable: true,
      });
      return;
    }

    const savedResume = resumePrompt;
    const targetKbId = savedResume.knowledgebaseId || '';
    setResumePrompt(null);
    setIsVideoUploading(true);
    setCurrentUploadId(savedResume.uploadId);
    setCurrentKbId(targetKbId);
    setCurrentFileName(savedResume.fileName);
    setUploadProgress(0);
    setProgressStage('Resuming upload…');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const allPartsNums = Array.from({ length: savedResume.totalParts }, (_, i) => i + 1);
      const pendingNums = allPartsNums.filter((n) => !savedResume.completedParts.has(n));

      let newEtags: { partNumber: number; etag: string }[] = [];

      if (pendingNums.length > 0) {
        const refreshData = await refreshPresignedUrlsApi(
          savedResume.uploadId,
          pendingNums,
          authToken
        );

        const chunkSize = 10 * 1024 * 1024;
        newEtags = await uploadAllPartsApi(
          refreshData.parts,
          selectedFileForResume,
          chunkSize,
          savedResume.totalParts,
          savedResume.completedParts.size,
          (partsUploaded, totalParts, pct) => {
            setUploadProgress(pct);
            setProgressStage(`Uploading… ${partsUploaded}/${totalParts} parts (${pct}%)`);
          },
          abortController.signal
        );
      }

      const existingEtags = savedResume.uploadedParts.map((p) => ({
        partNumber: p.partNumber,
        etag: p.etag,
      }));

      const allEtags = [...existingEtags, ...newEtags].sort(
        (a, b) => a.partNumber - b.partNumber
      );

      setUploadProgress(52);
      setProgressStage('Finalising upload…');
      await completeVideoUploadApi(savedResume.uploadId, allEtags, authToken);

      setProgressStage('Starting AI processing…');
      const jobId = await pollForJobIdApi(savedResume.uploadId, authToken);

      localStorage.setItem(
        'videoUploadSession',
        JSON.stringify({
          uploadId: savedResume.uploadId,
          fileName: selectedFileForResume.name,
          knowledgebaseId: targetKbId,
          jobId,
        })
      );

      await streamProgressApi(
        jobId,
        authToken,
        (pct, stageMsg) => {
          setUploadProgress(pct);
          setProgressStage(stageMsg);
        },
        () => {
          localStorage.removeItem('videoUploadSession');
          toast({
            title: `Video "${selectedFileForResume.name}" uploaded and trained successfully`,
            status: 'success',
            isClosable: true,
          });
          if (onFinish) onFinish();
          if (targetKbId) notifyFinishListeners(targetKbId);
        },
        readerRef
      );
    } catch (err: any) {
      if (err.message === 'Upload cancelled') {
        toast({ title: 'Resume cancelled', status: 'info', isClosable: true });
      } else {
        toast({
          title: err?.message || 'Resume upload failed',
          status: 'error',
          isClosable: true,
        });
      }
    } finally {
      setIsVideoUploading(false);
      setUploadProgress(0);
      setProgressStage('');
      setCurrentUploadId(null);
      setCurrentKbId(null);
      setCurrentFileName(null);
      abortControllerRef.current = null;
    }
  };

  const dismissResume = async (authToken: string) => {
    if (resumePrompt) {
      await abortVideoUploadApi(resumePrompt.uploadId, authToken);
      setResumePrompt(null);
      toast({ title: 'Previous upload session dismissed', status: 'info', isClosable: true });
    }
  };

  const cancelUpload = async (authToken: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch {}
    }
    if (currentUploadId) {
      await abortVideoUploadApi(currentUploadId, authToken);
    }
    setIsVideoUploading(false);
    setUploadProgress(0);
    setProgressStage('Upload cancelled.');
    setCurrentUploadId(null);
    setCurrentKbId(null);
    setCurrentFileName(null);
  };

  const getCornerStyles = (): React.CSSProperties => {
    const margin = '20px';
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 99999,
      transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
    };

    switch (widgetCorner) {
      case 'top-left':
        return { ...base, top: margin, left: margin };
      case 'bottom-right':
        return { ...base, bottom: margin, right: margin };
      case 'bottom-left':
        return { ...base, bottom: margin, left: margin };
      case 'top-right':
      default:
        return { ...base, top: margin, right: margin };
    }
  };

  const shouldShowFloatingWidget =
    isVideoUploading && (!activeMountedKbId || String(currentKbId) !== String(activeMountedKbId));

  return (
    <VideoUploadContext.Provider
      value={{
        isVideoUploading,
        uploadProgress,
        progressStage,
        currentUploadId,
        currentKbId,
        currentFileName,
        resumePrompt,
        activeMountedKbId,
        widgetCorner,
        setWidgetCorner,
        reportKbMounted,
        startVideoUpload,
        confirmResume,
        dismissResume,
        cancelUpload,
        registerOnFinishListener,
      }}
    >
      {children}

      {/* Sleek Floating Progress Bar Widget with Corner Switcher */}
      {shouldShowFloatingWidget && (
        <Box
          style={getCornerStyles()}
          boxShadow="0 10px 25px -5px rgba(0, 0, 0, 0.16), 0 8px 10px -6px rgba(0, 0, 0, 0.08)"
          borderRadius="xl"
          bg="rgba(255, 255, 255, 0.97)"
          backdropFilter="blur(10px)"
          px={3.5}
          py={2.5}
          minW="250px"
          maxW="290px"
          border="1px solid"
          borderColor="blue.200"
          userSelect="none"
        >
          {/* Header Row */}
          <Flex justify="space-between" align="center" mb={1}>
            <HStack spacing={2} align="center" maxW="180px">
              <Box
                w="7px"
                h="7px"
                borderRadius="full"
                bg="blue.500"
                boxShadow="0 0 0 2px rgba(66, 153, 225, 0.3)"
              />
              <Text fontSize="12px" fontWeight="700" color="gray.800" isTruncated maxW="150px">
                {currentFileName || 'Video Upload'}
              </Text>
            </HStack>

            <HStack spacing={1}>
              <IconButton
                aria-label="Switch Corner"
                icon={<FiMove />}
                size="xs"
                variant="ghost"
                colorScheme="gray"
                fontSize="11px"
                h="22px"
                w="22px"
                minW="22px"
                onClick={cycleCorner}
                title={`Current corner: ${widgetCorner} (click to cycle corner)`}
              />
              {uploadProgress <= 50 ? (
                <Button
                  size="xs"
                  colorScheme="red"
                  variant="ghost"
                  fontSize="11px"
                  h="22px"
                  px={1.5}
                  fontWeight="600"
                  onClick={() => {
                    const t = getAuthToken();
                    if (t) cancelUpload(t);
                  }}
                >
                  Cancel
                </Button>
              ) : (
                <Badge colorScheme="blue" variant="subtle" fontSize="9px" px={1.5} borderRadius="full">
                  AI
                </Badge>
              )}
            </HStack>
          </Flex>

          {/* Stage text & Percentage */}
          <Flex justify="space-between" align="center" mb={1}>
            <Text fontSize="11px" fontWeight="500" color="gray.600" isTruncated maxW="190px">
              {progressStage}
            </Text>
            <Text fontSize="11px" fontWeight="700" color="blue.600">
              {uploadProgress}%
            </Text>
          </Flex>

          {/* Micro Progress Bar */}
          <Progress
            value={uploadProgress}
            size="xs"
            colorScheme="blue"
            borderRadius="full"
            hasStripe
            isAnimated
          />
        </Box>
      )}
    </VideoUploadContext.Provider>
  );
};

import {
  Box,
  Flex,
  Text,
  Heading,
  Button,
  Input,
  IconButton,
  useToast,
  HStack,
  Spinner,
  Image,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogCloseButton,
} from "@chakra-ui/react";
import style from "../VoiceAssistant/Campaign/CreateCampaign.module.scss";
import { useCallback, useEffect, useRef, useState } from "react";
import { callApi } from "../../services/callApi";
import nookies from "nookies";
import { isVideoFile } from "../../services/videoUploadService";
import { useVideoUpload } from "../context/VideoUploadContext";

const KnowledgeBase = ({ kbId }: any) => {
  const [uploadedFiles, setuploadedFiles] = useState<any[]>([]);
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<any>(null);

  const lastToastRef = useRef<{ title: string; status?: string; time: number; id: string } | null>(null);

  const showLimitedToast = useCallback(
    (options: any) => {
      if (!options || (!options.title && options.title !== '')) return;

      let titleString = '';
      if (typeof options.title === 'string') {
        titleString = options.title.trim();
      } else if (options.title) {
        titleString = String(options.title).trim();
      }

      if (!titleString || titleString === 'undefined') {
        titleString = options.status === 'error' ? 'An unexpected error occurred.' : 'Notification';
      }

      const now = Date.now();
      const status = options.status || 'info';

      const lastToast = lastToastRef.current;
      const isSameMessage =
        lastToast &&
        lastToast.title === titleString &&
        lastToast.status === status;

      const isCurrentlyActive = lastToast?.id ? toast.isActive(lastToast.id) : false;

      if (isSameMessage && isCurrentlyActive && now - lastToast.time < 3500) {
        return;
      }

      toast.closeAll();

      const newToastId =
        options.id ||
        `toast-${status}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      lastToastRef.current = {
        title: titleString,
        status,
        time: now,
        id: newToastId,
      };

      toast({
        duration: 4000,
        isClosable: true,
        ...options,
        id: newToastId,
        title: titleString,
      });
    },
    [toast]
  );

  const [fileToDelete, setFileToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isDocUploading, setIsDocUploading] = useState(false);
  const [docUploadProgress, setDocUploadProgress] = useState(0);
  const [docUploadStage, setDocUploadStage] = useState('');

  const cookies = nookies.get();
  const token = cookies.accesstoken;

  const {
    isVideoUploading,
    uploadProgress,
    progressStage,
    currentKbId,
    currentFileName,
    resumePrompt,
    reportKbMounted,
    startVideoUpload,
    confirmResume,
    dismissResume,
    cancelUpload,
    registerOnFinishListener,
  } = useVideoUpload();

  useEffect(() => {
    if (kbId) {
      reportKbMounted(String(kbId), true);
      return () => {
        reportKbMounted(String(kbId), false);
      };
    }
  }, [kbId, reportKbMounted]);

  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpg",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/csv",
  ];

  const DOC_MAX_SIZE = 50 * 1024 * 1024; // 50 MB

  const fetctuploadedfile = async () => {
    try {
      const response = await callApi(
        `/knowledgebase/importers/documents/${kbId}`,
        "get",
        null
      );
      setuploadedFiles(response.data || []);
    } catch (error: any) {
      showLimitedToast({
        title: `${error?.response?.data?.message || error?.response?.data?.error || "Failed to fetch files"}`,
        status: "error",
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    if (kbId) {
      fetctuploadedfile();
      const unregister = registerOnFinishListener(kbId, fetctuploadedfile);
      return () => unregister();
    }
  }, [kbId]);

  const handleFileSelect = async (e: any) => {
    if (isLoading || isVideoUploading) return;

    const selected = e.target.files[0];
    if (!selected) return;

    // If resume prompt is active for this KB and user selects file
    if (resumePrompt) {
      await confirmResume(selected, token, fetctuploadedfile);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const isVideo = isVideoFile(selected);

    if (!isVideo && !allowedTypes.includes(selected.type)) {
      const docExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.csv'];
      const extMatch = selected.name.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
      if (!docExtensions.includes(ext)) {
        showLimitedToast({
          title: "Unsupported file type. Supported documents: pdf, docx, csv, jpeg, png and video formats: MP4, MOV, WebM, AVI, MKV, MPEG, MPG, 3GP.",
          status: "error",
          isClosable: true,
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    if (!isVideo) {
      if (selected.size > DOC_MAX_SIZE) {
        showLimitedToast({
          title: "File exceeds the 50 MB limit.",
          status: "error",
          isClosable: true,
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (selected.size === 0) {
        showLimitedToast({
          title: "File is empty.",
          status: "error",
          isClosable: true,
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    if (isVideo) {
      await startVideoUpload(selected, kbId, token, fetctuploadedfile);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // ---------- DOCUMENT / PDF PATH ----------
    try {
      setIsDocUploading(true);
      setDocUploadProgress(50);
      setDocUploadStage(`Uploading ${selected.name}…`);

      const formData = new FormData();
      formData.append("file", selected);
      formData.append("knowledgebaseId", kbId);

      const isPdf = selected.type === "application/pdf" || selected.name.toLowerCase().endsWith('.pdf');
      const response: any = await callApi(
        `/knowledgebase/importers/${isPdf ? "pdf" : "document"}`,
        "post",
        formData
      );

      if (response?.error || response?.statusCode >= 400 || response?.success === false) {
        throw new Error(response?.error || response?.message || "Upload failed");
      }

      setDocUploadProgress(100);
      setDocUploadStage(`Saving & updating list…`);

      await fetctuploadedfile();
      if (fileInputRef.current) fileInputRef.current.value = "";

      showLimitedToast({
        title: `${response?.message || response?.data?.message || "File uploaded successfully"}`,
        status: "success",
        isClosable: true,
      });
    } catch (error: any) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      showLimitedToast({
        title: `${error?.response?.data?.message || error?.response?.data?.error || error?.message || "Upload failed"}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsDocUploading(false);
      setDocUploadProgress(0);
      setDocUploadStage('');
    }
  };

  const confirmDelete = async () => {
    if (!kbId || !fileToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      const response = await callApi(
        `/knowledgebase/${kbId}/datastore/${fileToDelete.id}`,
        "delete",
        null
      );
      showLimitedToast({
        title: `${response?.message || "File deleted successfully"}`,
        status: "success",
        isClosable: true,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFileToDelete(null);
      await fetctuploadedfile();
    } catch (error: any) {
      showLimitedToast({
        title: `${error?.response?.data?.error || error?.message || "Failed to delete file"}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isUploadingThisKb = Boolean(
    isVideoUploading &&
    currentKbId &&
    String(currentKbId) === String(kbId)
  );
  const isUploadingAny = isLoading || isVideoUploading || isDocUploading;

  const displayUploadedFiles = (uploadedFiles || []).filter((fileItem: any) => {
    if (isUploadingThisKb && fileItem.type === 'VIDEO') {
      if (currentFileName && fileItem.title === currentFileName) return false;
      const itemTime = new Date(fileItem.createdAt || 0).getTime();
      if (Date.now() - itemTime < 5 * 60 * 1000) return false;
    }
    return true;
  });

  return (
    <Box>
      <Heading fontSize="20px" mb="24px" fontWeight="600">
        Knowledge Base Documents
      </Heading>
      <Box position={"relative"}>
        {/* Loader spinner overlay for document/PDF loading */}
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={22}
          display={isLoading ? "block" : "none"}
        >
          <Spinner size="lg" color="blue.500" />
        </Box>

        {/* Resume prompt alert */}
        {resumePrompt && String(resumePrompt.knowledgebaseId) === String(kbId) && (
          <Alert status="info" borderRadius="md" mb={4} flexDirection={{ base: "column", sm: "row" }} gap={2}>
            <AlertIcon />
            <Box flex="1">
              <AlertTitle fontSize="14px">Unfinished upload detected!</AlertTitle>
              <AlertDescription fontSize="13px">
                An unfinished upload session was found for <strong>{resumePrompt.fileName}</strong>. Select the file below to resume.
              </AlertDescription>
            </Box>
            <HStack spacing={2} mt={{ base: 2, sm: 0 }}>
              <Button
                size="xs"
                colorScheme="blue"
                onClick={() => fileInputRef.current?.click()}
                isDisabled={isUploadingAny}
              >
                Select File & Resume
              </Button>
              <Button
                size="xs"
                variant="outline"
                colorScheme="red"
                onClick={() => token && dismissResume(token)}
                isDisabled={isUploadingAny}
              >
                Discard
              </Button>
            </HStack>
          </Alert>
        )}

        <Flex gap="20px">
          <Box w="100%" mb={5}>
            <Text fontSize="14px" fontWeight="500" color={'#212529'} mb={1}>
              Document Upload
            </Text>
            <Text fontSize="14px" mb={2}>
              Supported File:{" "}
              <Text as="span" color="#2977FF" fontWeight="400">
                pdf, docx, csv, jpeg, png & Supported Video Formats: MP4, MOV, WebM, AVI, MKV, MPEG, MPG, 3GP (Max 50MB docs / 2GB video)
              </Text>
            </Text>

            {/* File Input - Strictly disabled during loading or uploading */}
            <Box style={{ pointerEvents: isUploadingAny ? "none" : "auto", opacity: isUploadingAny ? 0.6 : 1 }}>
              <Input
                type="file"
                ref={fileInputRef}
                accept=".pdf, .docx, .csv, .jpeg, .jpg, .png, .mp4, .mov, .webm, .avi, .mkv, .mpeg, .mpg, .3gp"
                className={style.fileInput}
                onChange={handleFileSelect}
                height="35px"
                borderColor="#CED4DA"
                fontWeight={400}
                fontSize={'14px'}
                color={'#6C757D'}
                disabled={isUploadingAny}
              />
            </Box>

            {/* Document upload progress bar */}
            {isDocUploading && (
              <Box mt={3} p={3} borderWidth="1px" borderRadius="md" borderColor="#E2E8F0" bg="#F7FAFC">
                <Flex justify="space-between" align="center" mb={2}>
                  <Text fontSize="13px" fontWeight="500" color="#2D3748">
                    {docUploadStage}
                  </Text>
                </Flex>
                <Progress
                  size="sm"
                  colorScheme="blue"
                  borderRadius="md"
                  hasStripe
                  isAnimated
                  isIndeterminate
                />
              </Box>
            )}

            {/* Video upload progress bar in KnowledgeBase page for this KB */}
            {isUploadingThisKb && (
              <Box mt={3} p={3} borderWidth="1px" borderRadius="md" borderColor="#E2E8F0" bg="#F7FAFC">
                <Flex justify="space-between" align="center" mb={2}>
                  <Text fontSize="13px" fontWeight="500" color="#2D3748">
                    {progressStage}
                  </Text>
                  {uploadProgress <= 50 && (
                    <Button
                      size="xs"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => token && cancelUpload(token)}
                    >
                      Cancel Upload
                    </Button>
                  )}
                </Flex>
                <Progress
                  value={uploadProgress}
                  size="sm"
                  colorScheme="blue"
                  borderRadius="md"
                  hasStripe
                  isAnimated
                />
                <Text fontSize="12px" color="#6C757D" mt={1} textAlign="right">
                  {uploadProgress}%
                </Text>
              </Box>
            )}

            {/* Previous File Section */}
            {displayUploadedFiles?.length > 0 && (
              <>
                {displayUploadedFiles?.map((file: any, index: any) => {
                  return (
                    <Flex key={file?._id || index} justify="space-between" my={2} align="start">
                      <Box>
                        <Text display={"flex"} alignItems={"center"} fontWeight={400} fontSize="14px" color="#6C757D">
                          {file?.type === "PDF" ? (
                            <Image src="/icons/pdf-icon.svg" alt="pdf icon" width="16px" height="16px" mr={1} />
                          ) : file?.type === "VIDEO" ? (
                            <Box mr={1}>
                              <svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 18V6C0 4.34315 1.34315 3 3 3H21C22.6569 3 24 4.34315 24 6V18C24 19.6569 22.6569 21 21 21H3C1.34315 21 0 19.6569 0 18ZM10.1859 7.6397C9.95732 7.47641 9.65662 7.45457 9.40681 7.58313C9.15701 7.71168 9 7.96906 9 8.25V15.75C9 16.0309 9.15701 16.2883 9.40681 16.4169C9.65662 16.5454 9.95732 16.5236 10.1859 16.3603L15.4359 12.6103C15.633 12.4695 15.75 12.2422 15.75 12C15.75 11.7578 15.633 11.5305 15.4359 11.3897L10.1859 7.6397Z" fill="#2977FF" />
                              </svg>
                            </Box>
                          ) : (
                            <Image src="/icons/imgicon.svg" alt="doc icon" width="16px" height="16px" mr={1} />
                          )}
                          <Text as={'span'} fontWeight={400} fontSize="14px" style={{ color: "#6C757D" }}>
                            {file.title || file?._id}
                          </Text>
                        </Text>
                        <HStack spacing={3} mt={1}>
                          <Text display={"flex"} gap={"4px"} alignItems={"center"} fontSize="12px" color="#6C757D">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#6C757D"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {file?.createdAt
                              ? new Date(file?.createdAt).toLocaleDateString("en-US", {
                                  month: "2-digit",
                                  day: "2-digit",
                                  year: "numeric",
                                })
                              : "NA"}
                          </Text>
                          <Text display={"flex"} gap={"4px"} alignItems={"center"} fontSize="12px" color="#6C757D">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6C757D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {file?.createdAt
                              ? new Date(file?.createdAt).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : "NA"}
                          </Text>
                        </HStack>
                      </Box>

                      <IconButton
                        icon={
                          <svg width="13" height="15" viewBox="0 0 13 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.5 -0.00195312C7.76522 -0.00195312 8.02047 0.103479 8.20801 0.291016C8.39543 0.478437 8.49987 0.733007 8.5 0.998047H12C12.2652 0.998047 12.5205 1.10348 12.708 1.29102C12.8954 1.47844 12.9999 1.73301 13 1.99805V2.99805C13 3.26326 12.8955 3.51852 12.708 3.70605C12.5205 3.89359 12.2652 3.99805 12 3.99805H11.5V12.998C11.5 13.5285 11.2901 14.038 10.915 14.4131C10.54 14.7882 10.0304 14.998 9.5 14.998H3.5C2.96974 14.9979 2.4609 14.788 2.08594 14.4131C1.71086 14.038 1.5 13.5285 1.5 12.998V3.99805H1C0.73496 3.99792 0.480391 3.89347 0.292969 3.70605C0.105432 3.51852 0 3.26326 0 2.99805V1.99805C0.000127991 1.733 0.105546 1.47844 0.292969 1.29102C0.480391 1.10359 0.734958 0.998175 1 0.998047H4.5C4.50013 0.733005 4.60555 0.478438 4.79297 0.291016C4.98039 0.103593 5.23496 -0.00182513 5.5 -0.00195312H7.5ZM2.5 4.05762V12.998C2.5 13.2633 2.60543 13.5185 2.79297 13.7061C2.98039 13.8935 3.23496 13.9979 3.5 13.998H9.5C9.76522 13.998 10.0205 13.8936 10.208 13.7061C10.3955 13.5185 10.5 13.2633 10.5 12.998V4.05762L10.3828 3.99805H2.61816L2.5 4.05762ZM4 5.49805C4.13261 5.49805 4.26072 5.55076 4.35449 5.64453C4.44814 5.73818 4.49987 5.86562 4.5 5.99805V11.998C4.5 12.1307 4.44826 12.2588 4.35449 12.3525C4.26072 12.4463 4.13261 12.498 4 12.498C3.86757 12.4979 3.74014 12.4462 3.64648 12.3525C3.55272 12.2588 3.5 12.1307 3.5 11.998V5.99805C3.50013 5.86561 3.55283 5.73819 3.64648 5.64453C3.74014 5.55088 3.86757 5.49817 4 5.49805ZM6.5 5.49805C6.63261 5.49805 6.76072 5.55076 6.85449 5.64453C6.94814 5.73818 6.99987 5.86562 7 5.99805V11.998C7 12.1307 6.94826 12.2588 6.85449 12.3525C6.76072 12.4463 6.63261 12.498 6.5 12.498C6.36757 12.4979 6.24014 12.4462 6.14648 12.3525C6.05272 12.2588 6 12.1307 6 11.998V5.99805C6.00013 5.86561 6.05283 5.73819 6.14648 5.64453C6.24014 5.55088 6.36757 5.49817 6.5 5.49805ZM9 5.49805C9.13261 5.49805 9.26072 5.55076 9.35449 5.64453C9.44814 5.73818 9.49987 5.86562 9.5 5.99805V11.998C9.5 12.1307 9.44826 12.2588 9.35449 12.3525C9.26072 12.4463 9.13261 12.498 9 12.498C8.86757 12.4979 8.74014 12.4462 8.64648 12.3525C8.55272 12.2588 8.5 12.1307 8.5 11.998V5.99805C8.50013 5.86561 8.55283 5.73819 8.64648 5.64453C8.74014 5.55088 8.86757 5.49817 9 5.49805ZM1 1.99805V2.99805H12V1.99805H1Z" fill="#DC3545" />
                          </svg>
                        }
                        aria-label="delete file"
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        isDisabled={isDeleting || isUploadingAny || Boolean(fileToDelete)}
                        onClick={() => {
                          if (!isDeleting && !fileToDelete) {
                            setFileToDelete({ id: file?._id, title: file?.title || file?._id });
                          }
                        }}
                      />
                    </Flex>
                  );
                })}
              </>
            )}
          </Box>
        </Flex>
      </Box>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        isOpen={Boolean(fileToDelete)}
        leastDestructiveRef={cancelRef}
        onClose={() => !isDeleting && setFileToDelete(null)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="md">
            <AlertDialogHeader fontSize="lg" fontWeight="600">
              Delete File
            </AlertDialogHeader>
            <AlertDialogCloseButton isDisabled={isDeleting} />

            <AlertDialogBody fontSize="14px" color="#4A5568">
              Are you sure you want to delete{" "}
              <Text as="span" fontWeight="600" color="#2D3748">
                "{fileToDelete?.title}"
              </Text>
              ? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                size="sm"
                onClick={() => setFileToDelete(null)}
                isDisabled={isDeleting}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                onClick={confirmDelete}
                isLoading={isDeleting}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default KnowledgeBase;

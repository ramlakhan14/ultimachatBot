import * as React from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Text,
  VStack,
  Table,
  Thead,
  Tr,
  Td,
  Tbody,
  Th,
  Select,
  TableContainer,
  InputGroup,
  InputLeftElement,
  Input,
  useToast,
  Image,
  SimpleGrid,
  Badge,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  Tooltip,
} from "@chakra-ui/react";
import { Link, useHistory, useParams } from "react-router-dom";
import Folder from "../../components/Icons/campaign/folder.svg";
import { IoIosSearch } from "react-icons/io";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import { getCampaignDetails, getAllLeads, pauseCampaign } from "../../services/emailCampaigns";
import ErrorImg from "../../components/Icons/campaign/error.svg";
import { RiDownloadFill } from "react-icons/ri";
import { callApi } from "../../services/callApi";
import { format } from "date-fns";
import SummaryModal from "../AllLeads/SummaryModal";
import { baseURL } from "../../config";
import axios from "axios";
import SvgExport from "../EmailAssistantAdmin/AllMail/SvgExport";
import styles from "../EmailAssistantAdmin/AllMail/AllMail.module.scss";

const statusBadgeColor = (status: string) => {
  return status === "sent" ? "#1987541A" : "#FEE2E2";
};

const statusTextColor = (status: string) => {
  return status === "sent" ? "#198754" : "#991B1B";
};

const StatCard = ({ label, count, icon }: any) => (
  <Box
    flex="1"
    minW="180px"
    borderRadius="lg"
    bg={'#fff'}
    p={4}
    boxShadow="sm"
    display="flex"
    alignItems="center"
    gap={'12px'}
    mt={6}
    pos={'relative'}
    className={styles.emailAssistantFolder}
  >
    <Box>
      <Image src={icon} alt="image" />
    </Box>
    <Box>
      <Text fontSize="24px" fontWeight="500" color="#1A202C">
        {count}
      </Text>
      <Text fontSize="12" color="#6C757D" fontWeight="400">
        {label}
      </Text>
    </Box>
    <Box pos={'absolute'} right={0} top={0}>
      <SvgExport />
    </Box>
  </Box>
);

const InboundDetails = () => {
  const [InboundData, setInboundData] = React.useState<any>(null);
  const [callsLogsList, setcallsLogsList] = React.useState<any>({
    data: [
      {
        phone: "+918192903788",
        botNumber: "+17347962922",
        status: "Success",
        callType: "Incoming",
        duration: "8 Min: 5 Sec",
        voice: "Listen Recording",
        date: "22-07-2025, 12:54",
      },
      {
        phone: "+919205068453",
        botNumber: "+17347962922",
        status: "Success",
        callType: "Incoming",
        duration: "N/A",
        voice: "N/A",
        date: "22-07-2025, 12:46",
      },
      {
        phone: "+17347962922",
        botNumber: "+17347962922",
        status: "Failed",
        callType: "Incoming",
        duration: "N/A",
        voice: "N/A",
        date: "22-07-2025, 12:24",
      },
      {
        phone: "+918546001170",
        botNumber: "+17347962922",
        status: "Success",
        callType: "Incoming",
        duration: "1 Min: 15 Sec",
        voice: "Listen Recording",
        date: "22-07-2025, 12:09",
      },
      {
        phone: "+918958894608",
        botNumber: "+17347962922",
        status: "Failed",
        callType: "Incoming",
        duration: "N/A",
        voice: "Listen Recording",
        date: "22-07-2025, 12:06",
      },
      {
        phone: "+919205068453",
        botNumber: "+17347962922",
        status: "Transferred",
        callType: "Incoming",
        duration: "N/A",
        voice: "N/A",
        date: "22-07-2025, 12:06",
      },
    ]
  });
  const [searchValue, setSearchValue] = React.useState('');
  const [statusValue, setStatus] = React.useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = React.useState<number>(10);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [isOpened, setIsOpened] = React.useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = React.useState<any>({});

  const toast = useToast();
  const history = useHistory();
  const { id: inboundId } = useParams<{ id: string }>();

  // console.log("id", inboundId);


  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchValue]);

  React.useEffect(() => {
    if (debouncedSearchValue !== searchValue) return;
    setCurrentPage(1);
  }, [debouncedSearchValue]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page + 1);
  };



  const handleItemsPerPageChange = (e: any) => {
    const newItemsPerPage = parseInt(e.target.value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const handleInputChange = (e: any) => {
    const newSearchValue = e.target.value;
    setSearchValue(newSearchValue);
  };
  const fetchCallsLogs = React.useCallback(async () => {
    if (!inboundId) return;
    setIsLoading(true);
    try {

      const res = await callApi(`/inbound-bot/inbound-calls/${inboundId}?page=${currentPage || 1}&limit=${itemsPerPage}&status=${statusValue || ""}&search=${debouncedSearchValue || ""}`, "get", "");
      setcallsLogsList(res.data);
      setTotalCount(res.data?.total || 0);
      setCurrentPage(res.data?.page || 0);
      setItemsPerPage(res.data?.limit || 0);
      // setto(res.data?.limit || 0);
    } catch (err: any) {
      // console.error("Error fetching leads:", err); // Debug log
      toast({
        title: err?.response?.data?.message || "Error fetching leads",
        status: "error",
        isClosable: true
      });
      // Reset data on error
      setcallsLogsList([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [inboundId, currentPage, itemsPerPage, debouncedSearchValue, statusValue, toast]);


  // Fixed: Fetch campaign details separately
  const fetchDetails = async () => {
    if (!inboundId) return;
    try {
      const response = await callApi(`/inbound-bot/details/${inboundId}`, "get", "");
      setInboundData(response.data);
    } catch (error: any) {
      // console.error("Error fetching campaign details:", error); // Debug log
      toast({
        title: error?.response?.data?.message || "Error fetching campaign details",
        status: "error",
        isClosable: true,
      });
    }
  };
  React.useEffect(() => {
    fetchDetails();
  }, [inboundId]);

  // Fixed: Fetch leads when dependencies change
  React.useEffect(() => {
    fetchCallsLogs();
  }, [fetchCallsLogs]);


  const onClose = () => {
    setIsOpened(false);
  };

  const onClosePause = () => {
    setIsOpen(false);
  }

  // Calculate forcePage for PaginatorTwo (0-based)
  const forcePage = currentPage - 1;
  const totalPages = Math.ceil(totalCount / itemsPerPage);


  const getStatusColor = (status: string) => {
    switch (status) {
      case "Success":
        return { color: "green.600", bg: "green.100" };
      case "Failed":
        return { color: "red.600", bg: "red.100" };
      case "Transferred":
        return { color: "#2977FF", bg: "purple.100" };
      default:
        return { color: "gray.600", bg: "gray.100" };
    }
  };


  const downloadFilterData = async (fd: any) => {
    try {
      const response: any = await axios.get(`${baseURL}inbound-bot/download-csv?botId=${inboundId}`);
      const fileBuffer = response?.data?.fileBuffer
      const byteArray = new Uint8Array(fileBuffer.data);

      // Create a Blob (MIME type for Excel)
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      // Create a download link
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `call-logs`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch (error) {
      // console.error("Error fetching leads:", error);
    }
  }


  const voiceOptions = [
    {
      value: "es-ES-IsidoraMultilingualNeural",
      label: "Isidora multilingual : Female (Es-es)",
    },
    {
      value: "fr-FR-VivienneMultilingualNeural",
      label: "Vivienne multilingual : Female (Fr-fr)",
    },
    {
      value: "en-US-AndrewMultilingualNeural",
      label: "Andrew Multilingual : Male (En-us)",
    },
    {
      value: "en-GB-OllieMultilingualNeural",
      label: "Ollie Multilingual : Male (En-gb)",
    },
    {
      value: "zh-CN-XiaoyuMultilingualNeural",
      label: "Xiaoyu Multilingual : Female (Zh-cn)",
    },
    {
      value: "fr-FR-RemyMultilingualNeural",
      label: "Remy Multilingual : Male (Fr-fr)",
    },
  ];

  const selectedVoiceLabel =
    voiceOptions.find(
      (item) => item.value === InboundData?.voiceCharacter
    )?.label || "-";


  return (
    <>
      <Box
        w="100%"
        p="6"
        shadow="sm"
        h="100%"
        position="relative"
        overflow="auto"
      >
        <VStack w="100%" spacing="10">
          <Flex
            shrink={0}
            w="100%"
            direction="column"
            justifyContent="space-between"
          >
            <Flex width="100%" justifyContent="space-between">
              <Box>
                <Heading as="h2" fontSize="16px" color="#2977FF">
                  <Link to={`/app/inbound-voice-calls`}><Text as="span">Inbound VoiceBot</Text>
                  </Link> / <Text as="span" color="#6C757D" textTransform="capitalize">{InboundData?.botName}</Text>
                </Heading>
              </Box>
              <Box>
              </Box>
            </Flex>
          </Flex>
        </VStack>

        <VStack w="100%" spacing="10">
          <Flex width="100%" alignItems={"center"} py={0} my={0} justifyContent="space-between" gap={2} flexWrap={"wrap"}>
            <Box mt={6}>
              <Heading fontSize="24px" display={'flex'} alignItems={'center'} color="#1A202C">
                <Text as="span" textTransform="capitalize">{InboundData?.botName}</Text>
                <Badge
                  color={
                    InboundData?.status === 'completed' ? '#198754' :
                      InboundData?.status === 'paused' ? '#F59E0B' :
                        InboundData?.status === 'initiated' ? '#0D9488' :
                          InboundData?.status === 'failed' ? '#991B1B' :
                            InboundData?.status === 'running' ? '#1E40AF' :
                              '#4B5563'
                  }
                  bg={
                    InboundData?.status === 'completed' ? '#1987541A' :
                      InboundData?.status === 'paused' ? '#FDE68A' :
                        InboundData?.status === 'initiated' ? '#CCFBF1' :
                          InboundData?.status === 'failed' ? '#FEE2E2' :
                            InboundData?.status === 'running' ? '#DBEAFE' :
                              '#E5E7EB'
                  }
                  ml={3}
                  fontSize="10px"
                  textTransform="capitalize"
                  px="6px"
                  py="3px"
                  borderRadius="50px"
                  fontWeight="500"
                >
                  {InboundData?.status}
                </Badge>

                <Text as="span" display={'flex'} alignItems={'center'} gap={1} color="#888888" fontSize="12px" fontWeight={400} ml={3}>
                  <Image src={Folder} alt="folder icon" boxSize="16px" />
                  {InboundData?.campaignProject?.projectName}
                </Text>
              </Heading>
            </Box>

          </Flex>
        </VStack>

        <Flex gap={4} wrap="wrap">
          {InboundData && (
            <>
              <StatCard label="Total Inbound Calls" count={InboundData.totalCalls} icon={"/icons/inboundcall.svg"} />
              <StatCard label="Success Calls" count={InboundData.successCalls} icon={"/icons/successCalls.svg"} />
              <StatCard label="Failed Calls" count={InboundData.failedCalls} icon={"/icons/fieldCalls.svg"} />
            </>
          )}
        </Flex>

        <Box mt={6}>
          <Flex justifyContent="start" gap="20px" mb={4} alignItems="center">
            <Heading fontSize="18px" maxW={"200px"} color="#1A202C" >
              Assistant Details
            </Heading>
            <Button
              p={'5px 10px'}
              fontWeight={500}
              display={"flex"}
              alignItems="center"
              borderRadius={"4px"}
              gap={2}
              colorScheme="blue"
              fontSize="16px"
              sx={{
                _focus: {
                  boxShadow: 'none',
                }
              }}
              onClick={() => {
                history.push(`/app/inbound-voice-calls/edit/${inboundId}`)
              }}
            >
              <Image src={"/icons/editwhite.svg"} alt="Edit" boxSize="18px" />
              Edit Assistant
            </Button>
          </Flex>

          <Box bg={'white'} p={"16px"} borderRadius="md" boxShadow="sm">
            <SimpleGrid columns={[1, 2, 3]} spacingY={4}>
              {InboundData && (
                <>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Assistant Name</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{InboundData?.botName || ""}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Voice Character</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{selectedVoiceLabel || ""}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Purpose</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{InboundData?.botPurpose || ""}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Project Name</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{InboundData.campaignProject?.projectName || "-"}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Tone To Voice</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{InboundData.toneOfVoice}</Text>
                  </Box>
                  {/* <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Language</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{InboundData.maxEmailsPerDay}</Text>
                  </Box> */}
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Base Prompt</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{InboundData.prompt?.substring(0, 50) || "-"}...</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Phone Number For Inbound</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{InboundData?.phoneNumber || "-"}</Text>
                  </Box>
                  {/* <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Call To Action (CTA)</Text>
                    <Text fontSize="14px" color="#888888">Test</Text>
                  </Box> */}

                </>
              )}
            </SimpleGrid>
          </Box>
        </Box>

        <VStack minW="100%" w="600px" mt={2}>
          <Flex mt={6} width="100%" alignItems={"center"} py={0} justifyContent="space-between" gap={2} flexWrap={"wrap"}>
            <Box >
              <Heading fontSize="18px" color="#1A202C">Incoming Call Logs</Heading>
            </Box>
            <Flex align="center" gap={4} flexWrap="wrap">
              <Box>
                <Select
                  width="200px"
                  bg="#fff"
                  color="#6C757D"
                  borderRadius="4px"
                  value={statusValue}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="Success">Success</option>
                  <option value="Failed">Failed</option>
                  <option value="Transferred">Transferred</option>
                </Select>
              </Box>

              <Box >
                <InputGroup
                  width="250px"
                  borderRadius="4px"
                  // borderColor="#6C757D"
                  bg={"#fff"}
                >
                  <InputLeftElement pointerEvents="none">
                    <IoIosSearch color="#6C757D" />
                  </InputLeftElement>
                  <Input
                    type="text"
                    placeholder="Search"
                    color="#6C757D"
                    value={searchValue}
                    onChange={handleInputChange}
                  />
                </InputGroup>
              </Box>

              {/* <Button
                p={'5px 10px'}
                fontWeight={500}
                display={"flex"}
                alignItems="center"
                borderRadius={"4px"}
                gap={2}
                colorScheme="blue"
                fontSize="16px"
                sx={{
                  _focus: {
                    boxShadow: 'none',
                  }
                }}
                onClick={downloadFilterData}
              >
                <RiDownloadFill size={16} />
                Download As Csv
              </Button> */}
            </Flex>
          </Flex>

        </VStack>
        <Box minW="100%" w="600px">
          <TableContainer
            mt="20px"
            w="100%"
            maxH="calc(100vh - 230px)"
            border="1px solid #E2E8F0"
            borderRadius="8px"
            overflowY="auto"
            boxShadow="sm"
            sx={{
              "::-webkit-scrollbar": {
                display: "none",
              },
            }}
          >
            <Table variant="simple" fontSize="14px">
              <Thead bg="#e3f3ff" position="sticky" top={0} zIndex={1}>
                <Tr>
                  <Th>#</Th>
                  <Th>Incoming Phone Number</Th>
                  <Th>Bot Number</Th>
                  <Th>Status</Th>
                  {/* <Th>Call Type</Th> */}
                  <Th>Duration</Th>
                  <Th>Voice Records</Th>
                  <Th>Date</Th>
                  {/* <Th>Call Summary</Th> */}
                </Tr>
              </Thead>
              <Tbody bg="#fff">
                {isLoading ? (
                  <Tr>
                    <Td colSpan={9} textAlign="center" py={8}>
                      <Spinner size="lg" />
                    </Td>
                  </Tr>
                ) : callsLogsList?.data?.length > 0 ? (
                  callsLogsList?.data?.map((item: any, index: any) => {
                    const colors = getStatusColor(item.status);
                    return (
                      <Tr key={index}>
                        <Td>{(currentPage - 1) * itemsPerPage + index + 1}</Td>
                        <Td>
                          <Box display="flex" alignItems="center" gap="6px">
                            <Image src="/icons/ic-phone.svg" alt="call icon" boxSize="16px" />
                            <Text color={"#888888"}>{item.phoneNumber}</Text>
                          </Box>
                        </Td>
                        <Td color={"#888888"}>
                          <Box display="flex" alignItems="center" gap="6px">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="rgb(136, 136, 136)" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8.5 1.5C8.5 1.36739 8.44732 1.24021 8.35355 1.14645C8.25979 1.05268 8.13261 1 8 1C7.86739 1 7.74021 1.05268 7.64645 1.14645C7.55268 1.24021 7.5 1.36739 7.5 1.5V2H5.5C5.10218 2 4.72064 2.15804 4.43934 2.43934C4.15804 2.72064 4 3.10218 4 3.5V6.5C4 6.89782 4.15804 7.27936 4.43934 7.56066C4.72064 7.84196 5.10218 8 5.5 8H10.5C10.8978 8 11.2794 7.84196 11.5607 7.56066C11.842 7.27936 12 6.89782 12 6.5V3.5C12 3.10218 11.842 2.72064 11.5607 2.43934C11.2794 2.15804 10.8978 2 10.5 2H8.5V1.5ZM5 3.5C5 3.36739 5.05268 3.24021 5.14645 3.14645C5.24021 3.05268 5.36739 3 5.5 3H10.5C10.6326 3 10.7598 3.05268 10.8536 3.14645C10.9473 3.24021 11 3.36739 11 3.5V6.5C11 6.63261 10.9473 6.75979 10.8536 6.85355C10.7598 6.94732 10.6326 7 10.5 7H5.5C5.36739 7 5.24021 6.94732 5.14645 6.85355C5.05268 6.75979 5 6.63261 5 6.5V3.5ZM4 11C4 10.8674 4.05268 10.7402 4.14645 10.6464C4.24021 10.5527 4.36739 10.5 4.5 10.5H11.5C11.6326 10.5 11.7598 10.5527 11.8536 10.6464C11.9473 10.7402 12 10.8674 12 11V11.35C12 12.297 11.594 12.926 10.923 13.344C10.222 13.781 9.203 14 8 14C6.805 14 5.786 13.782 5.082 13.344C4.408 12.925 4 12.295 4 11.35V11ZM4.5 9.5C4.10218 9.5 3.72064 9.65804 3.43934 9.93934C3.15804 10.2206 3 10.6022 3 11V11.35C3 12.655 3.6 13.6 4.554 14.193C5.479 14.768 6.71 15 8 15C9.297 15 10.528 14.769 11.452 14.193C12.406 13.6 13 12.653 13 11.35V11C13 10.6022 12.842 10.2206 12.5607 9.93934C12.2794 9.65804 11.8978 9.5 11.5 9.5H4.5ZM7.25 5C7.25 5.19891 7.17098 5.38968 7.03033 5.53033C6.88968 5.67098 6.69891 5.75 6.5 5.75C6.30109 5.75 6.11032 5.67098 5.96967 5.53033C5.82902 5.38968 5.75 5.19891 5.75 5C5.75 4.80109 5.82902 4.61032 5.96967 4.46967C6.11032 4.32902 6.30109 4.25 6.5 4.25C6.69891 4.25 6.88968 4.32902 7.03033 4.46967C7.17098 4.61032 7.25 4.80109 7.25 5ZM9.5 5.75C9.69891 5.75 9.88968 5.67098 10.0303 5.53033C10.171 5.38968 10.25 5.19891 10.25 5C10.25 4.80109 10.171 4.61032 10.0303 4.46967C9.88968 4.32902 9.69891 4.25 9.5 4.25C9.30109 4.25 9.11032 4.32902 8.96967 4.46967C8.82902 4.61032 8.75 4.80109 8.75 5C8.75 5.19891 8.82902 5.38968 8.96967 5.53033C9.11032 5.67098 9.30109 5.75 9.5 5.75Z" fill="rgb(136, 136, 136)" />
                            </svg>
                            <Text color="#888888">
                              {item?.botNumber || "N/A"} </Text>

                          </Box>
                          {/* {item.botNumber} */}
                        </Td>
                        <Td>
                          <Badge
                            color={colors.color}
                            bg={colors.bg}
                            textTransform="capitalize"
                            fontSize="12px"
                            px="8px"
                            py="2px"
                            borderRadius="50px"
                            fontWeight="500"
                          >
                            {item.status}
                          </Badge>
                        </Td>
                        {/* <Td>
                          <Box display="flex" alignItems="center" gap="6px">
                            <Image src="/icons/ic-bot.svg" alt="incoming icon" boxSize="16px" />
                            <Text color={"#888888"}>{item.callType}</Text>
                          </Box>
                        </Td> */}
                        <Td>{item.callDuration || "N/A"}</Td>
                        <Td>
                          <Flex alignItems={"center"} gap="8px">
                            <Tooltip label={"Play Recording"} fontSize={'10px'}>
                              <Button
                                size="sm"
                                p="4px 8px"
                                disabled={item?.recordingUrl ? false : true}
                                sx={{
                                  _focus: {
                                    outline: "none"
                                  }
                                }}
                                onClick={() => {
                                  console.log(item);
                                  setShowSummaryModal({ ...item, voiceBotRecordingURL: `${baseURL}voicebot/stream-recording/${item?._id}`, type: "voicebot" })
                                }}
                              >
                                <Image src={`/icons/ic-play.svg`} alt='icon' boxSize="16px" />

                              </Button>
                            </Tooltip>
                            <Text color={"#888888"}>Listen Recording</Text>

                          </Flex>

                        </Td>
                        <Td color={"#888888"}>{item?.createdAt ? format(new Date(item?.createdAt || ""), 'dd/MM/yyyy, hh:mm a') : "N/A"}</Td>

                        {/* <Td color="#888888">
                          <Tooltip title="View Summary" >
                            <Button bg="transparent" onClick={() => {
                              setShowSummaryModal({ ...item, type: "email" })
                            }}  >
                              <Image src="/icons/i-icon.svg" alt="summary icon" boxSize="16px" mr={2} />
                            </Button>
                          </Tooltip>
                        </Td> */}
                      </Tr>
                    );
                  })
                ) : (
                  <Tr>
                    <Td colSpan={9} textAlign="center" py={8}>
                      <Text color="#888888">No data found</Text>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>

        {totalPages > 1 && (
          <HStack w="100%" justifyContent="space-between" py={4}>
            <Flex alignItems="center">
              <Text mr="8px" fontSize="16px" color="#212529">
                Total {totalCount} items
              </Text>

              <PaginatorTwo
                forcePage={forcePage}
                onPageChange={handlePageChange}
                pageRangeDisplayed={5}
                pageCount={totalPages}
              />

            </Flex>
            <Select value={itemsPerPage} onChange={handleItemsPerPageChange} width="auto" bg={"#fff"} color="#6C757D">
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </Select>
          </HStack>
        )}
      </Box>

      <Modal
        isCentered
        onClose={onClose}
        isOpen={isOpen}
      >
        <ModalOverlay />
        <ModalContent>
          {/* <ModalHeader>Modal Title</ModalHeader> */}
          <ModalBody>
            <Box
              textAlign="center"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            >
              <Image src={ErrorImg} alt='deleteicon' w="56px" h="56px" />
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Are you sure?</Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">You want to Pause this campaign?</Text>
            </Box>

          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={() => { }} fontWeight={"500"}>
              Yes
            </Button>
            <Button colorScheme="blue" mr={3} onClick={onClosePause}
            >
              <Text as="span" ms="4px" fontSize="16px" >No</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <SummaryModal isOpen={showSummaryModal} title={"Call Summary"} onClose={() => { setShowSummaryModal({}) }} />

    </>
  );
}

export default InboundDetails;
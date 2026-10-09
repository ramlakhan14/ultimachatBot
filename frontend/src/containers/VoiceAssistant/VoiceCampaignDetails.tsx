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
  Modal,
  ModalHeader,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  Image,
  SimpleGrid,
  Badge,
  ModalCloseButton,
  Spinner,
  Tooltip,
} from "@chakra-ui/react";
import { Link, useHistory, useParams } from "react-router-dom";
import Edit from "../../components/Icons/campaign/edit.svg";
import Pause from "../../components/Icons/campaign/pause.svg";
import Folder from "../../components/Icons/campaign/folder.svg";
import NotAnswered from "../../components/Icons/campaign/not-answered.svg";
import SuccessCall from "../../components/Icons/campaign/success-call.svg";
import TotalCall from "../../components/Icons/campaign/total-call.svg";
import LeadGenrated from "../../components/Icons/campaign/leadgenrated.svg";
import Busy from "../../components/Icons/campaign/busy.svg";
import CallConnected from "../../components/Icons/campaign/callconected.svg";
import notConnected from "../../components/Icons/campaign/notconnected.svg";
import { baseURL } from "../../config";
import { IoIosSearch } from "react-icons/io";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import { getAllLeads, getCampaignDetails } from "../../services/emailCampaigns";
import { campaignDetails, pauseCampaign, resumeCampaign } from "../../services/VoiceBot";
import { callApi } from "../../services/callApi";
import SummaryModal from "../AllLeads/SummaryModal";
import { format } from "date-fns";
import SvgExport from "../EmailAssistantAdmin/AllMail/SvgExport";
import styles from "../EmailAssistantAdmin/AllMail/AllMail.module.scss";


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
    mt={'24px'}
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

const VoiceCampaignDetails = () => {
  const toast = useToast();
  const history = useHistory();
  const [searchValue, setSearchValue] = React.useState('');
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = React.useState<number>(10);
  const [openPromptModal, setOpenPromptModal] = React.useState<boolean>(false);
  const [campaignData, setCampaignData] = React.useState<any>(null);
  const [leadList, setLeadList] = React.useState<any[]>([]);

  const [totalCount, setTotalCount] = React.useState<any>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [pauseModal, setPauseModal] = React.useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = React.useState<any>({});
  // console.log("Campaign Data", campaignData);
  // console.log("Lead List", leadList);
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { id: campaignId } = useParams<{ id: string }>();
  const handleOpenCloseModal = () => {
    setOpenPromptModal(!openPromptModal);
  }

  const fetchCampaignDetails = async () => {
    if (!campaignId) return;
    try {
      const response = await campaignDetails(campaignId);
      setCampaignData(response.data.data);
    } catch (error: any) {
      // console.error("Error fetching campaign details:", error); // Debug log
      toast({
        title: error?.response?.data?.message || "Error fetching campaign details",
        status: "error",
        isClosable: true,
      });
    }
  };


  const handleYesClick = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // const response = await resumeCampaign(campaignData._id);

      const response = campaignData?.status?.toLowerCase() === 'paused' ? await resumeCampaign(campaignData._id) : await pauseCampaign(campaignId);

      toast({
        title: `${response?.data?.message}`,
        status: "success",
        isClosable: true,
      })
      setPauseModal(false);
      fetchCampaignDetails();
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    } finally {
      setIsSubmitting(false);
    }

  }

  // console.log("campaignData", campaignData?.timeZone);

  const formattedDate = campaignData?.scheduledAt
    ? new Date(campaignData.scheduledAt)
      .toLocaleString("en-IN", {
        timeZone: campaignData?.timeZone || "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit", // ✅ better consistency
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", " -")
      .replace(/am|pm/i, (match) => match.toUpperCase()) // ✅ AM/PM uppercase
    : "N/A";


  const timeZone = campaignData?.timeZone || "UTC";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);

    return `${date.toLocaleDateString('en-GB', {
      timeZone
    })} ${date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone
    })}`;
  };

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
      (item) => item.value === campaignData?.voiceCharacter
    )?.label || "-";

  const details = [
    { label: 'Voice Character', value: selectedVoiceLabel },
    { label: 'Max Call Per Day', value: campaignData?.maxPerDayCall },
    { label: 'Scheduled At', value: formattedDate || "N/A" },
    {
      label: 'Target Audience', value:
        campaignData?.targetAudience?.map((item: any) => item?.name || item?.value).join(', ') || "N/A"
    },
    {
      label: 'Pain Point / Problem', value:
        campaignData?.painPointSolution?.map((item: any) => item?.painPoint || item?.value).join(', ') || 'N/A'
    },
    {
      label: 'Solution / Offer', value:
        campaignData?.painPointSolution?.map((item: any) => item?.solution || item?.value).join(', ') || 'N/A'
    },
    {
      label: 'Base Prompt',
      value: campaignData?.prompt.substring(0, 80) + "...",
      isCustomRender: true, // custom render flag
    },
    { label: 'Language', value: campaignData?.language?.toUpperCase() || "N/A" },
    {
      label: 'Phone Number For This Campaign', value:
        campaignData?.phoneNumbers?.map((item: any) => item?.phoneNumber).join(', ')
    },
    {
      label: 'Custom Question #', value: [
        campaignData?.customQuestions?.firstQuestion && `Question#1: ${campaignData.customQuestions.firstQuestion}`,
        campaignData?.customQuestions?.secondQuestion && `Question#2: ${campaignData.customQuestions.secondQuestion}`,
        campaignData?.customQuestions?.thirdQuestion && `Question#3: ${campaignData.customQuestions.thirdQuestion}`,
      ]
        .filter(Boolean) // remove false/null/undefined
        .join(', ') || '-'
    },
  ];


  const stats = [
    {
      label: 'Total Calls',
      count: campaignData?.totalCalls || 0,
      icon: TotalCall
    },
    {
      label: 'Lead Generated',
      count: campaignData?.leadGenerated || 0,
      icon: LeadGenrated
    },
    {
      label: 'Call Connected',
      // label: 'Success Calls',
      count: campaignData?.connectedCalls || 0,
      icon: CallConnected
      // icon: SuccessCall
    },

    {
      label: 'Not Answered',
      count: campaignData?.customerDidNotAnswer || 0,
      icon: NotAnswered
    },
    {
      label: 'Not Connected',
      count: campaignData?.notConnected || 0,
      icon: notConnected
    },
    {
      label: 'Busy',
      count: campaignData?.customerBusy || 0,
      icon: Busy
    },
  ];

  React.useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timerId);
    };
  }, [searchValue]);

  const fetchLeads = React.useCallback(async () => {
    // console.log("Fetching leads...", campaignId);

    setIsLoading(true);
    try {
      const offset = currentPage;
      // console.log("Fetching leads with:", { itemsPerPage, offset, searchValue: debouncedSearchValue.trim(), campaignId, currentPage }); // Debug log
      // const res = await getAllLeads(itemsPerPage, offset, debouncedSearchValue.trim(), campaignId);
      const path = `/voicebot/campaign-phone-recordings/${campaignId || ""}?page=${currentPage}&limit=${itemsPerPage || ""}&search=${debouncedSearchValue || ""}`
      const res = await callApi(path, "get", "")
      // console.log("API Response:", res); // Debug log

      setLeadList(res.data.recordings || []);
      setTotalCount(res.data?.total || 0);
    } catch (err: any) {
      // console.error("Error fetching leads:", err); // Debug log
      toast({
        title: err?.response?.data?.message || "Error fetching leads",
        status: "error",
        isClosable: true
      });
      // Reset data on error
      setLeadList([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, currentPage, itemsPerPage, debouncedSearchValue, toast]);


  React.useEffect(() => {

    fetchCampaignDetails();
  }, [campaignId, toast]);

  React.useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);


  const handlePageChange = (page: number) => {
    let pages: number = page + 1;
    setCurrentPage(pages);
    setForcePage(page);
  };
  const handleItemsPerPageChange = (event: any) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
    setForcePage(0);
  };

  const handleInputChange = (event: any) => {
    setSearchValue(event.target.value); // Update state with the input value
  };

  // Calculate forcePage for PaginatorTwo (0-based)
  // const forcePage = currentPage - 1;
  const totalPages = Math.ceil(totalCount / itemsPerPage);



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
                  <Link to={`/app/voice-campaign`}><Text as="span">VoiceBot Campaign</Text>
                  </Link> / <Text as="span" color="#6C757D">{campaignData?.campaignName}</Text>
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
                <Text>
                  {campaignData?.campaignName}
                </Text>
                {/* background-color: #FEF9C3;
  color: #854D0E; */}
                <Badge
                  color={
                    campaignData?.status?.toLowerCase() === 'completed' ? '#198754' :
                      campaignData?.status?.toLowerCase() === 'paused' ? '#F59E0B' :
                        campaignData?.status?.toLowerCase() === 'initiated' ? '#0D9488' :
                          campaignData?.status?.toLowerCase() === 'failed' ? '#991B1B' :
                            campaignData?.status?.toLowerCase() === 'running' ? '#1E40AF' :
                              campaignData?.status?.toLowerCase() === 'scheduled' ? '#854D0E' :
                                '#4B5563'
                  }
                  bg={
                    campaignData?.status?.toLowerCase() === 'completed' ? '#1987541A' :
                      campaignData?.status?.toLowerCase() === 'paused' ? '#FDE68A' :
                        campaignData?.status?.toLowerCase() === 'initiated' ? '#CCFBF1' :
                          campaignData?.status?.toLowerCase() === 'failed' ? '#FEE2E2' :
                            campaignData?.status?.toLowerCase() === 'running' ? '#DBEAFE' :
                              campaignData?.status?.toLowerCase() === 'scheduled' ? '#FEF9C3' :
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
                  {campaignData?.status}
                </Badge>

                <Text as="span" display={'flex'} alignItems={'center'} gap={1} color="#888888" fontSize="12px" fontWeight={400} ml={3}>
                  <Image src={Folder} alt="folder icon" boxSize="16px" />
                  {campaignData?.campaignProject?.projectName}
                </Text>
              </Heading>
            </Box>
            <Box mt={6} display="flex" alignItems="center" gap={'12px'}>
              <Button
                p={'6px 12px'}
                fontWeight={500}
                display={"flex"}
                alignItems="center"
                borderRadius={"4px"}
                disabled={campaignData?.status?.toLowerCase() === 'running' ? false : !(campaignData?.status?.toLowerCase() === 'paused')}
                // disabled={(campaignData?.status !== 'initiated') || (campaignData?.status == 'running')}
                onClick={() => {
                  setPauseModal(true)
                }}
                gap={2}

              >
                <Image src={Pause} alt="Edit" boxSize="20px" />
                {
                  campaignData?.status?.toLowerCase() === 'running' ? "Pause " : campaignData?.status?.toLowerCase() === 'paused' ? "Resume " : "Pause "
                }
                Campaign
              </Button>
              <Button
                display={"flex"}
                alignItems="center"
                gap={2}
                colorScheme="blue"
                borderRadius={"4px"}
                p={'6px 12px'}
                fontWeight={500}
                size="md"
                disabled={(campaignData?.status?.toLowerCase() == 'completed')}

                className="btn-hover-pri"
                onClick={() => {
                  history.push(`/app/voice-campaign/edit/${campaignId}`)
                }}
              >
                <Image src={Edit} alt="Edit" width="18px" />
                Edit Campaign
              </Button>
            </Box>
          </Flex>
        </VStack>

        <Flex gap={4} wrap="wrap">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </Flex>

        <Box mt={'24px'}>
          <Heading fontSize="18px" color="#1A202C" mb={4}>
            Campaign Details
          </Heading>

          <Box bg={'white'} mt={'16px'} p={"16px"} borderRadius="8px" boxShadow="sm">
            <SimpleGrid columns={[1, 2, 3]} spacingY={4}>
              {details.map((item: any, idx: any) => (
                <Box key={idx}>
                  <Box fontWeight="600" fontSize="14px" color="#4F4F4F" display="flex" alignItems="center" gap="6px">
                    {item.label}
                    {item.label === "Base Prompt" && (
                      <Image src="/icons/outgoing.svg" maxW="20px" alt="arrow-right" role="button" onClick={handleOpenCloseModal} />
                    )}
                  </Box>
                  <Text whiteSpace="pre-line" fontSize="14px" textTransform={"capitalize"} color="#888888">
                    {/* {item.value} */}
                    {item.label === "Base Prompt" ? item?.value?.replace(/\\n/g, "\n") : item.value}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        </Box>

        <VStack w="100%" spacing="10">
          <Flex width="100%" alignItems={"center"} py={0} my={0} justifyContent="space-between" gap={2} flexWrap={"wrap"}>
            <Box mt={'24px'}>
              <Heading fontSize="18px" color="#1A202C">Phone List</Heading>
            </Box>
            <Box mt={'24px'}>
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
                  placeholder="Search number "
                  color="#6C757D"
                  value={searchValue}
                  onChange={handleInputChange}
                />
              </InputGroup>
            </Box>
          </Flex>
        </VStack>
        <Box minW="100%" w="600px" >
          <TableContainer
            mt="16px"
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
                  <Th>Phone Number</Th>
                  <Th>Bot Number</Th>
                  {/* <Th>Call Type</Th> */}
                  <Th>Call Status</Th>
                  <Th>Duration</Th>
                  <Th>Voice Records</Th>
                  <Th>Date</Th>
                </Tr>
              </Thead>
              <Tbody bg={"#fff"}>
                {isLoading ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={8}>
                      <Spinner display={'flex'} alignItems={'center'} justifyContent={'center'} margin={'auto'} marginTop={'50px'} marginBottom={'50px'} />
                    </Td>
                  </Tr>
                ) : leadList && leadList.length > 0 ? (
                  leadList.map((item: any, index: any) => (
                    <Tr key={index}>
                      <Td>{(currentPage - 1) * itemsPerPage + index + 1}</Td>
                      <Td minW={"170px"}>
                        {
                          item?.phoneNumber == "" || item?.phoneNumber == "N/A" || item?.phoneNumber == null ? "N/A" :
                            <Box display="flex" alignItems="center" gap="6px">
                              <Image src="/icons/ic-phone.svg" alt="email icon" boxSize="16px" />
                              <Text color={"#888888"} textTransform="lowercase">{item?.phoneNumber || "N/A"}</Text>
                            </Box>

                        }
                      </Td>
                      <Td minW={"170px"}>
                        {
                          item?.botNumber == "" || item?.botNumber == "N/A" || item?.botNumber == null ? "N/A" :
                            <Box display="flex" alignItems="center" gap="6px">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="rgb(136, 136, 136)" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8.5 1.5C8.5 1.36739 8.44732 1.24021 8.35355 1.14645C8.25979 1.05268 8.13261 1 8 1C7.86739 1 7.74021 1.05268 7.64645 1.14645C7.55268 1.24021 7.5 1.36739 7.5 1.5V2H5.5C5.10218 2 4.72064 2.15804 4.43934 2.43934C4.15804 2.72064 4 3.10218 4 3.5V6.5C4 6.89782 4.15804 7.27936 4.43934 7.56066C4.72064 7.84196 5.10218 8 5.5 8H10.5C10.8978 8 11.2794 7.84196 11.5607 7.56066C11.842 7.27936 12 6.89782 12 6.5V3.5C12 3.10218 11.842 2.72064 11.5607 2.43934C11.2794 2.15804 10.8978 2 10.5 2H8.5V1.5ZM5 3.5C5 3.36739 5.05268 3.24021 5.14645 3.14645C5.24021 3.05268 5.36739 3 5.5 3H10.5C10.6326 3 10.7598 3.05268 10.8536 3.14645C10.9473 3.24021 11 3.36739 11 3.5V6.5C11 6.63261 10.9473 6.75979 10.8536 6.85355C10.7598 6.94732 10.6326 7 10.5 7H5.5C5.36739 7 5.24021 6.94732 5.14645 6.85355C5.05268 6.75979 5 6.63261 5 6.5V3.5ZM4 11C4 10.8674 4.05268 10.7402 4.14645 10.6464C4.24021 10.5527 4.36739 10.5 4.5 10.5H11.5C11.6326 10.5 11.7598 10.5527 11.8536 10.6464C11.9473 10.7402 12 10.8674 12 11V11.35C12 12.297 11.594 12.926 10.923 13.344C10.222 13.781 9.203 14 8 14C6.805 14 5.786 13.782 5.082 13.344C4.408 12.925 4 12.295 4 11.35V11ZM4.5 9.5C4.10218 9.5 3.72064 9.65804 3.43934 9.93934C3.15804 10.2206 3 10.6022 3 11V11.35C3 12.655 3.6 13.6 4.554 14.193C5.479 14.768 6.71 15 8 15C9.297 15 10.528 14.769 11.452 14.193C12.406 13.6 13 12.653 13 11.35V11C13 10.6022 12.842 10.2206 12.5607 9.93934C12.2794 9.65804 11.8978 9.5 11.5 9.5H4.5ZM7.25 5C7.25 5.19891 7.17098 5.38968 7.03033 5.53033C6.88968 5.67098 6.69891 5.75 6.5 5.75C6.30109 5.75 6.11032 5.67098 5.96967 5.53033C5.82902 5.38968 5.75 5.19891 5.75 5C5.75 4.80109 5.82902 4.61032 5.96967 4.46967C6.11032 4.32902 6.30109 4.25 6.5 4.25C6.69891 4.25 6.88968 4.32902 7.03033 4.46967C7.17098 4.61032 7.25 4.80109 7.25 5ZM9.5 5.75C9.69891 5.75 9.88968 5.67098 10.0303 5.53033C10.171 5.38968 10.25 5.19891 10.25 5C10.25 4.80109 10.171 4.61032 10.0303 4.46967C9.88968 4.32902 9.69891 4.25 9.5 4.25C9.30109 4.25 9.11032 4.32902 8.96967 4.46967C8.82902 4.61032 8.75 4.80109 8.75 5C8.75 5.19891 8.82902 5.38968 8.96967 5.53033C9.11032 5.67098 9.30109 5.75 9.5 5.75Z" fill="rgb(136, 136, 136)" />
                              </svg>
                              <Text color="#888888">
                                {item?.botNumber || "N/A"} </Text>

                            </Box>
                        }
                      </Td>
                      <Td color={"#888888"}>
                        {/* <Box display="flex" alignItems="center" gap="6px">
                        <Image src="/icons/ic-outgoing.svg" alt="email icon" boxSize="16px" />
                        <Text textTransform="lowercase">{item?.Call Status || "NA"}</Text>
                      </Box> */}
                        {
                          item?.status == "" || item?.status == "N/A" || item?.status == null ? "N/A" :
                            <Box display="flex" alignItems="center" gap="6px" minW="150px">

                              {(() => {
                                const status = item?.status;

                                if (status === "Call connected") {
                                  return (
                                    <>
                                      <Image src="/icons/call-connected.svg" boxSize="16px" />
                                      <Text color="888888" >Call Connected</Text>
                                    </>
                                  );
                                }

                                if (status === "Customer did not answer") {
                                  return (
                                    <>
                                      {/* red icon */}
                                      <svg width="20" height="9" viewBox="0 0 20 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 0C10.4883 0 11.0059 0.0260417 11.5527 0.078125C12.0996 0.130208 12.6562 0.211589 13.2227 0.322266C13.7891 0.432943 14.3457 0.576172 14.8926 0.751953C15.4395 0.927734 15.9733 1.13607 16.4941 1.37695C17.015 1.61784 17.487 1.89779 17.9102 2.2168C18.3333 2.53581 18.7207 2.89062 19.0723 3.28125C19.3522 3.61328 19.5768 3.97461 19.7461 4.36523C19.9154 4.75586 20 5.17578 20 5.625V6.875C20 7.13542 19.9512 7.37956 19.8535 7.60742C19.7559 7.83529 19.6224 8.03385 19.4531 8.20312C19.2839 8.3724 19.0853 8.50586 18.8574 8.60352C18.6296 8.70117 18.3854 8.75 18.125 8.75H15.625C15.3646 8.75 15.1204 8.70117 14.8926 8.60352C14.6647 8.50586 14.4661 8.3724 14.2969 8.20312C14.1276 8.03385 13.9941 7.83529 13.8965 7.60742C13.7988 7.37956 13.75 7.13542 13.75 6.875V5.625C13.75 5.45573 13.6882 5.30924 13.5645 5.18555C13.4408 5.06185 13.2943 5 13.125 5H6.875C6.70573 5 6.55924 5.06185 6.43555 5.18555C6.31185 5.30924 6.25 5.45573 6.25 5.625V6.875C6.25 7.13542 6.20117 7.37956 6.10352 7.60742C6.00586 7.83529 5.8724 8.03385 5.70312 8.20312C5.53385 8.3724 5.33529 8.50586 5.10742 8.60352C4.87956 8.70117 4.63542 8.75 4.375 8.75H1.875C1.61458 8.75 1.37044 8.70117 1.14258 8.60352C0.914714 8.50586 0.716146 8.3724 0.546875 8.20312C0.377604 8.03385 0.244141 7.83529 0.146484 7.60742C0.0488281 7.37956 0 7.13542 0 6.875V5.625C0 5.18229 0.0846354 4.76562 0.253906 4.375C0.423177 3.98438 0.647786 3.61979 0.927734 3.28125C1.25977 2.89062 1.64388 2.53906 2.08008 2.22656C2.51628 1.91406 2.99154 1.63411 3.50586 1.38672C4.02018 1.13932 4.55078 0.93099 5.09766 0.761719C5.64453 0.592448 6.20443 0.449219 6.77734 0.332031C7.35026 0.214844 7.90365 0.130208 8.4375 0.078125C8.97135 0.0260417 9.49219 0 10 0ZM18.75 5.625C18.75 5.28646 18.6686 4.96745 18.5059 4.66797C18.3431 4.36849 18.138 4.0918 17.8906 3.83789C17.6432 3.58398 17.3665 3.35938 17.0605 3.16406C16.7546 2.96875 16.4714 2.79622 16.2109 2.64648C15.7552 2.4056 15.2734 2.19727 14.7656 2.02148C14.2578 1.8457 13.7337 1.70247 13.1934 1.5918C12.653 1.48112 12.1159 1.39648 11.582 1.33789C11.0482 1.2793 10.5208 1.25 10 1.25C9.48568 1.25 8.95833 1.27604 8.41797 1.32812C7.8776 1.38021 7.34049 1.46484 6.80664 1.58203C6.27279 1.69922 5.75195 1.8457 5.24414 2.02148C4.73633 2.19727 4.2513 2.4056 3.78906 2.64648C3.52214 2.78971 3.23893 2.95898 2.93945 3.1543C2.63997 3.34961 2.36654 3.57422 2.11914 3.82812C1.87174 4.08203 1.66341 4.35872 1.49414 4.6582C1.32487 4.95768 1.24349 5.27995 1.25 5.625V6.875C1.25 7.04427 1.31185 7.19076 1.43555 7.31445C1.55924 7.43815 1.70573 7.5 1.875 7.5H4.375C4.54427 7.5 4.69076 7.43815 4.81445 7.31445C4.93815 7.19076 5 7.04427 5 6.875V5.625C5 5.36458 5.04883 5.12044 5.14648 4.89258C5.24414 4.66471 5.3776 4.46615 5.54688 4.29688C5.71615 4.1276 5.91471 3.99414 6.14258 3.89648C6.37044 3.79883 6.61458 3.75 6.875 3.75H13.125C13.3854 3.75 13.6296 3.79883 13.8574 3.89648C14.0853 3.99414 14.2839 4.1276 14.4531 4.29688C14.6224 4.46615 14.7559 4.66471 14.8535 4.89258C14.9512 5.12044 15 5.36458 15 5.625V6.875C15 7.04427 15.0618 7.19076 15.1855 7.31445C15.3092 7.43815 15.4557 7.5 15.625 7.5H18.125C18.2943 7.5 18.4408 7.43815 18.5645 7.31445C18.6882 7.19076 18.75 7.04427 18.75 6.875V5.625Z" fill="#CB4B4B"></path></svg>

                                      <Text color="888888" >Not Answered</Text>
                                    </>
                                  );
                                }

                                if (status === "Lead generated") {
                                  return (
                                    <>
                                      <Image src="/icons/lead-gen.svg" boxSize="16px" />
                                      <Text color="888888" >Lead Generated</Text>
                                    </>
                                  );
                                }

                                if (status === "Customer busy") {
                                  return (
                                    <>
                                      <Image src="/icons/busy-icon.svg" boxSize="16px" />
                                      <Text color="888888" >Busy</Text>
                                    </>
                                  );
                                }

                                return (
                                  <>
                                    <Image src="/icons/busy-icon.svg" boxSize="16px" />
                                    <Text color="888888">N/A</Text>
                                  </>
                                );
                              })()}
                            </Box>
                        }
                        {/* {item?.callType || "NA"} */}
                      </Td>
                      <Td color={"#888888"}>
                        {/* <Badge
                        // color={statusTextColor(item?.emailStatus)}
                        // bg={statusBadgeColor(item?.emailStatus)}
                        textTransform="capitalize"
                        fontSize="12px"
                        px="8px"
                        py="2px"
                        borderRadius="50px"
                        fontWeight="500"
                      >
                        {item?.callDuration || "NA"}
                      </Badge> */}
                        {item?.callDuration || "N/A"}
                      </Td>
                      <Td color={"#888888"}>
                        {
                          (item?.recordingUrl == "" || item?.recordingUrl == "N/A" || item?.recordingUrl == null) ? "N/A" :
                            (

                              <Flex alignItems={"center"} gap={"8px"}>
                                <Tooltip label={"Play Recording"} fontSize={'10px'}>
                                  <Button
                                    size="sm"
                                    p="4px 8px"
                                    onClick={() => {
                                      setShowSummaryModal({ ...item, voiceBotRecordingURL: `${baseURL}voicebot/stream-recording/${item?._id}`, type: "voicebot" })
                                    }}
                                  >
                                    <Image src={`/icons/ic-play.svg`} alt='icon' />

                                  </Button>
                                </Tooltip>
                                <Text>Listen Recording</Text>

                              </Flex>
                            )
                        }
                      </Td>
                      <Td color={"#888888"}>{
                        item?.createdAt ? formatDate(item?.createdAt) : "N/A"
                        // format(new Date(item?.createdAt), 'dd/MM/yyyy, hh:mm a')
                      }</Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={8}>
                      <Text color="#888888">No data found</Text>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </TableContainer>
          {
            totalCount > 10 &&
            <HStack w="100%" justifyContent="space-between" py={4}>
              <Flex alignItems="center">
                <Text mr="8px" fontSize="16px" color="#212529">
                  Total {totalCount} items
                </Text>
                {/* {totalPages > 1 && ( */}
                <PaginatorTwo
                  forcePage={forcePage}
                  onPageChange={handlePageChange}
                  pageRangeDisplayed={5}
                  pageCount={totalPages}
                />
                {/* )} */}
              </Flex>
              <Select value={itemsPerPage} onChange={handleItemsPerPageChange} width="auto" bg={"#fff"} color="#6C757D">
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </Select>
            </HStack>
          }

        </Box>
      </Box>
      <Modal
        onClose={handleOpenCloseModal}
        isOpen={openPromptModal}
      // closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Base Prompt</ModalHeader>
          <ModalCloseButton sx={{
            _focus: {
              boxShadow: 'none',
            },
          }} />
          <ModalBody>
            <Text as="p" fontSize="14px" mb="8px" mt="10px">
              {campaignData?.prompt ? campaignData?.prompt?.replace(/\\n/g, "\n") : ""}
            </Text>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal
        isCentered
        onClose={() => {
          setPauseModal(false);
        }}
        isOpen={pauseModal}
        closeOnOverlayClick={false}
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
              <Image src={"/icons/error.svg"} alt='deleteicon' w="56px" h="56px" />
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">Are you sure?</Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">You want to {campaignData?.status?.toLowerCase() == 'paused' ? "Resume " : "Pause "} this campaign?</Text>
            </Box>

          </ModalBody>
          <ModalFooter>
            <Button mr={3} fontWeight={"500"} onClick={() => {
              // setPauseModal(false);
              handleYesClick()


            }} isLoading={isSubmitting}
              isDisabled={isSubmitting} >
              Yes
            </Button>
            <Button colorScheme="blue" fontWeight={"500"} mr={3} onClick={() => {
              setPauseModal(false);
            }} >
              <Text as="span" ms="4px" fontSize="16px" >No</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <SummaryModal isOpen={showSummaryModal} onClose={() => { setShowSummaryModal({}) }} />

    </>
  );
}

export default VoiceCampaignDetails;


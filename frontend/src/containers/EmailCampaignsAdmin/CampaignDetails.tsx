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
import MailAdd from "../../components/Icons/campaign/mail-add.svg";
import Pause from "../../components/Icons/campaign/pause.svg";
import Folder from "../../components/Icons/campaign/folder.svg";
import People from "../../components/Icons/campaign/people.svg";
import Mail from "../../components/Icons/campaign/mail.svg";
import Reply from "../../components/Icons/campaign/reply.svg";
import Bounce from "../../components/Icons/campaign/bounce.svg";
import { IoIosSearch } from "react-icons/io";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import { getCampaignDetails, getAllLeads, pauseCampaign, resumeEmailCampaign } from "../../services/emailCampaigns";
import ErrorImg from "../../components/Icons/campaign/error.svg";
import SvgExport from "../EmailAssistantAdmin/AllMail/SvgExport";
import styles from "../EmailAssistantAdmin/AllMail/AllMail.module.scss";
import { resumeCampaign } from "../../services/VoiceBot";

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
    gap={4}
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

const CampaignDetails = () => {
  const [campaignData, setCampaignData] = React.useState<any>(null);
  const [leadList, setLeadList] = React.useState<any[]>([]);
  const [searchValue, setSearchValue] = React.useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = React.useState<number>(10);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [isOpened, setIsOpened] = React.useState<boolean>(false);

  // console.log("Campaign Data", campaignData);
  // console.log("Lead List", leadList);

  const toast = useToast();
  const history = useHistory();
  const { id: campaignId } = useParams<{ id: string }>();

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
    // console.log("Items per page changed to:", newItemsPerPage);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const handleInputChange = (e: any) => {
    const newSearchValue = e.target.value;
    setSearchValue(newSearchValue);
  };
  const fetchLeads = React.useCallback(async () => {
    if (!campaignId) return;

    setIsLoading(true);
    try {
      const offset = currentPage;

      // console.log("Fetching leads with:", { itemsPerPage, offset, searchValue: debouncedSearchValue.trim(), campaignId, currentPage }); // Debug log

      const res = await getAllLeads(itemsPerPage, offset, debouncedSearchValue.trim(), campaignId);
      // console.log("API Response:", res.data); // Debug log

      setLeadList(res.data.data || []);
      setTotalCount(res.data.pagination?.totalCount || 0);
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

  // Fixed: Fetch campaign details separately
  const fetchCampaignDetails = async () => {
    if (!campaignId) return;

    try {
      const response = await getCampaignDetails(campaignId);
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
  React.useEffect(() => {

    fetchCampaignDetails();
  }, [campaignId, toast]);

  // Fixed: Fetch leads when dependencies change
  React.useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

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

  const onClose = () => {
    setIsOpened(false);
  };
  const handlePauseCampaign = () => {
    setIsOpen(true);
  }
  const onClosePause = () => {
    setIsOpen(false);
  }

  const handleYesClick = async () => {
    const pauseCampaignData = { campaignId: campaignId };
    try {
      // const response = await pauseCampaign(pauseCampaignData);
      const response = campaignData?.status?.toLowerCase() === 'paused' ? await resumeEmailCampaign(pauseCampaignData) : await pauseCampaign(pauseCampaignData);


      toast({
        title: `${response?.data?.message}`,
        status: "success",
        isClosable: true,
      })
      setIsOpen(false);
      fetchLeads();
      fetchCampaignDetails();

    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    }

  }

  // Calculate forcePage for PaginatorTwo (0-based)
  const forcePage = currentPage - 1;
  const totalPages = Math.ceil(totalCount / itemsPerPage);


  const scheduleDateAndTime =
    campaignData?.scheduleDateAndTime?.scheduledDateAndTime;
  // console.log("campaignData", campaignData?.scheduleDateAndTime, scheduleDateAndTime);


  // ✅ Date (DD/MM/YYYY)
  const formatDateNew = (date: any) => {
    if (!date) return "";

    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  // ✅ Time (AM/PM)
  const formatTime = (date: any) => {
    if (!date) return "";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .format(new Date(date))
      .replace(/am|pm/i, (m) => m.toUpperCase());
  };

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
                  <Link to={`/app/email-campaigns`}><Text as="span">Ultimamail Campaign</Text>
                  </Link> / <Text as="span" color="#6C757D" textTransform="capitalize">{campaignData?.campaignName}</Text>
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
                <Text as="span" textTransform="capitalize">{campaignData?.campaignName}</Text>
                <Badge
                  color={
                    campaignData?.status === 'completed' ? '#198754' :
                      campaignData?.status === 'paused' ? '#F59E0B' :
                        campaignData?.status === 'initiated' ? '#0D9488' :
                          campaignData?.status === 'failed' ? '#991B1B' :
                            campaignData?.status === 'running' ? '#1E40AF' :
                              campaignData?.status?.toLowerCase() === 'scheduled' ? '#854D0E' :
                                '#4B5563'
                  }
                  bg={
                    campaignData?.status === 'completed' ? '#1987541A' :
                      campaignData?.status === 'paused' ? '#FDE68A' :
                        campaignData?.status === 'initiated' ? '#CCFBF1' :
                          campaignData?.status === 'failed' ? '#FEE2E2' :
                            campaignData?.status === 'running' ? '#DBEAFE' :
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
                gap={2}
                colorScheme="gray"
                disabled={campaignData?.status?.toLowerCase() === 'running' ? false : !(campaignData?.status?.toLowerCase() === 'paused')}

                // disabled={campaignData?.status !== 'initiated' || campaignData?.status !== 'running'}
                // style={{ backgroundColor: "#6C757D", color: "#fff" }}
                fontSize="16px"

                onClick={handlePauseCampaign}
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
                borderRadius={"4px"}
                p={'6px 12px'}
                fontWeight={500}
                colorScheme="blue"
                size="md"
                disabled={campaignData?.status === "completed"}
                onClick={() => {
                  history.push(`/app/email-campaigns/create?subTab=add-more-lead&id=${campaignData?._id}&campaignName=${campaignData?.campaignName}`)
                }}
              >
                <Image src={MailAdd} alt="Edit" boxSize="20px" />
                Add More Leads
              </Button>
            </Box>
          </Flex>
        </VStack>

        <Flex gap={'12px'} wrap="wrap">
          {campaignData && (
            <>
              <StatCard label="Total Audience" count={campaignData.totalAudience} icon={People} />
              <StatCard label="Success Emails" count={campaignData.successEmails} icon={Mail} />
              <StatCard label="Replies" count={campaignData.repliedEmails} icon={Reply} />
              <StatCard label="Failed Emails" count={campaignData.failedEmails} icon={Bounce} />
            </>
          )}
        </Flex>

        <Box mt={6}>
          <Heading fontSize="18px" color="#1A202C" mb={4}>
            Campaign Details
          </Heading>

          <Box bg={'white'} p={"16px"} borderRadius="md" boxShadow="sm">
            <SimpleGrid columns={[1, 2, 3]} spacingY={4}>
              {campaignData && (
                <>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Target Audience</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{campaignData.targetAudience?.map((t: any) => t.value).join(', ')}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Pain Point / Problem</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{campaignData.painPoints?.map((p: any) => p.value).join(', ')}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Solution / Offer</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{campaignData.solutionOffer?.map((s: any) => s.value).join(', ')}</Text>
                  </Box>
                  {
                    campaignData?.scheduleDateAndTime?.scheduleDate &&
                    <Box>
                      <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Scheduled At</Text>
                      <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{campaignData.scheduleDateAndTime?.scheduledDateAndTime ? formatDateNew(campaignData.scheduleDateAndTime?.scheduledDateAndTime) : "NA"} {campaignData.scheduleDateAndTime?.scheduledDateAndTime ? formatTime(campaignData.scheduleDateAndTime?.scheduledDateAndTime) : ""} </Text>
                    </Box>
                  }

                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Email Length</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{campaignData.emailLength}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Max Emails Per Day</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{campaignData.maxEmailsPerDay}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Max Emails Per Lead (Auto Reply)</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{campaignData.maxEmailsPerLead}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Call To Action (CTA)</Text>
                    <Text fontSize="14px" color="#888888">
                      {[
                        campaignData.callOfAction?.phone,
                        campaignData.callOfAction?.email,
                        campaignData.callOfAction?.customLink,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Language</Text>
                    <Text fontSize="14px" color="#888888" textTransform={"capitalize"}>{campaignData.campaignLanguage}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="600" fontSize="14px" color="#4F4F4F">Selected Mailboxes (Maximum Limit)</Text>
                    <Text fontSize="14px" color="#888888">
                      {campaignData.emailAndSenderLimit?.map((m: any) => `${m.email} (${m.maxLimit})`).join(', ')}
                    </Text>
                  </Box>
                </>
              )}
            </SimpleGrid>
          </Box>
        </Box>

        <VStack w="100%" spacing="10">
          <Flex width="100%" alignItems={"center"} py={0} my={0} justifyContent="space-between" gap={2} flexWrap={"wrap"}>
            <Box mt={6}>
              <Heading fontSize="18px" color="#1A202C">Email List</Heading>
            </Box>
            <Box mt={6}>
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
          </Flex>
        </VStack>

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
                <Th>Email ID</Th>
                <Th>Website URL</Th>
                <Th>Lead Creation (Date & Time)</Th>
                <Th>Email Status</Th>
              </Tr>
            </Thead>
            <Tbody bg={"#fff"}>
              {isLoading ? (
                <Tr>
                  <Td colSpan={5} textAlign="center" py={8}>
                    <Spinner display={'flex'} alignItems={'center'} justifyContent={'center'} margin={'auto'} marginTop={'50px'} marginBottom={'50px'} />
                  </Td>
                </Tr>
              ) : leadList && leadList.length > 0 ? (
                leadList.map((item: any, index: any) => (
                  <Tr key={index}>
                    <Td>{(currentPage - 1) * itemsPerPage + index + 1}</Td>
                    <Td>
                      <Box display="flex" alignItems="center" gap="6px">
                        <Image src="/icons/ic-email.svg" alt="email icon" boxSize="16px" />
                        <Text textTransform="lowercase">{item?.email}</Text>
                      </Box>
                    </Td>
                    <Td>
                      <Box display="flex" maxW={"300px"} alignItems="center" gap="6px">
                        {item?.websiteUrl ? <>
                          <Image src="/icons/website.svg" alt="website icon" boxSize="16px" />
                          {/* {item?.websiteUrl} */}
                          <Tooltip label={item.websiteUrl}>
                            <Text isTruncated flex="1">{item.websiteUrl}</Text>
                          </Tooltip>
                        </>
                          :
                          <Text color="#888888">N/A</Text>
                        }
                      </Box>
                    </Td>
                    <Td color={"#888888"}>{formatDate(item.createdAt)}</Td>
                    <Td>
                      <Badge
                        color={statusTextColor(item?.emailStatus)}
                        bg={statusBadgeColor(item?.emailStatus)}
                        textTransform="capitalize"
                        fontSize="12px"
                        px="8px"
                        py="2px"
                        borderRadius="50px"
                        fontWeight="500"
                      >
                        {item?.emailStatus}
                      </Badge>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={5} textAlign="center" py={8}>
                    <Text color="#888888">No data found</Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>

        {totalCount > 10 && <HStack w="100%" justifyContent="space-between" py={4}>
          <Flex alignItems="center">
            <Text mr="8px" fontSize="16px" color="#212529">
              Total {totalCount} items
              {/* {totalCount > 0 && (
                <Text as="span" color="#888888">
                  {` (Page ${currentPage} of ${totalPages})`}
                </Text>
              )} */}
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
        </HStack>}
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
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">You want to {campaignData?.status?.toLowerCase() == 'paused' ? "Resume " : "Pause "} this campaign?</Text>
            </Box>

          </ModalBody>
          <ModalFooter>
            <Button mr={3} colorScheme="blue" onClick={handleYesClick}
              fontSize="16px" fontWeight="500"
            >
              Yes
            </Button>
            <Button mr={3} onClick={onClosePause} fontWeight="500"
            >
              <Text as="span" ms="4px" fontSize="16px">No</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default CampaignDetails;
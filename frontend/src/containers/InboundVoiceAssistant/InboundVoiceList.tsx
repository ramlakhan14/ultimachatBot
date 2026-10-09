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
  Spinner,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  Checkbox,
  ModalHeader
} from "@chakra-ui/react";
import styles from "./EmailCampaignsAdmin.module.scss";
import { IoIosSearch } from "react-icons/io";
import { pauseCampaign } from "../../services/emailCampaigns";
import { colors } from '../../utils/constant';
import { Link, NavLink } from "react-router-dom";
import { campaignGetAllCampaign } from "../../services/emailCampaigns";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import { useLocation } from 'react-router-dom';
import { useHistory } from 'react-router-dom';
import { checkProjectAndNumber } from "../../services/VoiceBot";
import { callApi } from "../../services/callApi";
import CustomButton from "../../components/ButtonGroups/CustomButton";
import { EmailPlusIcon } from "../../components/Icons/Icon";
import { PlusIcon } from "@phosphor-icons/react";
import { GoInfo } from "react-icons/go";

export const InboundVoiceList = () => {
  const toast = useToast();
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [isItemSeleted, setItemData] = React.useState<any>({}); // [openModifyYourCampaign]
  const [itemsPerPages, setItemsPerPage] = React.useState<number>(10);
  const [searchValue, setSearchValue] = React.useState('');
  const [inboundsData, setInboundsData] = React.useState<any>();
  const [isOpens, setIsOpens] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState(searchValue);
  const [isSearchActive, setIsSearchActive] = React.useState<boolean>(false);
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [confirmStatus, setConfirmStatus] = React.useState<any>({ id: "", status: "" });
  const [campaignId, setCampaignId] = React.useState<any>(null);
  const [botName, setbotName] = React.useState<any>(null);
  const [emailExists, setEmailExists] = React.useState<boolean>(false);
  const [projectExists, setProjectExists] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const location = useLocation();
  const [selectedBotIds, setSelectedBotIds] = React.useState<string[]>([]);
  const [availablePhoneNumbers, setAvailablePhoneNumbers] = React.useState([]);

  const history = useHistory();

  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const cId = searchParams.get('campaignId'); // Replace 'pid' with your parameter key if needed
    setCampaignId(cId);
    const cName = searchParams.get('botName'); // Another parameter
    setbotName(cName);
  }, [inboundsData]);

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

  const fetchData = async (page: number, pageSize: number, searchKeyword: string) => {
    try {
      setIsLoading(true);
      const url = `/inbound-bot/lists?page=${page}&limit=${pageSize}&search=${searchKeyword}`;
      const response: any = await callApi(url, "get", "");
      // console.log("res", response);

      setInboundsData(response?.data);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Something went wrong while deleting.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteClick = (botId: string) => {
    // open confirmation modal (reusing isItemSeleted state)
    setItemData({ _id: botId, action: "delete" });
  };

  const confirmDelete = async () => {
    if (!isItemSeleted?._id) return;
    const id = isItemSeleted._id;
    try {
      setIsLoading(true);
      const url = `/inbound-bot/bot/${id}`;
      const response: any = await callApi(url, "delete", "");
      if (response?.statusCode === 200) {
        toast({
          title: "Deleted",
          description: response?.message || "Assistant deleted successfully.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        // close modal
        setItemData({});
        fetchData(currentPage, itemsPerPages, debouncedSearchValue);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Something went wrong while deleting.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };


  // bulk delete state & helpers

  // toggle single row selection
  const toggleSelectBot = (id: string) => {
    setSelectedBotIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // toggle select all for current page data
  const toggleSelectAll = () => {
    const currentIds = inboundsData?.botsData?.map((b: any) => b._id) || [];
    const allSelected = currentIds.length > 0 && currentIds.every((id: string) => selectedBotIds.includes(id));
    setSelectedBotIds(allSelected ? [] : currentIds);
  };

  const clearSelection = () => setSelectedBotIds([]);

  // open bulk-delete confirmation
  const handleBulkDeleteClick = () => {
    if (!selectedBotIds || selectedBotIds.length === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one assistant to delete.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    setIsOpens(true);
  };

  // confirm bulk delete
  const confirmBulkDelete = async () => {
    if (!selectedBotIds || selectedBotIds.length === 0) return;
    try {
      setIsLoading(true);
      // adjust endpoint/method if your API differs
      const url = `/inbound-bot/bulk-delete`;
      const response: any = await callApi(url, "delete", { botIds: selectedBotIds });
      if (response?.statusCode === 200) {
        toast({
          title: "Deleted",
          description: `${selectedBotIds.length} assistant(s) deleted successfully.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        clearSelection();
        setIsOpens(false);
        // refresh list with current filters/pagination
        fetchData(currentPage, itemsPerPages, debouncedSearchValue);
      } else {
        toast({
          title: "Error",
          description: response?.data?.message || "Failed to delete assistants.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Something went wrong while deleting assistants.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk delete confirmation modal UI
  // You can keep this modal here. Triggers via handleBulkDeleteClick() and confirmBulkDelete()

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchValue(searchValue);

      if (searchValue !== "") {
        setIsSearchActive(true);
        setCurrentPage(1);
        setForcePage(0);
      } else {
        setIsSearchActive(false);
      }
    }, 1500);

    return () => clearTimeout(handler);
  }, [searchValue]);

  React.useEffect(() => {
    fetchData(currentPage, itemsPerPages, debouncedSearchValue);
  }, [debouncedSearchValue, itemsPerPages, currentPage]);

  const checkProjectAndEmailData = async () => {
    try {
      const response: any = await checkProjectAndNumber();
      if (response?.status === 200) {
        // console.log("response", response?.data?.data);
        setProjectExists(response?.data?.data?.projectExists);
        setEmailExists(response?.data?.data?.emailExists);
      } else {
        toast({
          title: "Error",
          description: response?.data?.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return false;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Something went wrong!",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
  }

  React.useEffect(() => {
    checkProjectAndEmailData();
  }, []);


  const updateStatus = async () => {
    try {
      const payload = { botId: confirmStatus?.id, isActive: confirmStatus?.status === "Active" ? true : false };
      const response: any = await callApi(`inbound-bot/bot-status`, "patch", payload);
      // console.log("response", response);
      if (response?.statusCode === 200) {
        toast({
          title: "Success",
          description: response?.message || "Status updated successfully.",
          status: "success",
          isClosable: true,
        });
        fetchData(currentPage, itemsPerPages, debouncedSearchValue);
        setConfirmStatus({});
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Something went wrong while updating status.",
        status: "error",
        isClosable: true,
      });
    }
  }


  const fetchMobileNumbers = async () => {
    try {
      const responsesPhoneNumber = await callApi("inbound-bot/numbers", "get", "");
      setAvailablePhoneNumbers(responsesPhoneNumber?.data);
    } catch (error) {
      // console.error("Error fetching projects:", error);
    }
  };
  React.useEffect(() => {
    fetchMobileNumbers()
  }, []);

  const handleNavigate = () => {
    if (availablePhoneNumbers.length === 0) {
      const toastId = toast({
        title: "Info",
        description: (
          <>
            Please add an outbound phone number first.{" "}
            <Text
              as="span"
              color="blue.500"
              textDecoration="underline"
              cursor="pointer"
              onClick={() => {
                if (toastId) {
                  toast.close(toastId);
                }
                history.push("/app/voice-campaign/add-number");
              }}
            >
              Click here
            </Text>
            .
          </>
        ),
        status: "info",
        duration: null,
        isClosable: true,
      });

      return;
    }

    history.push("/app/inbound-voice-calls/create?subTab=set-up");
  };


  return (
    <>
      <Modal isCentered onClose={() => setIsOpens(false)} isOpen={isOpens}>
        <ModalOverlay />
        <ModalContent>
          <ModalBody>
            <Box
              textAlign="center"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            >
              <Image src={"/icons/error.svg"} alt="deleteicon" w="56px" h="56px" />
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">
                Are you sure?
              </Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">
                You want to delete {selectedBotIds.length} assistant(s)?
              </Text>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button
              mr={3}
              onClick={() => confirmBulkDelete()}
              fontSize="16px"
              fontWeight="500"
              sx={{ _focus: { boxShadow: "none" } }}
            >
              Confirm
            </Button>
            <Button
              colorScheme="blue"
              mr={3}
              fontWeight="500"
              onClick={() => setIsOpens(false)}
              sx={{ _focus: { boxShadow: "none" } }}
            >
              <Text as="span" ms="4px" fontSize="16px" fontWeight="400">
                Cancel
              </Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Box
        w="100%"
        p="6"
        pb={"2px"}
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
            <Flex width="100%" alignItems={"center"} justifyContent="space-between">
              <Box>
                <Heading fontSize="24px" color="#1A202C">Inbound VoiceBot</Heading>
              </Box>
              <Box display={"flex"} gap={"12px"} alignItems={"center"}>
                <Button
                  size="sm"
                  height={'38px'}
                  fontSize={12}
                  colorScheme="red"
                  disabled={selectedBotIds.length === 0}
                  onClick={() => {
                    handleBulkDeleteClick()
                  }}
                  className={styles.readBtn}
                >
                  <Image src={`/icons/delete.svg`} alt='icon' />
                </Button>

                <Flex justifyContent="flex-end">
                  <InputGroup
                    width="240px"
                    borderRadius="4px"
                    background={"#fff"}

                  >
                    <InputLeftElement pointerEvents='none'>
                      <IoIosSearch color="#6C757D" />
                    </InputLeftElement>
                    <Input type='text' border="1px solid #CED4DA!important" placeholder='Search' color="#6C757D" value={searchValue}
                      onChange={handleInputChange} />
                  </InputGroup>
                </Flex>

                <CustomButton
                  title="Create New Assistant"
                  icon={<Image src="/icons/plusicon.svg" />}
                  validated={false}
                  navigateTo="/app/inbound-voice-calls/create?subTab=set-up"
                  toastTitle="Chatbot limit reached"
                />

              </Box>
            </Flex>

          </Flex>
        </VStack>

        <Box mt="24px" minW="100%" w="600px"
          backgroundColor="white" boxShadow="sm" borderRadius="8px">
          <TableContainer
            maxH={"calc(100vh - 245px)"} // height for vertical scroll
            mt={'24px'}
            w="100%"
            boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
            bg={'#fff'}
            border="1px solid #E2E8F0"
            borderRadius="8px"
            sx={{
              overflow: "scroll!important",
              "::-webkit-scrollbar": {
                display: "none"
              }
            }}
            overflowY="auto"
            overflowX="auto"
          >
            <Table variant="simple">
              <Thead sx={{
                position: 'sticky',
                top: -1,
                zIndex: 1,
                fontSize: '14px',
                fontWeight: '600'
              }} bg={colors.tableHeadingBg}  >
                <Tr >
                  {/* <Th width="70px">#</Th> */}
                  <Td>
                    <Box>
                      <Checkbox
                        borderColor="#6C757D"
                        isChecked={
                          inboundsData?.botsData?.length > 0 &&
                          inboundsData?.botsData?.every((b: any) => selectedBotIds.includes(b._id))
                        }
                        isIndeterminate={
                          inboundsData?.botsData?.some((b: any) => selectedBotIds.includes(b._id)) &&
                          !inboundsData?.botsData?.every((b: any) => selectedBotIds.includes(b._id))
                        }
                        onChange={toggleSelectAll}
                      />
                    </Box>
                  </Td>
                  <Th>Assistant Name</Th>
                  <Th textAlign="start" >Assistant Type</Th>
                  <Th textAlign="start">Total Incoming Calls</Th>
                  <Th textAlign="end">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {isLoading ? <Tr><Td colSpan={7} textAlign="center"><Spinner /></Td></Tr> :
                  inboundsData?.botsData?.length > 0 ?
                    inboundsData?.botsData?.map((data: any, index: number) => (
                      <Tr key={data._id}>
                        {/* <Td > {index + 1 + (currentPage - 1) * itemsPerPages}</Td> */}
                        <Td>
                          <Box>
                            <Checkbox
                              borderColor="#6C757D"
                              isChecked={selectedBotIds.includes(data._id)}
                              onChange={() => toggleSelectBot(data._id)}
                            />
                          </Box>
                        </Td>
                        <Td>
                          <Box maxWidth={"50%"} minW={"280px"}>
                            <Flex align="start" gap={1}>
                              <Text
                                fontWeight="700"
                                fontSize="14px"
                                pb="2px"
                                overflow={"hidden"}
                                textTransform="capitalize"
                                whiteSpace="normal"       // allow wrapping
                                wordBreak="break-word"    // break long email/URLs
                                noOfLines={2}
                                color="#2977FF"           // optionally limit lines
                              >
                                {data?.botName || "-"}
                                {/* Akash Email Campaign to Check email sending with support@cvinfotech.app 4th July 25 */}
                              </Text>
                              <Link to="#" onClick={() => {
                                history.push(`/app/inbound-voice-calls/details/${data?._id}`);
                              }} color="blue.500">
                                <Image src="/icons/outgoing.svg" maxW={"40px"} alt="arrow-right" />
                              </Link>
                            </Flex>
                            <Flex justifyContent="flex-start" pt="3px" pb={"6px"} gap="8px">
                              {data?.status?.toLowerCase() === "active" ? (
                                <Text as="span" className={styles.Completed}>Active</Text>
                              ) : data?.status?.toLowerCase() === "running" ? (
                                <Text as="span" className={styles.Running}>Running</Text>
                              ) : data?.status?.toLowerCase() === "inactive" ? (
                                <Text as="span" className={styles.Inactive}>Inactive</Text>
                              ) : data?.status?.toLowerCase() === "scheduled" ? (
                                <Text as="span" className={styles.Schedule}>Scheduled</Text>
                              ) : data?.status?.toLowerCase() === "initiated" ? (
                                <Text as="span" className={styles.initiated}>Initiated</Text>
                              ) : data?.status?.toLowerCase() === "paused" ? (
                                <Text as="span" className={styles.paused}>Paused</Text>
                              ) : data?.status?.toLowerCase() === "failed" ? (
                                <Text as="span"
                                  minW={"58px"}
                                  display="flex" gap="5px" alignItems="center" className={styles.paused}>
                                  {
                                    // data?.failedReason &&

                                    < Popover placement="bottom" trigger="click">
                                      <PopoverTrigger>
                                        {/* <Image
                                          src="/icons/i-icon.svg"
                                          alt="icon"
                                          cursor="pointer"
                                        /> */}

                                        <Box>
                                          <GoInfo color="red" />

                                        </Box>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        sx={{
                                          outline: "none",
                                          bg: "#efefef",
                                          width: "300px",
                                          fontSize: "11px",
                                          border: "none",
                                          padding: "10px",
                                          _focus: {
                                            boxShadow: 'none',  // Removes the focus box shadow
                                            outline: "none"
                                          }
                                        }}
                                      >
                                        <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                                        <Box whiteSpace="pre-wrap">
                                          {data?.failedReason || "Failed"}
                                        </Box>
                                      </PopoverContent>
                                    </Popover>
                                  }Failed</Text>
                              ) : null}
                              <NavLink style={{ display: "flex" }} to={`/app/edit-bot/${data?.campaignProject?.projectId}`}>
                                <Box
                                  _hover={{ color: "#2977FF" }}
                                  display="flex"
                                  gap="4px"
                                  fontSize={"12px"}
                                  // padding={"4px 8px"}
                                  justifyContent="center"
                                  alignItems="center"
                                  color={colors.lightGray}
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clip-path="url(#clip0_8164_65613)">
                                      <rect width="16" height="16" fill="white" fill-opacity="0.01" />
                                      <path d="M6.17203 0.998779C6.70228 0.998992 7.21119 1.21068 7.58609 1.58569L8.41324 2.41284C8.78814 2.78786 9.29704 2.99857 9.8273 2.99878H13.8097C14.0875 2.99881 14.3622 3.05761 14.6164 3.16968C14.8705 3.28177 15.0989 3.44505 15.2863 3.65015C15.4737 3.85536 15.6166 4.09769 15.7052 4.36108C15.7939 4.62446 15.8261 4.90366 15.8009 5.18042L15.1642 12.1804C15.119 12.6771 14.8898 13.1389 14.5216 13.4753C14.1533 13.8119 13.672 13.9986 13.173 13.9988H2.82535C2.32639 13.9986 1.84509 13.8119 1.47672 13.4753C1.10865 13.1389 0.879308 12.6771 0.834139 12.1804L0.19742 5.18042C0.172269 4.90364 0.205422 4.62448 0.2941 4.36108C0.352763 4.18689 0.436014 4.02286 0.539217 3.87183L0.499178 2.99878C0.499304 2.46852 0.710155 1.95968 1.08512 1.58472C1.46008 1.20976 1.96892 0.998905 2.49918 0.998779H6.17203ZM2.18961 3.99878C2.05087 3.99877 1.91326 4.02785 1.78629 4.08374C1.65918 4.13977 1.54503 4.2224 1.45133 4.32495C1.35768 4.42743 1.28574 4.54791 1.24137 4.67944C1.19699 4.81108 1.18101 4.95125 1.19351 5.0896L1.83023 12.0896C1.85276 12.3379 1.96751 12.5688 2.15152 12.7371C2.33561 12.9054 2.57588 12.9985 2.82535 12.9988H13.173C13.4224 12.9985 13.6628 12.9053 13.8468 12.7371C14.0308 12.5688 14.1456 12.3379 14.1681 12.0896L14.8048 5.0896C14.8173 4.95125 14.8014 4.81108 14.757 4.67944C14.7127 4.54809 14.6415 4.42734 14.548 4.32495C14.4543 4.22242 14.3401 4.13977 14.213 4.08374C14.0861 4.02776 13.9485 3.99883 13.8097 3.99878H2.18961ZM2.49918 1.99878C2.23746 1.99886 1.98585 2.10166 1.79898 2.28491C1.61199 2.46835 1.50416 2.71832 1.49918 2.98022L1.50504 3.12183C1.72421 3.04196 1.95566 2.99876 2.18961 2.99878H7.58609L6.87808 2.29272C6.69116 2.10575 6.43738 1.99946 6.17301 1.99878H2.49918Z" fill="currentColor" />
                                    </g>
                                    <defs>
                                      <clipPath id="clip0_8164_65613">
                                        <rect width="16" height="16" fill="white" />
                                      </clipPath>
                                    </defs>
                                  </svg>
                                  {data?.campaignProject?.projectName || "-"}
                                </Box>
                              </NavLink>

                            </Flex>
                          </Box>
                        </Td>
                        <Td>
                          <Box maxWidth={"500px"}>
                            <Text mb={"5px"} textTransform="capitalize" whiteSpace="normal"       // allow wrapping
                              wordBreak="break-word"    // break long email/URLs
                              noOfLines={2} color={colors.tableTextColor} fontWeight={"600"}>
                              {data?.botPurpose || "-"}
                            </Text>
                            <Box
                              display="flex"
                              gap="4px"
                              alignItems="center"
                              color={colors.lightGray}
                            >
                              <Image src="/icons/ic-bot.svg" alt="arrow-right" />
                              <Text ml="8px" fontSize="12px">
                                Bot Purpose
                              </Text>
                            </Box>
                          </Box>
                        </Td>
                        <Td>
                          <Box>
                            <Text mb={"5px"} color={colors.tableTextColor} fontWeight={"600"}>{data?.totalCalls || "0"}</Text>
                            <Box
                              display="flex"
                              alignItems="center"
                              color={colors.lightGray}
                            >
                              <Image src="/icons/ic-incoming call.svg" width={"20px"} alt="arrow-right" />
                              <Text ml="8px" fontSize="12px">
                                Incoming Calls
                              </Text>
                            </Box>
                          </Box>
                        </Td>
                        <Td >
                          {/* Modify Campaign ,Add More Leads  */}
                          <Flex gap={2} alignItems="center" justifyContent="end">
                            <Tooltip label={data?.status?.toLowerCase() === "completed" ? "This campaign is already completed" : "Edit"} fontSize={'10px'}>
                              <Button
                                padding={"6px"}
                                sx={{
                                  "_focus": {
                                    outline: "none",
                                  }
                                }}
                                disabled={data?.status?.toLowerCase() === "completed"}
                                onClick={() => {
                                  // setOpenModifyYourCampaign(data)
                                  history.push(`/app/inbound-voice-calls/edit/${data?._id}`)
                                }}
                                size="sm"
                              >
                                <Image src={`/icons/edit.svg`} alt='icon' />
                              </Button>
                            </Tooltip>

                            <Tooltip label={data?.status || ""} fontSize={'10px'}>
                              <Button
                                padding={"6px"}
                                sx={{
                                  "_focus": {
                                    outline: "none",
                                  }
                                }}
                                onClick={() => {
                                  setConfirmStatus({ id: data?._id, status: data?.status === "Active" ? "Inactive" : "Active" });
                                }}
                                size="sm"
                              >
                                {data?.status === "Active" ? <Image src={`/icons/icon-wrapper-h.svg`} alt='icon' /> : <Image src={`/icons/no-hover.svg`} alt='icon' />}
                              </Button>
                            </Tooltip>
                            {/* icon-wrapper-h  no-hover */}


                            <Tooltip label="Delete" fontSize="10px">
                              <Button
                                padding={"6px"}
                                size="sm"
                                colorScheme="red"
                                fontSize={12}
                                onClick={() => {
                                  handleDeleteClick(data?._id);
                                }}
                                sx={{
                                  _focus: {
                                    boxShadow: 'none',  // Removes the focus box shadow
                                  }
                                }}
                              >
                                <Image src={`/icons/delete.svg`} alt='icon' />
                              </Button>
                            </Tooltip>

                          </Flex>
                        </Td>
                      </Tr>
                    )) : <Tr><Td colSpan={8} textAlign="center">No data found</Td></Tr>}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
        {
          inboundsData?.botsData?.length > 10 &&
          <Box>
            <HStack w="100%" justifyContent="space-between" pt={4}>
              <Flex alignItems="center">
                <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total&nbsp;{inboundsData?.totalItems}&nbsp;items</Text>
                <PaginatorTwo forcePage={forcePage} onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={inboundsData?.totalPages} />
              </Flex>
              <Flex alignItems="center">
                <Select
                  value={itemsPerPages}
                  onChange={handleItemsPerPageChange}
                  width="auto"
                  color="#6C757D"
                  bg={'#fff'}
                  mr="8px"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </Select>
              </Flex>
            </HStack>
          </Box>
        }

      </Box >
      {/* pause confirm modal */}
      <Modal
        isCentered
        onClose={() => {
          if (confirmStatus?.id) {
            setConfirmStatus({});
          }
          setItemData({})
        }}
        isOpen={isItemSeleted?._id ? true : confirmStatus?.id ? true : false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalBody>
            <Box
              textAlign="center"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            >
              <Image src={"/icons/error.svg"} alt='deleteicon' w="56px" h="56px" />
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">{
                confirmStatus?.id ? `Are you sure you want to ${confirmStatus?.status || ""} this inbound assistant?` :
                  "Are you sure?"}</Text>
              <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">{confirmStatus?.id ? "It will stop receiving incoming calls after deactivation." : "You want to Delete this Bot?"}</Text>
            </Box>

          </ModalBody>
          <ModalFooter>
            <Button mr={3}
              onClick={() => {
                if (confirmStatus?.id) {
                  updateStatus();
                }
                confirmDelete()
              }}

              fontWeight={"500"}>
              Confirm
            </Button>
            <Button colorScheme="blue" mr={3} onClick={() => {
              if (confirmStatus?.id) {
                setConfirmStatus({});
              }
              setItemData({})
            }} fontWeight={"500"}
            >
              <Text as="span" ms="4px" fontSize="16px" fontWeight="500">Cancel</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
